import requests
import json

# Test backend health
print("Testing backend health...")
try:
    response = requests.get("http://localhost:8000/health")
    print(f"✅ Health Check: {response.status_code} - {response.json()}")
except Exception as e:
    print(f"❌ Health Check Failed: {e}")

# Test signup endpoint
print("\nTesting signup endpoint...")
try:
    data = {
        "name": "Test User",
        "email": "testuser123@example.com",
        "password": "test123"
    }
    response = requests.post("http://localhost:8000/auth/signup", json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    if response.status_code == 200:
        print("✅ Signup successful!")
    else:
        print(f"❌ Signup failed: {response.text}")
except Exception as e:
    print(f"❌ Request failed: {e}")
