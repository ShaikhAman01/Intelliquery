"""
In-process TTL+LRU cache for SQL generation results and query results.

Two singletons are exposed:
  sql_cache    — generated SQL keyed by (connection_id, normalized question), TTL 1h
  result_cache — query results keyed by (connection_id, SQL hash), TTL 5min

Both are thread-safe (Lock-protected OrderedDict).
No external dependencies — drop-in replacement for Redis when the app outgrows
a single process.

Cache invalidation:
  Call sql_cache.invalidate_connection(connection_id) whenever a connection's
  schema is refreshed so stale SQL is never replayed against a changed schema.
"""

from __future__ import annotations

import hashlib
import re
import time
from collections import OrderedDict
from threading import Lock
from typing import Any


class TTLCache:
    """Thread-safe LRU cache with per-entry TTL expiry.

    Eviction policy: when the cache is full, the least-recently-used entry
    is removed.  Entries that have passed their TTL are evicted lazily on
    the next access to that key.
    """

    def __init__(self, maxsize: int, ttl: float) -> None:
        self.maxsize = maxsize
        self.ttl = ttl
        self._store: OrderedDict[str, tuple[Any, float]] = OrderedDict()
        self._lock = Lock()
        self._hits = 0
        self._misses = 0

    # ── Public API ────────────────────────────────────────────────────────────

    def get(self, key: str, default: Any = None) -> Any:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._misses += 1
                return default
            value, expires_at = entry
            if time.monotonic() > expires_at:
                del self._store[key]
                self._misses += 1
                return default
            self._store.move_to_end(key)
            self._hits += 1
            return value

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            expires_at = time.monotonic() + self.ttl
            if key in self._store:
                self._store.move_to_end(key)
            self._store[key] = (value, expires_at)
            # Evict LRU entry when over capacity
            while len(self._store) > self.maxsize:
                self._store.popitem(last=False)

    def invalidate(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def invalidate_connection(self, connection_id: int) -> int:
        """Remove all entries for a given connection. Returns count removed.

        Called after schema refresh so cached SQL doesn't run against a
        changed schema.
        """
        prefix = f"{connection_id}::"
        with self._lock:
            to_remove = [k for k in self._store if k.startswith(prefix)]
            for k in to_remove:
                del self._store[k]
        return len(to_remove)

    def stats(self) -> dict:
        with self._lock:
            now = time.monotonic()
            alive = sum(1 for _, (_, exp) in self._store.items() if exp > now)
            total = self._hits + self._misses
            hit_rate = round(self._hits / total * 100, 1) if total else 0.0
            return {
                "entries": len(self._store),
                "alive": alive,
                "maxsize": self.maxsize,
                "ttl_seconds": self.ttl,
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate_pct": hit_rate,
            }


# ── Key builders ──────────────────────────────────────────────────────────────

def make_sql_key(connection_id: int, question: str) -> str:
    """Stable cache key for a (connection, question) pair.

    Normalises whitespace and lowercases the question so minor formatting
    differences don't cause cache misses.
    """
    normalized = re.sub(r"\s+", " ", question.lower().strip())
    return f"{connection_id}::{normalized}"


def make_result_key(connection_id: int, sql: str) -> str:
    """Stable cache key for a (connection, SQL) pair.

    Hashes the SQL so keys are compact regardless of query length.
    Uses only the first 20 hex chars — collision probability is negligible
    for the cache sizes we use.
    """
    sql_hash = hashlib.sha256(sql.strip().encode()).hexdigest()[:20]
    return f"{connection_id}::{sql_hash}"


# ── Singletons ────────────────────────────────────────────────────────────────

# SQL generation: LLM calls cost ~500–2000ms each.  Cache for 1 hour.
# 1 000 entries × ~500 bytes average SQL ≈ 500 KB max footprint.
sql_cache = TTLCache(maxsize=1000, ttl=3600)

# Query results: data can change between requests.  Cache for 5 minutes.
# 500 entries × ~50 KB average result ≈ 25 MB max footprint (acceptable).
result_cache = TTLCache(maxsize=500, ttl=300)
