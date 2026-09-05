import os
import json
import urllib.request
import urllib.error

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

candidate_models = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
    "gemini-pro"
]

def test_gemini_model(model_name):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{
            "parts": [{"text": "Respond with the single word SUCCESS if you are operational."}]
        }]
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            text = res_json.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
            return {"status": "SUCCESS", "code": response.getcode(), "response": text}
    except urllib.error.HTTPError as e:
        err_text = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_text)
            msg = err_json.get("error", {}).get("message", err_text[:100])
        except:
            msg = err_text[:100]
        return {"status": "FAILED", "code": e.code, "error": msg}
    except Exception as e:
        return {"status": "ERROR", "error": str(e)}

def main():
    print("=" * 80)
    print("   VERIFYING GOOGLE GEMINI API MODEL SUPPORT & CAPABILITIES")
    print("=" * 80)
    
    results = {}
    highest_working_model = None

    for model in candidate_models:
        res = test_gemini_model(model)
        results[model] = res
        print(f"Model: {model:<20} | Status: {res['status']:<8} | Code: {res.get('code', 'N/A')}")
        if res["status"] == "SUCCESS":
            print(f"   -> Gemini Response: \"{res['response']}\"")
            if not highest_working_model:
                highest_working_model = model
        else:
            print(f"   -> Error: {res.get('error')}")

    print("\n" + "=" * 80)
    print(f"HIGHEST SUPPORTED PRODUCTION MODEL: {highest_working_model}")
    print("=" * 80)

if __name__ == "__main__":
    main()
