#!/usr/bin/env python
import subprocess
import time
import urllib.request
import json
import sys

# Start uvicorn in background
proc = subprocess.Popen(
    ['python', '-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000'],
    cwd=r'C:\Users\sai\OneDrive\Desktop\Cloud mini\backend',
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

# Wait for startup
time.sleep(3)

# Check if process is still running and get output
if proc.poll() is not None:
    stdout, stderr = proc.communicate(timeout=5)
    print("STDOUT:", stdout.decode()[:2000] if stdout else "empty")
    print("STDERR:", stderr.decode()[:3000] if stderr else "empty")
    print(f"Process exited with code: {proc.returncode}")
    sys.exit(1)

# Test health endpoint
try:
    req = urllib.request.Request('http://localhost:8000/api/health')
    with urllib.request.urlopen(req, timeout=5) as response:
        body = json.loads(response.read().decode())
        print("=== Health Check ===")
        print(json.dumps(body, indent=2))
except Exception as e:
    print("Error connecting to health endpoint:", e)

# Test config endpoint
try:
    req = urllib.request.Request('http://localhost:8000/api/config')
    with urllib.request.urlopen(req, timeout=5) as response:
        body = json.loads(response.read().decode())
        print("\n=== Config ===")
        print(json.dumps(body, indent=2))
except Exception as e:
    print("Error connecting to config endpoint:", e)

# Test apps endpoint
try:
    req = urllib.request.Request('http://localhost:8000/api/apps')
    with urllib.request.urlopen(req, timeout=5) as response:
        body = json.loads(response.read().decode())
        print("\n=== Apps ===")
        print(json.dumps(body, indent=2))
except Exception as e:
    print("Error connecting to apps endpoint:", e)

# Stop the server
proc.terminate()
proc.wait()
print("\nServer stopped successfully")