"""
Simple in-memory rate limiter middleware.
Limits requests per IP address using a sliding window approach.
"""

import time
from collections import defaultdict
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logger import logger


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    In-memory rate limiter. For production, swap with a Redis-backed implementation.
    """

    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.window_seconds = 60
        self._requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks
        if request.url.path == "/health":
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - self.window_seconds

        # Clean old entries
        self._requests[client_ip] = [
            t for t in self._requests[client_ip] if t > window_start
        ]

        if len(self._requests[client_ip]) >= self.requests_per_minute:
            logger.warning(f"🚦 Rate limit exceeded for {client_ip}")
            retry_after = int(self._requests[client_ip][0] + self.window_seconds - now) + 1
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please try again later."},
                headers={"Retry-After": str(retry_after)},
            )

        self._requests[client_ip].append(now)
        response = await call_next(request)

        # Add rate limit headers
        remaining = self.requests_per_minute - len(self._requests[client_ip])
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))

        return response
