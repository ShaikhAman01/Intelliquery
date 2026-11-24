import base64
import os

os.environ["DATABASE_URL"] = "postgresql://unused@127.0.0.1:1/unused"
os.environ["ENCRYPTION_KEY"] = base64.urlsafe_b64encode(os.urandom(32)).decode()
