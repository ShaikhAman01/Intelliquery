from cryptography.fernet import Fernet
from app.core.config import settings

try:
    cipher_suite = Fernet(settings.ENCRYPTION_KEY.encode())
except Exception as e:
    print(f"CRITICAL ERROR: Invalid ENCRYPTION_KEY. {e}")
    raise e

def encrypt_password(password: str) -> str:
    """
    Takes a plain text password and returns an encrypted string.
    """
    if not password:
        return ""
    return cipher_suite.encrypt(password.encode()).decode()

def decrypt_password(encrypted_password: str) -> str:
    """
    Takes an encrypted string and returns the plain text password.
    """
    if not encrypted_password:
        return ""
    return cipher_suite.decrypt(encrypted_password.encode()).decode()