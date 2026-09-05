import time
import json
import urllib.request

server_url = "http://127.0.0.1:5000/api"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer demo-token-123"
}

prompts = [
    "Hello",
    "Who are you?",
    "What is cricket?",
    "Tell me a joke.",
    "What is AI?",
    "What causes heart attack?",
    "Suggest a heart healthy diet.",
    "Explain my risk report.",
    "Summarize my ECG."
]

def main():
    print("=" * 80)
    print("   HRIDYAAI CHATBOT COMPREHENSIVE END-TO-END AUTOMATED TEST SUITE")
    print("=" * 80)

    # 1. Create a new Chat Session
    try:
        req = urllib.request.Request(
            f"{server_url}/chat/sessions",
            data=json.dumps({}).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req) as response:
            sess_data = json.loads(response.read().decode("utf-8"))
            session_id = sess_data.get("session", {}).get("id")
            print(f"[Session Created] Session ID: {session_id}")
    except Exception as e:
        print(f"[Session Creation Failed]: {e}")
        session_id = None

    # 2. Test all 9 Prompts Sequentially in the Same Session
    results = []
    
    for idx, prompt in enumerate(prompts, 1):
        print("\n" + "-" * 80)
        print(f"PROMPT {idx}/9: \"{prompt}\"")
        print("-" * 80)
        
        start_time = time.time()
        payload = {
            "message": prompt,
            "sessionId": session_id
        }

        try:
            req = urllib.request.Request(
                f"{server_url}/chat/message",
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req) as response:
                latency_ms = int((time.time() - start_time) * 1000)
                res_data = json.loads(response.read().decode("utf-8"))
                status_code = response.getcode()
                reply_text = res_data.get("reply", "")
                agent_type = res_data.get("agentType", "UNKNOWN")
                debug_info = res_data.get("debug", {})
                
                print(f"Status Code: HTTP {status_code} | Latency: {latency_ms}ms | Agent: {agent_type}")
                print(f"Model: {debug_info.get('model', 'N/A')} | Gemini Connected: {debug_info.get('geminiConnected', False)}")
                print(f"AI Response Snippet (First 180 chars):\n\"{reply_text[:180]}...\"")
                
                results.append({
                    "prompt": prompt,
                    "status_code": status_code,
                    "latency_ms": latency_ms,
                    "agent_type": agent_type,
                    "model": debug_info.get("model"),
                    "gemini_connected": debug_info.get("geminiConnected"),
                    "reply": reply_text
                })
        except Exception as e:
            print(f"ERROR executing prompt \"{prompt}\": {e}")
            results.append({
                "prompt": prompt,
                "status_code": 500,
                "error": str(e)
            })

    # 3. Verify Session Message History Database Retrieval
    print("\n" + "=" * 80)
    print("   VERIFYING DATABASE CONVERSATION HISTORY RETRIEVAL (GET /chat/sessions/:id)")
    print("=" * 80)
    if session_id:
        try:
            req = urllib.request.Request(
                f"{server_url}/chat/sessions/{session_id}",
                headers=headers,
                method="GET"
            )
            with urllib.request.urlopen(req) as response:
                hist_data = json.loads(response.read().decode("utf-8"))
                messages = hist_data.get("messages", [])
                print(f"Total Stored Messages in Database: {len(messages)}")
                roles = [m["role"] for m in messages]
                print(f"Message Roles Sequence: {roles}")
                
                # Check for strict alternation
                is_alternating = True
                for i in range(1, len(roles)):
                    if roles[i] == roles[i-1]:
                        is_alternating = False
                        break
                print(f"Strict Alternation Check (User -> Assistant -> User -> Assistant): {'PASSED' if is_alternating else 'FAILED'}")
        except Exception as e:
            print(f"Failed loading chat history: {e}")

    # Summary Table
    print("\n" + "=" * 80)
    print("   END-TO-END TEST SUMMARY TABLE")
    print("=" * 80)
    print(f"{'#':<3} | {'Prompt':<30} | {'Status':<8} | {'Agent':<12} | {'Latency':<8} | {'Gemini'}")
    print("-" * 80)
    for idx, r in enumerate(results, 1):
        p_str = r['prompt'][:28]
        st = r.get('status_code', 500)
        ag = r.get('agent_type', 'ERR')
        lat = f"{r.get('latency_ms', 0)}ms"
        gem = "YES" if r.get('gemini_connected') else "NO"
        print(f"{idx:<3} | {p_str:<30} | HTTP {st:<3} | {ag:<12} | {lat:<8} | {gem}")

if __name__ == "__main__":
    main()
