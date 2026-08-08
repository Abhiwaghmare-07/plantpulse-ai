import requests
import time

BASE_URL = "http://127.0.0.1:8000"

# Sample inputs
samples = [
    {
        "name": "Healthy Machine Reading",
        "data": {
            "Air_temperature": 298.1,
            "Process_temperature": 308.2,
            "Rotational_speed": 1430.0,
            "Torque": 38.0,
            "Tool_wear": 5.0,
            "Type": "L"
        }
    },
    {
        "name": "Borderline Machine Reading",
        "data": {
            "Air_temperature": 302.5,
            "Process_temperature": 310.1,
            "Rotational_speed": 1310.0,
            "Torque": 54.0,
            "Tool_wear": 190.0,
            "Type": "L"
        }
    },
    {
        "name": "Critical Machine Reading (High failure risk)",
        "data": {
            "Air_temperature": 304.5,
            "Process_temperature": 308.6,
            "Rotational_speed": 2860.0,
            "Torque": 72.0,
            "Tool_wear": 240.0,
            "Type": "L"
        }
    }
]

def run_tests():
    # 1. Health check
    try:
        health_resp = requests.get(f"{BASE_URL}/health")
        print(f"Health Check: Status Code {health_resp.status_code}")
        print(health_resp.json())
        print("-" * 60)
    except Exception as e:
        print(f"Failed to connect to API: {e}")
        return

    # 2. Prediction requests
    for sample in samples:
        print(f"Sending sample: {sample['name']}")
        print(f"Input: {sample['data']}")
        
        try:
            start_time = time.time()
            resp = requests.post(f"{BASE_URL}/predict", json=sample['data'])
            latency = (time.time() - start_time) * 1000
            
            print(f"Response (HTTP {resp.status_code}, {latency:.2f}ms):")
            print(resp.json())
        except Exception as e:
            print(f"Request failed: {e}")
        print("-" * 60)

if __name__ == "__main__":
    run_tests()
