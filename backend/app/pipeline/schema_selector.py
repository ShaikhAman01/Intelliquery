"""
Relevant schema selection.

Filters the full cached schema down to only the tables that are semantically
relevant to the user's query.  The LLM only ever receives the tables it needs,
which:
  - Reduces token usage (fewer tables → shorter prompt)
  - Reduces hallucinated JOINs to unrelated tables
  - Keeps the LLM focused on the right part of the schema

Algorithm (three passes, cheapest first):
  1. Keyword match   — direct substring between query tokens and table/column names
  2. FK expansion    — any directly referenced table pulls in its FK neighbours
  3. Minimum floor   — always return at least 1 table (the best keyword match)

Hard cap: MAX_TABLES (default 12) so enormous schemas never flood the prompt.
"""

from __future__ import annotations

import re
from typing import Dict, Any

MAX_TABLES = 12


def _tokenise(text: str) -> set[str]:
    """Lower-case word tokens, length ≥ 3, with common plural stripped."""
    raw = re.findall(r"[a-zA-Z_][a-zA-Z0-9_]*", text.lower())
    tokens: set[str] = set()
    for t in raw:
        if len(t) < 3:
            continue
        tokens.add(t)
        # naive singular: strip trailing 's' or 'es' so "orders" matches "order"
        if t.endswith("ies") and len(t) > 4:
            tokens.add(t[:-3] + "y")
        elif t.endswith("es") and len(t) > 3:
            tokens.add(t[:-2])
        elif t.endswith("s") and len(t) > 3:
            tokens.add(t[:-1])
    return tokens


def _table_score(table_name: str, col_names: list[str], query_tokens: set[str]) -> int:
    """
    Score a table by how many of its identifiers match query tokens.
    Higher = more relevant.
    """
    score = 0
    t_lower = table_name.lower()
    t_parts = set(re.split(r"[_\s]", t_lower)) | {t_lower}

    for token in query_tokens:
        if token in t_parts:
            score += 3          # table name match is most valuable
        for col in col_names:
            c_lower = col.lower()
            c_parts = set(re.split(r"[_\s]", c_lower)) | {c_lower}
            if token in c_parts:
                score += 1      # column name match

    return score


def _fk_neighbours(table_name: str, schema: Dict[str, Any]) -> set[str]:
    """Return table names that share a FK relationship with *table_name*."""
    neighbours: set[str] = set()
    cols = schema.get(table_name, {})
    if isinstance(cols, dict):
        for meta in cols.values():
            if isinstance(meta, dict) and meta.get("fk_target"):
                ref_table = meta["fk_target"].split(".")[0]
                if ref_table in schema:
                    neighbours.add(ref_table)

    # Reverse: other tables that FK into this one
    for tname, tcols in schema.items():
        if not isinstance(tcols, dict):
            continue
        for meta in tcols.values():
            fk = meta.get("fk_target") if isinstance(meta, dict) else None
            if fk and fk.startswith(f"{table_name}."):
                neighbours.add(tname)

    return neighbours


def select_relevant_tables(
    query: str,
    schema: Dict[str, Any],
    max_tables: int = MAX_TABLES,
) -> Dict[str, Any]:
    """
    Return a filtered copy of *schema* containing only the tables most
    relevant to *query*.  Never returns an empty dict — falls back to the
    full schema if nothing scores above zero.

    Args:
        query:      The raw user question.
        schema:     Full cached_schema dict: {table_name: {col_name: meta}}.
        max_tables: Hard cap on tables returned (default 12).

    Returns:
        Filtered schema dict with the same structure as the input.
    """
    if not schema or len(schema) <= max_tables:
        return schema  # small schema — no filtering needed

    query_tokens = _tokenise(query)

    # Score every table
    scored: list[tuple[int, str]] = []
    for table_name, cols in schema.items():
        col_names = list(cols.keys()) if isinstance(cols, dict) else []
        score = _table_score(table_name, col_names, query_tokens)
        scored.append((score, table_name))

    scored.sort(key=lambda x: x[0], reverse=True)

    # Seed with tables that scored > 0
    selected: set[str] = {name for score, name in scored if score > 0}

    # If nothing scored, take the single best match so we always return something
    if not selected:
        selected = {scored[0][1]} if scored else set(schema.keys())

    # FK expansion: pull in direct neighbours of selected tables
    expanded: set[str] = set(selected)
    for table_name in list(selected):
        for neighbour in _fk_neighbours(table_name, schema):
            expanded.add(neighbour)
            if len(expanded) >= max_tables:
                break
        if len(expanded) >= max_tables:
            break

    # Cap at max_tables, preserving score order
    ordered = [name for _, name in scored if name in expanded][:max_tables]

    return {name: schema[name] for name in ordered}
