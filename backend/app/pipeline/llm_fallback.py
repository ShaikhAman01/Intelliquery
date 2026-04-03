"""
Multi-LLM Fallback Chain with Context-Aware Prompting.

Supports: OpenAI → Anthropic → error.
Each provider is tried in order; if one fails, the next is used.
Conversation history can optionally be injected for context-aware SQL generation.
"""

import json
import re
from typing import Optional

from app.core.config import settings
from app.core.logger import logger


def _clean_sql_response(raw: str) -> str:
  
    text = raw.strip()

    # Strip markdown code fences
    text = text.replace("```sql", "").replace("```", "").strip()

    # Strip common prefixes like "SQL:", "Answer:", "Here is the SQL:"
    text = re.sub(
        r'^(?:SQL|Query|Answer|Here\s+is\s+(?:the\s+)?(?:SQL|query))\s*:\s*',
        '', text, flags=re.IGNORECASE
    ).strip()

    # If there are multiple statements, take only the first one
    # (but be careful with semicolons inside strings)
    if ';' in text:
        # Take everything up to and including the first semicolon
        idx = text.index(';')
        text = text[:idx + 1].strip()

    return text


# ── Provider Implementations ─────────────────────────────────────────────────

class OpenAIProvider:
    """OpenAI GPT provider."""

    def __init__(self):
        from openai import OpenAI
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.name = "openai"

    def generate_sql(self, messages: list, temperature: float = 0.1) -> str:
        response = self.client.chat.completions.create(
            model="gpt-5.4-mini",
            messages=messages,
            temperature=temperature,
        )
        raw = response.choices[0].message.content.strip()
        return _clean_sql_response(raw)

    def generate_insights(self, messages: list, temperature: float = 0.5) -> str:
        response = self.client.chat.completions.create(
            model="gpt-5.4-mini",
            messages=messages,
            temperature=temperature,
        )
        return response.choices[0].message.content.strip()

    def transcribe_audio(self, audio_file, language: str = "en") -> str:
        response = self.client.audio.transcriptions.create(
            model=settings.WHISPER_MODEL,
            file=audio_file,
            language=language,
        )
        return response.text


class GeminiProvider:
    """Google Gemini provider."""

    def __init__(self):
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.client = genai.GenerativeModel("gemini-2.0-flash")
        self.name = "gemini"

    def generate_sql(self, messages: list, temperature: float = 0.1) -> str:
        # Convert OpenAI-style messages to Gemini format
        system_msg = ""
        chat_messages = []
        for m in messages:
            if m["role"] == "system":
                system_msg = m["content"]
            else:
                chat_messages.append({
                    "role": "user" if m["role"] == "user" else "model",
                    "parts": [m["content"]]
                })

        response = self.client.generate_content(
            contents=chat_messages,
            generation_config={
                "temperature": temperature,
                "top_p": 0.95,
                "max_output_tokens": 2048,
            },
            system_prompt=system_msg if system_msg else None,
        )
        raw = response.text.strip()
        return _clean_sql_response(raw)

    def generate_insights(self, messages: list, temperature: float = 0.5) -> str:
        system_msg = ""
        chat_messages = []
        for m in messages:
            if m["role"] == "system":
                system_msg = m["content"]
            else:
                chat_messages.append({
                    "role": "user" if m["role"] == "user" else "model",
                    "parts": [m["content"]]
                })

        response = self.client.generate_content(
            contents=chat_messages,
            generation_config={
                "temperature": temperature,
                "top_p": 0.95,
                "max_output_tokens": 1024,
            },
            system_prompt=system_msg if system_msg else None,
        )
        return response.text.strip()


# ── LLM Service (Fallback Chain) ─────────────────────────────────────────────

