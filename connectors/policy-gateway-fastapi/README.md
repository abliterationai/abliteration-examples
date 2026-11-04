# Policy Gateway FastAPI connector

FastAPI dependency + client helper for routing requests through Policy Gateway.

## 5-minute quickstart
1) Copy `policy_gateway.py` into your FastAPI project.
2) Install dependencies:

```bash
pip install fastapi httpx
```

3) Use the client inside a route:

```python
from fastapi import FastAPI, Request
from policy_gateway import policy_gateway_client_from_env, policy_user_from_request

app = FastAPI()
client = policy_gateway_client_from_env()

@app.post("/chat")
async def chat(request: Request):
    body = await request.json()
    policy_user = policy_user_from_request(request)
    return await client.chat_completions(body, policy_user=policy_user, policy_target="support-bot")
```

## Security note
`policy_user_from_request` reads the identity from request headers, which are client-controlled. Use it only when a trusted, authenticated layer in front of your app sets or strips those headers. Otherwise derive the policy user from your authenticated session, so callers cannot claim another user's policy identity.

## Policy Gateway base URL (optional)
The client defaults to the hosted Policy Gateway. Set this only if you need to override it:

```bash
export POLICY_GATEWAY_BASE_URL=https://api.abliteration.ai
```

## Sample log output
See `sample-logs.txt` for example audit lines you can feed into dashboards.
