"""
setup_credentials.py - Prompt for admin credentials, hash password, write .env

Called by install.bat after pip install so argon2-cffi is available.
Usage: python setup_credentials.py <backend_dir>
"""
import sys
import getpass
import secrets
from pathlib import Path
from argon2 import PasswordHasher

backend_dir = Path(sys.argv[1])

print()
raw = input("  Enter admin username [default: admin]: ").strip()
username = raw if raw else "admin"

password = getpass.getpass("  Enter admin password: ")
print("  Hashing password...")
pw_hash = PasswordHasher().hash(password)

jwt_secret = secrets.token_urlsafe(48)
print("  JWT secret generated.")

env_content = (
    "APP_ENV=production\n"
    "APP_HOST=127.0.0.1\n"
    "APP_PORT=8000\n"
    "\n"
    "UPLOAD_DIR=./data/uploads\n"
    "LOG_LEVEL=INFO\n"
    "LOG_DIR=./data/logs\n"
    "DATABASE_PATH=./data/database.json\n"
    "\n"
    'CORS_ORIGINS=["http://127.0.0.1:8000"]\n'
    "\n"
    f"ADMIN_USERNAME={username}\n"
    f"ADMIN_PASSWORD_HASH={pw_hash}\n"
    f"JWT_SECRET_KEY={jwt_secret}\n"
    "COOKIE_SECURE=false\n"
)

env_path = backend_dir / ".env"
env_path.write_text(env_content, encoding="utf-8")
print(f"  Written: {env_path}")