class LLMService:
    """
    Multi-provider LLM service with automatic fallback.
    Tries providers in configured order; if one fails, moves to the next.
    """

    def __init__(self):
        self.providers = []
        self._init_providers()

    def _init_providers(self):
        """Initialize providers based on config and available API keys."""
        order = [p.strip() for p in settings.LLM_FALLBACK_ORDER.split(",")]

        for provider_name in order:
            try:
                if provider_name == "openai" and settings.OPENAI_API_KEY:
                    self.providers.append(OpenAIProvider())
                    logger.info("✅ OpenAI provider initialized")
                elif provider_name == "gemini" and settings.GEMINI_API_KEY:
                    self.providers.append(GeminiProvider())
                    logger.info("✅ Gemini provider initialized")
            except Exception as e:
                logger.warning(f"⚠️ Failed to init {provider_name}: {e}")

        if not self.providers:
            logger.error("❌ No LLM providers available!")

    def _build_sql_system_prompt(
        self, schema_str: str, db_type: str = "postgres"
    ) -> str:
        return f"""You are an expert {db_type} SQL developer.

Rules:
1. Use ONLY the schema provided.
2. Do NOT hallucinate tables or columns.
3. **Case Sensitivity**: The schema names are already quoted. You MUST use them exactly as shown.
4. Keep the quotes and capitalization.
5. Use JOINs if required.
6. Optimize for performance.
7. Output ONLY raw SQL (no markdown).
8. SELECT queries only.
9. Limit results to 100 rows.
10. Use aliases for tables if needed.
11. End your query with a semicolon.
12. Always prefix column names with their table names.
13. If no tables are relevant, respond with "No relevant tables found."
14. Do not include any explanations or notes, only the SQL query.
15. Always use double quotes for identifiers as shown in the schema.

Schema:
{schema_str}"""

    async def fallback_generate_sql(
        self,
        user_query: str,
        schema_str: str,
        db_type: str = "postgres",
        conversation_history: list = None,
    ) -> str:
        """
        Generate SQL with multi-provider fallback.
        Optionally includes conversation history for context-aware generation.
        """
        system_prompt = self._build_sql_system_prompt(schema_str, db_type)

        messages = [{"role": "system", "content": system_prompt}]

        # Inject conversation history for context
        if conversation_history:
            for entry in conversation_history[-5:]:  # Last 5 turns max
                messages.append({"role": "user", "content": entry.get("question", "")})
                if entry.get("sql"):
                    messages.append({
                        "role": "assistant",
                        "content": f"SQL: {entry['sql']}",
                    })

        messages.append({"role": "user", "content": user_query})

        # Try each provider in order
        last_error = None
        for provider in self.providers:
            try:
                logger.info(f"🤖 Trying SQL generation with {provider.name}...")
                sql = provider.generate_sql(messages)
                logger.info(f"✅ SQL generated by {provider.name}")
                return sql
            except Exception as e:
                last_error = e
                logger.warning(f"⚠️ {provider.name} failed: {e}")
                continue

        raise Exception(
            f"All LLM providers failed. Last error: {last_error}"
        )

    async def generate_insights(self, user_text: str, data_sample: list) -> dict:
        """Generate comprehensive data insights with patterns, anomalies, and recommendations and chart type recommendation."""
        prompt = f"""User question: "{user_text}"
Sample data (first 5 rows): {data_sample[:5]}
Total rows in result: {len(data_sample)}

Provide DEEP, ACTIONABLE insights beyond just describing the data. Analyze:
1. Statistical patterns (distributions, ranges, clustering)
2. Trends and anomalies in the data
3. Key relationships or correlations you observe
4. Data quality issues (missing values, outliers)
5. Business implications and what this means
6. Actionable recommendations based on patterns

Return JSON only with these detailed insights:
{{
  "summary": "2-3 sentence executive summary of the most important finding",
  "key_patterns": [
    "Pattern 1: specific observable pattern in the data",
    "Pattern 2: another significant pattern or trend",
    "Pattern 3: notable correlation or relationship"
  ],
  "anomalies": [
    "Anomaly 1: outliers or unexpected values",
    "Anomaly 2: gaps or inconsistencies in the data"
  ],
  "statistical_insight": {{
    "distribution": "describe the overall distribution (e.g., skewed left, normal, bimodal)",
    "range": "describe the range of values and concentration areas",
    "variability": "is data consistent or highly variable"
  }},
  "business_implications": "What does this data suggest about the business or process? (2-3 sentences)",
  "recommendations": [
    "Actionable recommendation 1 based on the data",
    "Actionable recommendation 2 based on patterns found"
  ],
  "chart_type": "bar | line | pie | kpi | area | scatter | table",
  "chart_reasoning": "Why this visualization best tells the story of this data"
}}"""

        messages = [
            {"role": "system", "content": "You are a data insights and visualization expert. Always return valid JSON."},
            {"role": "user", "content": prompt},
        ]

        last_error = None
        for provider in self.providers:
            try:
                raw = provider.generate_insights(messages)
                # Try to parse as JSON
                try:
                    return json.loads(raw)
                except json.JSONDecodeError:
                    # Clean common issues
                    cleaned = raw.strip()
                    if cleaned.startswith("```json"):
                        cleaned = cleaned[7:]
                    if cleaned.endswith("```"):
                        cleaned = cleaned[:-3]
                    return json.loads(cleaned.strip())
            except Exception as e:
                last_error = e
                logger.warning(f"⚠️ Insights from {provider.name} failed: {e}")
                continue

        # Return a safe fallback if all providers fail
        logger.error(f"All providers failed for insights: {last_error}")
        return {
            "summary": "Unable to generate insights at this time.",
            "key_patterns": [],
            "anomalies": [],
            "statistical_insight": {
                "distribution": "Unknown",
                "range": "Unable to determine",
                "variability": "Unable to assess"
            },
            "business_implications": "Please try again or check your data.",
            "recommendations": ["Review the data and query parameters"],
            "chart_type": "table",
            "chart_reasoning": "Defaulting to table view."
             }

    async def explain_query(self, sql: str, user_question: str, db_type: str = "postgres") -> str:
        """Explain a SQL query in natural language."""
        messages = [
            {
                "role": "system",
                "content": f"You are a {db_type} SQL expert teacher. Explain SQL queries in clear, simple language that non-technical users can understand. Be concise (2-4 sentences).",
            },
            {
                "role": "user",
                "content": f'The user asked: "{user_question}"\n\nThis SQL was generated:\n{sql}\n\nExplain what this query does in simple terms.',
            },
        ]

        for provider in self.providers:
            try:
                return provider.generate_insights(messages, temperature=0.3)
            except Exception as e:
                logger.warning(f"⚠️ Explanation from {provider.name} failed: {e}")
                continue

        return "This query retrieves data from your database based on your question."

    async def recommend_chart_type(self, columns: list, data_sample: list, user_question: str) -> dict:
        """
        Intelligent chart-type recommendation based on data shape and user intent.
        Uses heuristic rules first, LLM for edge cases.
        """
        num_rows = len(data_sample)

        # Detect column types
        numeric_cols = []
        categorical_cols = []
        date_cols = []

        for col in columns:
            col_lower = col.lower()
            if any(kw in col_lower for kw in ["date", "time", "year", "month", "day", "created", "updated"]):
                date_cols.append(col)
            elif num_rows > 0 and isinstance(data_sample[0].get(col), (int, float)):
                numeric_cols.append(col)
            else:
                categorical_cols.append(col)

        # Heuristic rules
        if num_rows == 1 and len(numeric_cols) <= 3:
            return {"chart_type": "kpi", "reason": "Single row with few numeric values — best as KPI cards"}

        if len(date_cols) > 0 and len(numeric_cols) > 0:
            return {"chart_type": "line", "reason": "Time-series data detected — line chart shows trends"}

        if len(categorical_cols) == 1 and len(numeric_cols) == 1:
            if num_rows <= 6:
                return {"chart_type": "pie", "reason": "Few categories with single metric — pie chart for proportions"}
            return {"chart_type": "bar", "reason": "Category vs metric — bar chart for comparison"}

        if len(numeric_cols) >= 2 and len(categorical_cols) == 0:
            return {"chart_type": "area", "reason": "Multiple numeric series — area chart for volume comparison"}

        if num_rows > 10:
            return {"chart_type": "bar", "reason": "Multiple rows — bar chart for visual comparison"}

        return {"chart_type": "table", "reason": "Complex data structure — table view is most readable"}
