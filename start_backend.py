import subprocess
import time
import sys

# Start uvicorn in background
proc = subprocess.Popen(
    ['python', '-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000'],
    cwd=r'C:\Users\sai\OneDrive\Desktop\Cloud mini\backend',
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

# Wait a moment for startup
time.sleep(3)

# Check if process is still running
if proc.poll() is not None:
    stdout, stderr = proc.communicate(timeout=5)
    print("STDOUT:", stdout.decode()[:2000] if stdout else "empty")
    print("STDERR:", stderr.decode()[:3000] if stderr else "empty")
    print(f"Process exited with code: {proc.returncode}")
    sys.exit(1)

# Try to connect
import urllib.request
try:
    req = urllib.request.Request('http://localhost:8000/api/health')
    with urllib.request.urlopen(req, timeout=5) as response:
        body = response.read().decode()
        print('Health check response:', body[:500])
except Exception as e:
    print('Error connecting:', e)

print(f"Process PID: {proc.pid}")
print(f"Process running: {proc.poll() is None}")