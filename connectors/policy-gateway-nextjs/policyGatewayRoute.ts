import { NextRequest, NextResponse } from "next/server";

type PolicyGatewayRouteOptions = {
  apiKey: string;
  policyId: string;
  baseUrl?: string;
  policyProjectId?: string;
  policyTarget?: string;
  resolvePolicyUser?: (req: NextRequest) => Promise<string | null> | string | null;
};

const DEFAULT_BASE_URL = "https://api.abliteration.ai";

const compactHeaders = (headers: Record<string, string | undefined | null>) => {
  const next: Record<string, string> = {};
  Object.entries(headers).forEach(([key, value]) => {
    if (value) next[key] = value;
  });
  return next;
};

export const createPolicyGatewayRoute = (options: PolicyGatewayRouteOptions) => {
  const baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const endpoint = `${baseUrl}/policy/chat/completions`;

  return async function POST(req: NextRequest) {
    const body = await req.json();
    const resolvedUser = await options.resolvePolicyUser?.(req);
    const policyUser = resolvedUser || "user-12345";
    const policyProjectId = body.policy_project_id || options.policyProjectId || req.headers.get("x-policy-project");
    const policyTarget = body.policy_target || options.policyTarget || req.headers.get("x-policy-target");

    const payload = {
      ...body,
      policy_id: body.policy_id || options.policyId,
      policy_user: policyUser,
      ...(policyProjectId ? { policy_project_id: policyProjectId } : {}),
      ...(policyTarget ? { policy_target: policyTarget } : {}),
    };

    const headers = compactHeaders({
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey}`,
      "X-Policy-User": policyUser,
      "X-Policy-Project": policyProjectId,
      "X-Policy-Target": policyTarget,
    });

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  };
};
