from typing import Dict, List, Optional, Any
from difflib import get_close_matches


class DynamicSQLGenerator:
    """
    Advanced deterministic SQL generator that maps natural language tokens
    to database schema elements to build valid SQL queries without LLMs.

    Handles: list, count, sum, average, max, min, distinct, trend, distribution
    Supports: sorting, limiting, time filters, grouping, column resolution.
    """

    SAFE_LIMIT = 50

    # Superlatives that rank by a *quality* ("most active", "best selling").
    # If the quality doesn't resolve to a real column, the answer needs
    # joins/aggregation this engine can't express — decline so the LLM
    # pipeline (which sees FK relationships) handles it instead.
    QUALIFIER_SORT_KEYWORDS = {"most", "least", "best", "worst", "fewest"}

    # Common date/time column names for auto-detection
    DATE_COLUMN_HINTS = {
        "created_at", "updated_at", "date", "timestamp", "order_date",
        "joined_at", "registered_at", "created", "modified", "event_date",
        "start_date", "end_date", "purchase_date", "transaction_date",
    }

    # Time-granularity groupings for trend queries
    TIME_GRANULARITY_MAP = {
        "daily": ("day", "DD"),
        "weekly": ("week", "IW"),
        "monthly": ("month", "MM"),
        "yearly": ("year", "YYYY"),
        "year": ("year", "YYYY"),
        "month": ("month", "MM"),
        "week": ("week", "IW"),
        "day": ("day", "DD"),
    }

    def generate(self, nlp_data: Dict[str, Any], schema_map: Dict[str, List[Dict[str, str]]],
                 db_type: str = "postgres") -> Optional[str]:
        """
        Attempts to generate a SQL query based on NLP data and schema.
        Returns None if it cannot safely construct a query.
        db_type controls dialect-specific SQL (casts, date truncation).
        """
        intent = nlp_data.get("intent", "list")
        entities = nlp_data.get("entities", {})
        grouping_keys = nlp_data.get("grouping_keys", [])
        sort_order = nlp_data.get("sort_order")
        sort_keyword = nlp_data.get("sort_keyword")
        limit = nlp_data.get("limit")
        time_filter = nlp_data.get("time_filter")
        select_columns = nlp_data.get("select_columns", [])

        tables = schema_map.get("tables", {})
        if not tables:
            return None

        # 1. Resolve Table
        nouns = entities.get("nouns", [])
        table_name = self._resolve_table(nouns, list(tables.keys()))

        if not table_name:
            return None

        columns_info = tables.get(table_name, {})

        # Schema is stored as {col_name: {type, is_pk, fk_target, nullable}}.
        # Support the legacy list-of-dicts format too for safety.
        if isinstance(columns_info, dict):
            all_columns = list(columns_info.keys())
            numeric_columns = [
                name for name, meta in columns_info.items()
                if isinstance(meta, dict) and self._is_numeric_type(meta.get("type", ""))
            ]
            key_columns = {
                name for name, meta in columns_info.items()
                if isinstance(meta, dict) and (meta.get("is_pk") or meta.get("fk_target"))
            }
        else:
            all_columns = [c["name"] for c in columns_info]
            numeric_columns = [
                c["name"] for c in columns_info
                if self._is_numeric_type(c.get("type", ""))
            ]
            key_columns = set()

        # Numeric columns that are meaningful as metrics — PKs and foreign
        # keys are identifiers, not quantities; SUM(id) is never the answer.
        metric_columns = [
            c for c in numeric_columns
            if c not in key_columns and c.lower() != "id" and not c.lower().endswith("_id")
        ]

        # 2. Resolve base filters. When a parsed time range exists (step 3),
        # skip entity-date filters — spaCy tags relative phrases like
        # "this month" as DATE entities, which would produce a bogus
        # LIKE '%this month%' clause on top of the real BETWEEN range.
        where_clauses = self._resolve_filters(
            entities, all_columns, nlp_data.get("filters", []),
            db_type=db_type, skip_dates=bool(time_filter),
        )

        # 3. Resolve time filter
        if time_filter:
            time_where = self._resolve_time_filter(time_filter, all_columns)
            if time_where:
                where_clauses.append(time_where)

        # 4. Build by intent
        effective_limit = limit or self.SAFE_LIMIT

        if intent == "list":
            cols = self._resolve_select_columns(select_columns, all_columns)
            order_col = None
            if sort_order:
                # Resolve what's being ranked ("most active", "top ... by amount").
                # Include individual words from noun chunks so "lowest stock"
                # can match a column like stock_quantity.
                quality_words = (
                    entities.get("adjectives", []) + nouns + grouping_keys
                    + [tok for n in nouns for tok in n.split() if len(tok) > 3]
                )
                order_col = self._resolve_column(quality_words, metric_columns)
                if not order_col:
                    if (sort_keyword or "").lower() in self.QUALIFIER_SORT_KEYWORDS:
                        return None  # unresolvable quality — needs the LLM
                    # Plain "top N records": fall back to a metric, else PK order
                    order_col = (metric_columns or numeric_columns or [None])[0]
            return self._build_select(table_name, cols, where_clauses, sort_order, effective_limit, order_col)

        elif intent == "count":
            group_col = self._resolve_column(grouping_keys, all_columns, quote=True)
            if group_col:
                return self._build_group_by(table_name, group_col, "COUNT", '"*"', where_clauses, sort_order or "DESC", effective_limit, use_star_count=True)
            return self._build_count(table_name, where_clauses)

        elif intent == "sum":
            metric_col = self._resolve_metric_column(nouns, numeric_columns, metric_columns)
            if not metric_col:
                return None
            group_col = self._resolve_column(grouping_keys, all_columns, quote=True)
            if group_col:
                return self._build_group_by(table_name, group_col, "SUM", metric_col, where_clauses, sort_order or "DESC", effective_limit)
            return self._build_aggregation(table_name, "SUM", metric_col, where_clauses)

        elif intent == "average":
            metric_col = self._resolve_metric_column(nouns, numeric_columns, metric_columns)
            if not metric_col:
                return None
            group_col = self._resolve_column(grouping_keys, all_columns, quote=True)
            if group_col:
                return self._build_group_by(table_name, group_col, "AVG", metric_col, where_clauses, sort_order or "DESC", effective_limit)
            return self._build_aggregation(table_name, "AVG", metric_col, where_clauses)

        elif intent == "max":
            metric_col = self._resolve_metric_column(nouns, numeric_columns, metric_columns)
            if not metric_col:
                return None
            group_col = self._resolve_column(grouping_keys, all_columns, quote=True)
            if group_col:
                return self._build_group_by(table_name, group_col, "MAX", metric_col, where_clauses, sort_order or "DESC", effective_limit)
            return self._build_aggregation(table_name, "MAX", metric_col, where_clauses)

        elif intent == "min":
            metric_col = self._resolve_metric_column(nouns, numeric_columns, metric_columns)
            if not metric_col:
                return None
            group_col = self._resolve_column(grouping_keys, all_columns, quote=True)
            if group_col:
                return self._build_group_by(table_name, group_col, "MIN", metric_col, where_clauses, sort_order or "ASC", effective_limit)
            return self._build_aggregation(table_name, "MIN", metric_col, where_clauses)

        elif intent == "distinct":
            col = self._resolve_column(nouns + grouping_keys + select_columns, all_columns, quote=True)
            if col:
                return self._build_distinct(table_name, col, where_clauses, effective_limit)
            return self._build_distinct_all(table_name, where_clauses, effective_limit)

        elif intent == "trend":
            date_col = self._find_date_column(all_columns)
            metric_col = self._resolve_metric_column(nouns, numeric_columns, metric_columns)
            if not date_col:
                return None
            granularity = self._detect_granularity(nlp_data.get("raw_text", ""))
            return self._build_trend(table_name, date_col, metric_col, granularity, where_clauses, effective_limit, db_type)

        elif intent == "distribution":
            group_col = self._resolve_column(grouping_keys + nouns, all_columns, quote=True)
            metric_col = self._resolve_metric_column(nouns, numeric_columns, metric_columns)
            if group_col:
                func = "SUM" if metric_col else "COUNT"
                col = metric_col or '"*"'
                return self._build_group_by(table_name, group_col, func, col, where_clauses, "DESC", effective_limit, use_star_count=(not metric_col))
            return None

        return None

    # ── Builders ──────────────────────────────────────────────────────────

    def _build_select(self, table: str, cols: str, where: List[str],
                      sort_order: str | None, limit: int, order_col: str | None) -> str:
        where_str = f" WHERE {' AND '.join(where)}" if where else ""
        order_str = ""
        if sort_order and order_col and cols == "*":
            # Only sort when selecting all columns
            order_str = f' ORDER BY "{order_col}" {sort_order}'
        return f'SELECT {cols} FROM "{table}"{where_str}{order_str} LIMIT {limit}'

    def _build_count(self, table: str, where: List[str]) -> str:
        where_str = f" WHERE {' AND '.join(where)}" if where else ""
        return f'SELECT COUNT(*) as count FROM "{table}"{where_str}'

    def _build_aggregation(self, table: str, func: str, col: str, where: List[str]) -> str:
        where_str = f" WHERE {' AND '.join(where)}" if where else ""
        alias = func.lower()
        return f'SELECT {func}({col}) as {alias} FROM "{table}"{where_str}'

    def _build_group_by(self, table: str, group_col: str, func: str, metric_col: str,
                        where: List[str], sort_order: str, limit: int,
                        use_star_count: bool = False) -> str:
        where_str = f" WHERE {' AND '.join(where)}" if where else ""
        agg_expr = f"COUNT(*)" if use_star_count else f"{func}({metric_col})"
        alias = "count" if use_star_count else "total"
        return (
            f'SELECT {group_col}, {agg_expr} as {alias} '
            f'FROM "{table}"{where_str} '
            f'GROUP BY {group_col} ORDER BY {alias} {sort_order} LIMIT {limit}'
        )

    def _build_distinct(self, table: str, col: str, where: List[str], limit: int) -> str:
        where_str = f" WHERE {' AND '.join(where)}" if where else ""
        return f'SELECT DISTINCT {col} FROM "{table}"{where_str} ORDER BY {col} LIMIT {limit}'

    def _build_distinct_all(self, table: str, where: List[str], limit: int) -> str:
        where_str = f" WHERE {' AND '.join(where)}" if where else ""
        return f'SELECT DISTINCT * FROM "{table}"{where_str} LIMIT {limit}'

    def _build_trend(self, table: str, date_col: str, metric_col: str | None,
                     granularity: str, where: List[str], limit: int,
                     db_type: str = "postgres") -> str:
        where_str = f" WHERE {' AND '.join(where)}" if where else ""
        trunc = self._date_trunc_expr(date_col, granularity, db_type)
        # Group/order by the full expression — alias references in GROUP BY
        # are not portable across dialects (e.g. SQL Server rejects them).
        if metric_col:
            return (
                f'SELECT {trunc} as period, COUNT(*) as count, SUM({metric_col}) as total '
                f'FROM "{table}"{where_str} '
                f'GROUP BY {trunc} ORDER BY {trunc} LIMIT {limit}'
            )
        return (
            f'SELECT {trunc} as period, COUNT(*) as count '
            f'FROM "{table}"{where_str} '
            f'GROUP BY {trunc} ORDER BY {trunc} LIMIT {limit}'
        )

    # ── Dialect helpers ──────────────────────────────────────────────────

    def _date_trunc_expr(self, date_col: str, granularity: str, db_type: str) -> str:
        """Dialect-portable date truncation for trend grouping."""
        col = f'"{date_col}"'
        if db_type == "sqlite":
            fmt = {"year": "%Y", "month": "%Y-%m", "week": "%Y-W%W",
                   "day": "%Y-%m-%d"}.get(granularity, "%Y-%m")
            return f"strftime('{fmt}', {col})"
        if db_type in ("mysql", "mariadb"):
            fmt = {"year": "%Y", "month": "%Y-%m", "week": "%x-W%v",
                   "day": "%Y-%m-%d"}.get(granularity, "%Y-%m")
            return f"DATE_FORMAT({col}, '{fmt}')"
        if db_type == "mssql":
            fmt = {"year": "yyyy", "month": "yyyy-MM",
                   "day": "yyyy-MM-dd"}.get(granularity, "yyyy-MM")
            return f"FORMAT({col}, '{fmt}')"
        # postgres / cockroach
        return f"DATE_TRUNC('{granularity}', {col})"

    def _cast_to_text(self, col_expr: str, db_type: str) -> str:
        """Dialect-portable text cast (Postgres-style :: is not universal)."""
        if db_type in ("mysql", "mariadb"):
            return f"CAST({col_expr} AS CHAR)"
        if db_type == "mssql":
            return f"CAST({col_expr} AS VARCHAR(64))"
        # postgres / cockroach / sqlite
        return f"CAST({col_expr} AS TEXT)"

    # ── Resolvers ────────────────────────────────────────────────────────

    def _resolve_table(self, nouns: List[str], table_names: List[str]) -> Optional[str]:
        # Direct match first (including containment)
        for noun in nouns:
            clean = noun.lower().strip()
            tokens = clean.split()

            for t in table_names:
                t_lower = t.lower()
                if clean == t_lower:
                    return t
                if t_lower in tokens:
                    return t
                for token in tokens:
                    if len(token) < 3:
                        continue
                    matches = get_close_matches(token, [t_lower], n=1, cutoff=0.85)
                    if matches:
                        return t

        # Full phrase fuzzy match (fallback)
        for noun in nouns:
            matches = get_close_matches(noun.lower(), [t.lower() for t in table_names], n=1, cutoff=0.8)
            if matches:
                for t in table_names:
                    if t.lower() == matches[0]:
                        return t

        return None

    def _resolve_column(self, candidates: List[str], columns: List[str],
                        numeric_only: bool = False, quote: bool = False) -> Optional[str]:
        for word in candidates:
            clean = word.lower().strip()
            # Exact match
            for col in columns:
                if col.lower() == clean:
                    return f'"{col}"' if quote else col
            # Substring match
            for col in columns:
                col_lower = col.lower()
                if clean in col_lower or col_lower in clean:
                    return f'"{col}"' if quote else col

        # Fuzzy match (fallback)
        for word in candidates:
            clean = word.lower().strip()
            if len(clean) < 3:
                continue
            col_lowers = [c.lower() for c in columns]
            matches = get_close_matches(clean, col_lowers, n=1, cutoff=0.8)
            if matches:
                for col in columns:
                    if col.lower() == matches[0]:
                        return f'"{col}"' if quote else col

        return None

    def _resolve_metric_column(self, nouns: List[str], numeric_columns: List[str],
                                metric_columns: List[str]) -> Optional[str]:
        """
        Resolve a numeric metric column — prefer an explicit match against any
        numeric column, else fall back to the first *metric* column.
        Never falls back to identifier columns (PKs / foreign keys):
        SUM(id) is a nonsense answer, and declining routes the query to the LLM.
        """
        col = self._resolve_column(nouns, numeric_columns, quote=True)
        if col:
            return col
        if metric_columns:
            return f'"{metric_columns[0]}"'
        return None

    def _resolve_select_columns(self, select_columns: List[str], all_columns: List[str]) -> str:
        """Resolve explicitly mentioned columns, or default to *."""
        if not select_columns:
            return "*"
        resolved = []
        for sc in select_columns:
            col = self._resolve_column([sc], all_columns, quote=True)
            if col:
                resolved.append(col)
        return ", ".join(resolved) if resolved else "*"

    def _resolve_filters(self, entities: Dict[str, Any], columns: List[str],
                         nlp_filters: List[Dict], db_type: str = "postgres",
                         skip_dates: bool = False) -> List[str]:
        filters = []

        # 1. Date filters from entities. Only literal dates (containing digits)
        # are usable here — relative phrases ("this month", "last week") are
        # DATE entities to spaCy but carry no matchable text; they're handled
        # by the parsed time_filter range instead.
        dates = [] if skip_dates else entities.get("dates", [])
        if dates:
            date_col = self._find_date_column(columns)
            target_date = dates[0].replace("'", "''")
            if date_col and any(ch.isdigit() for ch in target_date):
                if len(target_date) == 4 and target_date.isdigit():
                    filters.append(f'"{date_col}" BETWEEN \'{target_date}-01-01\' AND \'{target_date}-12-31\'')
                else:
                    cast = self._cast_to_text(f'"{date_col}"', db_type)
                    filters.append(f"{cast} LIKE '%{target_date}%'")

        # 2. Adjective / Status filters
        adjectives = entities.get("adjectives", []) + entities.get("nouns", [])
        status_cols = [c for c in columns if c.lower() in {"status", "type", "category", "state", "tier", "level"}]
        if status_cols:
            col = status_cols[0]
            common_statuses = {"active", "inactive", "pending", "completed", "failed",
                               "success", "cancelled", "open", "closed", "approved", "rejected"}
            for adj in adjectives:
                if adj.lower() in common_statuses:
                    filters.append(f'"{col}" = \'{adj.lower()}\'')
                    break

        # 3. Comparison filters from NLP
        for f in nlp_filters:
            if f.get("type") == "comparison":
                op = f.get("operator", "")
                val = f.get("value", "")
                # Try to find the column this applies to
                col_hint = f.get("column_hint")
                if col_hint:
                    col = self._resolve_column([col_hint], columns, quote=True)
                else:
                    # Default to first numeric or any column
                    col = None

                if col and val:
                    op_map = {"gt": ">", "lt": "<", "gte": ">=", "lte": "<=", "eq": "="}
                    if op == "between":
                        val2 = f.get("value2", val)
                        filters.append(f'{col} BETWEEN {val} AND {val2}')
                    elif op in op_map:
                        filters.append(f'{col} {op_map[op]} {val}')

        return filters

    def _resolve_time_filter(self, time_filter: Dict[str, Any], columns: List[str]) -> Optional[str]:
        """Convert a parsed time filter into a WHERE clause."""
        date_col = self._find_date_column(columns)
        if not date_col:
            return None
        start = time_filter.get("start")
        end = time_filter.get("end")
        if start and end:
            return f'"{date_col}" BETWEEN \'{start}\' AND \'{end}\''
        return None

    def _find_date_column(self, columns: List[str]) -> Optional[str]:
        """Find the best date/timestamp column."""
        for col in columns:
            if col.lower() in self.DATE_COLUMN_HINTS:
                return col
        # Fallback: look for columns with 'date' or 'time' in the name
        for col in columns:
            if "date" in col.lower() or "time" in col.lower():
                return col
        return None

    def _detect_granularity(self, text: str) -> str:
        """Detect time granularity from the query text."""
        text_lower = text.lower()
        for keyword, (gran, _) in self.TIME_GRANULARITY_MAP.items():
            if keyword in text_lower:
                return gran
        return "month"  # default

    @staticmethod
    def _is_numeric_type(type_str: str) -> bool:
        """Check if a column type string represents a numeric type."""
        numeric_indicators = [
            "int", "float", "double", "decimal", "numeric",
            "real", "money", "serial", "bigint", "smallint",
        ]
        type_lower = type_str.lower()
        return any(ind in type_lower for ind in numeric_indicators)
