import os

base = r"C:\Users\sai\OneDrive\Desktop\Cloud mini"
dirs = [
    "docs",
    "backend/app",
    "backend/tests",
    "frontend/src/components",
    "frontend/src/pages",
    "frontend/src/layouts",
    "frontend/src/hooks",
    "frontend/src/services",
    "frontend/src/types",
    "frontend/src/utils",
    "sample-app",
    "infrastructure",
]

for d in dirs:
    full = os.path.join(base, d)
    os.makedirs(full, exist_ok=True)
    print(f"Created: {full}")

print("Done")