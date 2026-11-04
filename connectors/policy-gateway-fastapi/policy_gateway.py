import os
from typing import Any, Dict, Optional

import httpx
from fastapi import Request

DEFAULT_BASE_URL = "https://api.abliteration.ai"


class PolicyGatewayClient:
    def __init__(
        self,
        api_key: str,
        policy_id: str,
        base_url: str = DEFAULT_BASE_URL,
        policy_project_id: Optional[str] = None,
    ) -> None:
        self.api_key = api_key
        self.policy_id = policy_id
        self.base_url = base_url.rstrip("/")
        self.policy_project_id = policy_project_id

    async def chat_completions(
        self,
        payload: Dict[str, Any],
        policy_user: Optional[str] = None,
        policy_target: Optional[str] = None,
    ) -> Dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        if policy_user:
            headers["X-Policy-User"] = policy_user
        if self.policy_project_id:
            headers["X-Policy-Project"] = self.policy_project_id
        if policy_target:
            headers["X-Policy-Target"] = policy_target

        body = {
            **payload,
            "policy_id": payload.get("policy_id") or self.policy_id,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base_url}/policy/chat/completions",
                headers=headers,
                json=body,
            )
            resp.raise_for_status()
            return resp.json()


def policy_user_from_request(request: Request) -> Optional[str]:
    """Read the policy user from request headers.

    These headers are client-controlled. Only use this when a trusted,
    authenticated layer in front of your app sets or strips them.
    Otherwise any caller can claim another user's policy identity.
    Prefer deriving the identity from your authenticated session instead.
    """
    return request.headers.get("x-user-id") or request.headers.get("x-policy-user")


def policy_gateway_client_from_env() -> PolicyGatewayClient:
    api_key = os.environ["POLICY_GATEWAY_KEY"]
    policy_id = os.getenv("POLICY_ID", "policy-gateway")
    base_url = os.getenv("POLICY_GATEWAY_BASE_URL", DEFAULT_BASE_URL)
    project_id = os.getenv("POLICY_PROJECT_ID")
    return PolicyGatewayClient(api_key=api_key, policy_id=policy_id, base_url=base_url, policy_project_id=project_id)
