import re
from typing import Dict, List, Any
from datetime import datetime, timedelta

_nlp = None


def _get_nlp():
    global _nlp
    if _nlp is None:
        import spacy
        _nlp = spacy.load("en_core_web_sm")
    return _nlp


class NLPProcessor:
    def __init__(self):
        # Only truly complex operations that a simple builder can't handle
        self.complexity_triggers = [
            "nested", "subquery", "window", "rank", "partition",
            "recursive", "pivot", "unpivot", "correlated",
            "union", "intersect", "except", "exists",
            "cross join", "self join", "lateral",
        ]

        # Sorting keywords
        self.sort_asc_triggers = [
            "lowest", "least", "smallest", "minimum", "oldest",
            "earliest", "ascending", "bottom", "fewest",
        ]
        self.sort_desc_triggers = [
            "top", "highest", "largest", "most", "biggest", "best",
            "newest", "latest", "descending", "greatest",
        ]

        # Time period patterns (relative)
        self.time_period_patterns = [
            (r"last (\d+) days?", "days"),
            (r"past (\d+) days?", "days"),
            (r"last (\d+) weeks?", "weeks"),
            (r"past (\d+) weeks?", "weeks"),
            (r"last (\d+) months?", "months"),
            (r"past (\d+) months?", "months"),
            (r"last (\d+) years?", "years"),
            (r"past (\d+) years?", "years"),
            (r"this month", "this_month"),
            (r"this year", "this_year"),
            (r"this week", "this_week"),
            (r"last month", "last_month"),
            (r"last year", "last_year"),
            (r"last week", "last_week"),
            (r"yesterday", "yesterday"),
            (r"today", "today"),
        ]

    def process(self, text: str) -> Dict[str, Any]:
        doc = _get_nlp()(text)
        text_lower = text.lower()

        # 1. Complexity detection
        is_complex = any(trigger in text_lower for trigger in self.complexity_triggers)

        # 2. Extract Entities
        entities = {
            "dates": [ent.text for ent in doc.ents if ent.label_ == "DATE"],
            "money": [ent.text for ent in doc.ents if ent.label_ == "MONEY"],
            "numbers": [ent.text for ent in doc.ents if ent.label_ in ("CARDINAL", "QUANTITY")],
            "organizations": [ent.text for ent in doc.ents if ent.label_ == "ORG"],
            "persons": [ent.text for ent in doc.ents if ent.label_ == "PERSON"],
            "locations": [ent.text for ent in doc.ents if ent.label_ in ("GPE", "LOC")],
            "nouns": [chunk.text for chunk in doc.noun_chunks],
            "adjectives": [token.text for token in doc if token.pos_ == "ADJ"],
        }

        # 3. Intent Detection (order matters — more specific first)
        intent = self._detect_intent(text_lower)

        # 4. Grouping detection (improved)
        grouping_keys = self._extract_grouping(doc, text_lower)

        # 5. Filter extraction
        filters = self._extract_filters(doc, text_lower)

        # 6. Time period extraction (safe — never crash on bad date math)
        try:
            time_filter = self._extract_time_period(text_lower)
        except Exception:
            time_filter = None

        # 7. Sorting detection
        sort_order = None
        sort_keyword = None
        for word in self.sort_desc_triggers:
            if word in text_lower:
                sort_order = "DESC"
                sort_keyword = word
                break
        if not sort_order:
            for word in self.sort_asc_triggers:
                if word in text_lower:
                    sort_order = "ASC"
                    sort_keyword = word
                    break

        # 8. Limit detection
        limit = self._extract_limit(text_lower, entities)

        # 9. Specific column mentions (e.g. "show me name and email")
        select_columns = self._extract_select_columns(doc, text_lower)

        return {
            "intent": intent,
            "entities": entities,
            "grouping_keys": grouping_keys,
            "filters": filters,
            "time_filter": time_filter,
            "sort_order": sort_order,
            "sort_keyword": sort_keyword,
            "limit": limit,
            "select_columns": select_columns,
            "is_complex": is_complex,
            "raw_text": text,
        }

    def _detect_intent(self, text_lower: str) -> str:
        """Detect query intent with priority ordering."""
        # Distribution / breakdown
        if any(w in text_lower for w in ["distribution", "breakdown", "break down", "proportion", "percentage"]):
            return "distribution"

        # Trend / over time
        if any(w in text_lower for w in ["trend", "over time", "growth", "monthly", "weekly", "daily", "yearly"]):
            return "trend"

        # Distinct / unique
        if any(w in text_lower for w in ["distinct", "unique", "different"]):
            return "distinct"

        # Aggregates
        if any(w in text_lower for w in ["count", "how many", "number of"]):
            return "count"
        if any(w in text_lower for w in ["sum", "total", "add up", "combined"]):
            return "sum"
        if any(w in text_lower for w in ["average", "mean", "avg"]):
            return "average"
        if any(w in text_lower for w in ["max", "maximum", "highest value", "peak"]):
            return "max"
        if any(w in text_lower for w in ["min", "minimum", "lowest value", "floor"]):
            return "min"

        # Compare
        if any(w in text_lower for w in ["compare", "versus", "vs", "difference between"]):
            return "compare"

        return "list"

    def _extract_grouping(self, doc, text_lower: str) -> List[str]:
        """Extract grouping columns with improved heuristics."""
        grouping_keys = []

        # Pattern 1: "by <column>"
        if "by" in text_lower:
            for token in doc:
                if token.text.lower() == "by":
                    # Grab dependents
                    for child in token.children:
                        grouping_keys.append(child.text)
                        # Also grab conjuncts ("by region and category")
                        for conj in child.conjuncts:
                            grouping_keys.append(conj.text)
                    # Grab next noun token
                    next_idx = token.i + 1
                    if next_idx < len(doc) and doc[next_idx].pos_ in ("NOUN", "PROPN"):
                        if doc[next_idx].text not in grouping_keys:
                            grouping_keys.append(doc[next_idx].text)

        # Pattern 2: "per <column>" (e.g. "revenue per month")
        per_match = re.search(r"per (\w+)", text_lower)
        if per_match:
            word = per_match.group(1)
            if word not in [w.lower() for w in grouping_keys]:
                grouping_keys.append(word)

        # Pattern 3: "each <column>" (e.g. "for each customer")
        each_match = re.search(r"(?:for )?each (\w+)", text_lower)
        if each_match:
            word = each_match.group(1)
            if word not in [w.lower() for w in grouping_keys]:
                grouping_keys.append(word)

        return grouping_keys

    def _safe_replace_month(self, dt: datetime, month: int, year: int = None) -> datetime:
        """Safely replace month/year, clamping day to valid range."""
        import calendar
        y = year if year is not None else dt.year
        max_day = calendar.monthrange(y, month)[1]
        return dt.replace(year=y, month=month, day=min(dt.day, max_day))

    def _extract_time_period(self, text_lower: str) -> Dict[str, Any] | None:
        """Extract relative time periods like 'last 30 days', 'this month', etc."""
        now = datetime.utcnow()

        for pattern, period_type in self.time_period_patterns:
            match = re.search(pattern, text_lower)
            if not match:
                continue

            # Types with a numeric value
            if period_type in ("days", "weeks", "months", "years"):
                n = int(match.group(1))
                if period_type == "days":
                    start = now - timedelta(days=n)
                elif period_type == "weeks":
                    start = now - timedelta(weeks=n)
                elif period_type == "months":
                    total_months = now.year * 12 + now.month - 1 - n
                    target_year = total_months // 12
                    target_month = total_months % 12 + 1
                    start = self._safe_replace_month(now, target_month, target_year)
                elif period_type == "years":
                    start = self._safe_replace_month(now, now.month, now.year - n)
                return {"start": start.strftime("%Y-%m-%d"), "end": now.strftime("%Y-%m-%d"), "label": match.group(0)}

            # Named periods
            if period_type == "today":
                return {"start": now.strftime("%Y-%m-%d"), "end": now.strftime("%Y-%m-%d"), "label": "today"}
            if period_type == "yesterday":
                yday = now - timedelta(days=1)
                return {"start": yday.strftime("%Y-%m-%d"), "end": yday.strftime("%Y-%m-%d"), "label": "yesterday"}
            if period_type == "this_week":
                start = now - timedelta(days=now.weekday())
                return {"start": start.strftime("%Y-%m-%d"), "end": now.strftime("%Y-%m-%d"), "label": "this week"}
            if period_type == "last_week":
                start = now - timedelta(days=now.weekday() + 7)
                end = start + timedelta(days=6)
                return {"start": start.strftime("%Y-%m-%d"), "end": end.strftime("%Y-%m-%d"), "label": "last week"}
            if period_type == "this_month":
                return {"start": now.replace(day=1).strftime("%Y-%m-%d"), "end": now.strftime("%Y-%m-%d"), "label": "this month"}
            if period_type == "last_month":
                first_of_month = now.replace(day=1)
                end = first_of_month - timedelta(days=1)
                start = end.replace(day=1)
                return {"start": start.strftime("%Y-%m-%d"), "end": end.strftime("%Y-%m-%d"), "label": "last month"}
            if period_type == "this_year":
                return {"start": now.replace(month=1, day=1).strftime("%Y-%m-%d"), "end": now.strftime("%Y-%m-%d"), "label": "this year"}
            if period_type == "last_year":
                start = now.replace(year=now.year - 1, month=1, day=1)
                end = now.replace(year=now.year - 1, month=12, day=31)
                return {"start": start.strftime("%Y-%m-%d"), "end": end.strftime("%Y-%m-%d"), "label": "last year"}

        return None

    def _extract_select_columns(self, doc, text_lower: str) -> List[str]:
        """Extract explicitly mentioned column names from patterns like 'show me name and email'."""
        columns = []

        # Only extract columns from very explicit patterns like 
        # "show me name, email and phone from users"
        # The key is requiring "from" to anchor the end — prevents false positives
        match = re.search(
            r"(?:show|list|get|display|give)\s+(?:me\s+)?(?:the\s+)?"
            r"(.+?)\s+(?:from|of|in)\s+",
            text_lower
        )
        if match:
            col_text = match.group(1)
            # Only use if it looks like actual column names (short, no verbs)
            parts = re.split(r",\s*|\s+and\s+", col_text)
            skip_words = {
                "all", "every", "each", "the", "a", "an", "their", "top",
                "bottom", "total", "how", "many", "number", "count",
                "sum", "average", "distinct", "unique", "most", "least",
            }
            for part in parts:
                clean = part.strip()
                # Only accept single words or two-word phrases as column names
                word_count = len(clean.split())
                if clean and word_count <= 2 and clean not in skip_words:
                    columns.append(clean)

        return columns

    def _extract_filters(self, doc, text_lower: str) -> List[Dict]:
        """
        Extract simple filter conditions from the query.
        Patterns: "where X is Y", "for X", "in X", "X greater than Y"
        """
        filters = []

        # Pattern: "where/for/in <value>"
        filter_prepositions = ["where", "for", "in", "from"]
        for token in doc:
            if token.text.lower() in filter_prepositions:
                # Collect the next meaningful tokens
                value_tokens = []
                for child in token.children:
                    if child.dep_ in ("pobj", "attr", "dobj"):
                        value_tokens.append(child.text)
                if value_tokens:
                    filters.append({
                        "type": token.text.lower(),
                        "value": " ".join(value_tokens),
                    })

        # Pattern: "named/called <value>"
        name_match = re.search(r"(?:named|called)\s+['\"]?(\w[\w\s]*?)['\"]?(?:\s|$)", text_lower)
        if name_match:
            filters.append({
                "type": "name_match",
                "value": name_match.group(1).strip(),
            })

        # Pattern: "with <column> <operator> <value>"
        with_match = re.search(r"with\s+(\w+)\s+(greater|more|less|fewer|above|below|over|under)\s+than\s+(\d+)", text_lower)
        if with_match:
            col_hint = with_match.group(1)
            direction = with_match.group(2)
            val = with_match.group(3)
            op = "gt" if direction in ("greater", "more", "above", "over") else "lt"
            filters.append({
                "type": "comparison",
                "column_hint": col_hint,
                "operator": op,
                "value": val,
            })

        # Pattern: comparison operators in text
        comparison_patterns = [
            (r"greater than (\d+[\d,]*\.?\d*)", "gt"),
            (r"more than (\d+[\d,]*\.?\d*)", "gt"),
            (r"above (\d+[\d,]*\.?\d*)", "gt"),
            (r"over (\d+[\d,]*\.?\d*)", "gt"),
            (r"less than (\d+[\d,]*\.?\d*)", "lt"),
            (r"fewer than (\d+[\d,]*\.?\d*)", "lt"),
            (r"below (\d+[\d,]*\.?\d*)", "lt"),
            (r"under (\d+[\d,]*\.?\d*)", "lt"),
            (r"at least (\d+[\d,]*\.?\d*)", "gte"),
            (r"at most (\d+[\d,]*\.?\d*)", "lte"),
            (r"equal to (\d+[\d,]*\.?\d*)", "eq"),
            (r"equals? (\d+[\d,]*\.?\d*)", "eq"),
            (r"between (\d+[\d,]*\.?\d*) and (\d+[\d,]*\.?\d*)", "between"),
        ]

        for pattern, op in comparison_patterns:
            match = re.search(pattern, text_lower)
            if match:
                if op == "between":
                    filters.append({
                        "type": "comparison",
                        "operator": op,
                        "value": match.group(1).replace(",", ""),
                        "value2": match.group(2).replace(",", ""),
                    })
                else:
                    filters.append({
                        "type": "comparison",
                        "operator": op,
                        "value": match.group(1).replace(",", ""),
                    })

        return filters

    def _extract_limit(self, text_lower: str, entities: dict) -> int | None:
        """Extract a row limit from the text. E.g., 'top 10', 'first 5'."""
        limit_patterns = [
            r"top (\d+)",
            r"first (\d+)",
            r"last (\d+)",
            r"limit (\d+)",
            r"show (\d+)",
            r"(\d+) results",
            r"(\d+) rows",
            r"(\d+) records",
        ]

        for pattern in limit_patterns:
            match = re.search(pattern, text_lower)
            if match:
                return int(match.group(1))

        return None
