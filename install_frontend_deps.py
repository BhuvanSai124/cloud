#!/usr/bin/env python
import subprocess
import sys

print("Installing frontend dependencies...")

# First install Vite and React
result = subprocess.run(
    [sys.executable, "-m", "pip", "install", "vite", "react", "react-dom"],
    capture_output=True, text=True
)
print("Vite/React:", "OK" if result.returncode == 0 else f"FAILED: {result.stderr[:200]}")

# Install TypeScript
result = subprocess.run(
    [sys.executable, "-m", "pip", "install", "typescript"],
    capture_output=True, text=True
)
print("TypeScript:", "OK" if result.returncode == 0 else f"FAILED: {result.stderr[:200]}")

# Install Tailwind and plugins
result = subprocess.run(
    [sys.executable, "-m", "pip", "install", "tailwindcss", "postcss", "autoprefixer"],
    capture_output=True, text=True
)
print("Tailwind:", "OK" if result.returncode == 0 else f"FAILED: {result.stderr[:200]}")

# Install Lucide React
result = subprocess.run(
    [sys.executable, "-m", "pip", "install", "lucide-react"],
    capture_output=True, text=True
)
print("Lucide React:", "OK" if result.returncode == 0 else f"FAILED: {result.stderr[:200]}")

# Install React Router
result = subprocess.run(
    [sys.executable, "-m", "pip", "install", "react-router-dom"],
    capture_output=True, text=True
)
print("React Router:", "OK" if result.returncode == 0 else f"FAILED: {result.stderr[:200]}")

print("\nFrontend dependencies installation complete")