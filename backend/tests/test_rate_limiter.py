import asyncio
import unittest

from app.middleware.rate_limiter import RateLimiterMiddleware


async def ok_app(scope, receive, send):
    await send({"type": "http.response.start", "status": 200, "headers": []})
    await send({"type": "http.response.body", "body": b"ok"})


async def call(app, ip="1.2.3.4", path="/x"):
    sent = []

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        sent.append(message)

    await app(
        {
            "type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": "GET",
            "scheme": "http", "path": path, "raw_path": path.encode(), "query_string": b"",
            "headers": [], "client": (ip, 1), "server": ("test", 80),
        },
        receive,
        send,
    )
    return sent[0]["status"], dict(sent[0]["headers"])


class RateLimiterTest(unittest.TestCase):
    def test_returns_429_with_retry_after(self):
        async def run():
            app = RateLimiterMiddleware(ok_app, requests_per_minute=2)
            return [await call(app) for _ in range(3)]

        responses = asyncio.run(run())
        self.assertEqual([status for status, _ in responses], [200, 200, 429])
        self.assertTrue(1 <= int(responses[2][1][b"retry-after"]) <= 61)

    def test_limits_each_ip_separately_and_skips_health(self):
        async def run():
            app = RateLimiterMiddleware(ok_app, requests_per_minute=1)
            await call(app)
            return [
                (await call(app, ip="5.6.7.8"))[0],
                (await call(app, path="/health"))[0],
                (await call(app))[0],
            ]

        self.assertEqual(asyncio.run(run()), [200, 200, 429])


if __name__ == "__main__":
    unittest.main()
