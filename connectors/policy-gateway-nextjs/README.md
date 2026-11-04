# Policy Gateway Next.js connector

Route Handler wrapper for Next.js App Router that forwards requests to Policy Gateway and injects policy metadata.

## 5-minute quickstart
1) Copy `policyGatewayRoute.ts` into `app/lib/policyGatewayRoute.ts`.
2) Create `app/api/policy/route.ts`:

```ts
import { createPolicyGatewayRoute } from "@/app/lib/policyGatewayRoute";

export const POST = createPolicyGatewayRoute({
  apiKey: process.env.POLICY_GATEWAY_KEY!,
  policyId: "policy-gateway",
  policyProjectId: "support-bot",
});
```

3) Call your route handler from the browser or backend:

```bash
curl https://your-app.example/api/policy \
  -H "Content-Type: application/json" \
  -d '{"model":"abliterated-model","messages":[{"role":"user","content":"Summarize our refund policy."}]}'
```

## Security note
The handler forwards a policy identity (`policy_user`, project, target) with your server-side API key. Pass `resolvePolicyUser` and derive the identity from your authenticated session. It takes precedence over request body fields and headers on purpose: body and header values are caller-controlled, so without a resolver any caller can claim another user's identity. When no resolver returns a user, the handler ignores identity fields in the request and forwards a fixed default user instead.

## Policy Gateway base URL (optional)
`createPolicyGatewayRoute` defaults to the hosted Policy Gateway. Set this only if you need to override it:

```bash
export POLICY_GATEWAY_BASE_URL=https://api.abliteration.ai
```

Then pass `baseUrl: process.env.POLICY_GATEWAY_BASE_URL` into `createPolicyGatewayRoute`.

## Sample log output
See `sample-logs.txt` for example audit lines you can feed into dashboards.
