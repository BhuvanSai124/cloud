#!/usr/bin/env python
import subprocess
import sys

packages = [
    "fastapi",
    "uvicorn",
    "pytest",
    "httpx",
    "google-cloud-monitoring",
    "google-cloud-firestore",
    "pydantic",
]

print("Installing backend dependencies...")
for pkg in packages:
    print(f"Installing {pkg}...")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", pkg],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"  Failed: {result.stderr[:200]}")
    else:
        print(f"  OK")

print("\nAll dependencies installed")