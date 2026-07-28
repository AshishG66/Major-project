import time
import json
import urllib.request

server_url = "http://127.0.0.1:8000"

def test_endpoints():
    print("=" * 80)
    print("   HRIDYADARPAN LIVE REST API SERVICE TEST")
    print("=" * 80)

    # 1. Health Check
    try:
        req = urllib.request.urlopen(f"{server_url}/health")
        res_json = json.loads(req.read().decode("utf-8"))
        print(f"\n[GET /health] Status Code: {req.getcode()}")
        print(json.dumps(res_json, indent=2))
    except Exception as e:
        print(f"[GET /health] Failed: {e}")

    # 2. Model Status
    try:
        req = urllib.request.urlopen(f"{server_url}/model-status")
        res_json = json.loads(req.read().decode("utf-8"))
        print(f"\n[GET /model-status] Status Code: {req.getcode()}")
        print(json.dumps(res_json, indent=2))
    except Exception as e:
        print(f"[GET /model-status] Failed: {e}")

    # 3. Sample Patient Prediction (POST /predict)
    patient_payload = {
        "age": 58,
        "gender": 0,  # 0: Male
        "height": 175.0,
        "weight": 82.0,
        "bmi": 26.8,
        "systolicBP": 145,
        "diastolicBP": 92,
        "cholesterol": 235,
        "bloodSugar": 115,
        "heartRate": 78,
        "smoking": 1,
        "alcohol": 1,
        "exerciseFrequency": 2,
        "familyHistory": 1,
        "ejectionFraction": 48.0,
        "serumCreatinine": 1.2,
        "stElevation": 0.08
    }

    print("\nExecuting live POST /predict request with valid patient payload:")
    print(json.dumps(patient_payload, indent=2))

    try:
        data = json.dumps(patient_payload).encode("utf-8")
        req = urllib.request.Request(
            f"{server_url}/predict",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            print(f"\n[POST /predict] HTTP Status Code: {response.getcode()}")
            print("=" * 80)
            print("LIVE DIGITAL TWIN PREDICTION RESPONSE:")
            print("=" * 80)
            print(json.dumps(res_json, indent=2))
    except Exception as e:
        print(f"[POST /predict] Failed: {e}")

if __name__ == "__main__":
    test_endpoints()
