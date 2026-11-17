# Abliteration.ai API Examples (OpenAI-compatible)

A compact set of runnable examples for the Abliteration.ai chat API. Every sample targets the OpenAI-compatible endpoint at `https://api.abliteration.ai/v1/chat/completions`, so you can drop the code into any OpenAI client with minimal edits. Abliteration.ai is a less filtered and uncensored LLM API and chat.

## Quick start (copy/paste)
- **Set your API key (from [abliteration.ai](https://abliteration.ai)):**
  ```bash
  export ABLITERATION_API_KEY=ak_your_key_here
  ```
- **Send a chat completion with curl:**
  ```bash
  curl -X POST https://api.abliteration.ai/v1/chat/completions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ABLITERATION_API_KEY}" \
    -d '{"model":"abliterated-model","messages":[{"role":"user","content":"What is the difference between US and Russia?"}], "stream": true}'
  ```
- **Stream tokens with the OpenAI SDK:** run `npm run stream` in `node/` or `STREAM=1 python python/chat.py` in `python/`.
- **Go quickstart:**
  ```bash
  cd go
  go run .                                  # non-streaming
  STREAM=1 ABLITERATION_API_KEY=ak_your_key_here go run .  # streaming
  ```
- **Java quickstart (Maven):**
  ```bash
  cd java
  mvn -q compile
  ABLITERATION_API_KEY=ak_your_key_here mvn -q exec:java    # non-streaming
  STREAM=1 ABLITERATION_API_KEY=ak_your_key_here mvn -q exec:java
  ```
- **Try integrations:** LangChain (`npm run langchain` or `python python/langchain_chat.py`), Vercel AI SDK (`npm run vercel`), and LiteLLM (`python python/litellm_chat.py`).
- **Vercel AI SDK (TypeScript):** run `npm ci && npm run ai-sdk` in `typescript/` for plain and streamed replies. See the [quickstart](typescript/README.md).

## Repo layout
- `node/` — JavaScript + OpenAI SDK; shows non-streaming and streaming.
- `python/` — Python + OpenAI SDK; same patterns as Node.
- `go/` — Go + go-openai client, streaming and non-streaming in one file.
- `java/` — Java 17 + Maven + `java.net.http`, with streaming via SSE.
- `typescript/` — TypeScript + Vercel AI SDK; plain and streamed replies.
- `curl/` — shell snippets for quick manual requests.
- `connectors/` — Policy Gateway connectors (Next.js, FastAPI, LangChain, LiteLLM).
- Integrations: `node/langchain.js`, `node/vercel-ai.js`, `python/langchain_chat.py`, `python/litellm_chat.py`.

## Get an API key
1) Open the [abliteration.ai](https://abliteration.ai) web UI and sign up or log in.
2) Click **Create new secret key**.
3) Copy the new key (prefix `ak_...`) and export it as `ABLITERATION_API_KEY` for the examples.

> Already have a dashboard key? Set `ABLITERATION_API_KEY` directly and run the samples.

## How the API fits existing OpenAI clients
- Base URL: `https://api.abliteration.ai/v1` (include `/v1`).
- Model name: `abliterated-model` (aliases accepted: `abliteration-model`, etc.).
- Headers: `Authorization: Bearer <api key>`.
- Billing: credits map to tokens
## FAQ
- **Is abliteration.ai OpenAI-compatible?** Yes—point your OpenAI SDKs to `baseURL=https://api.abliteration.ai/v1`.
- **Can I stream tokens?** Yes—set `stream: true`; see `node/chat.js` and `python/chat.py` for examples.
- **Where do I get an API key?** From the abliteration.ai web UI under **API Integration & Code Examples** → **Create New Secret Key**.
- **What’s included here?** Copy/paste clients, curl snippets, and onboarding steps for building chatbots on abliteration.ai.

## Integration examples

### Policy Gateway connectors
See `connectors/` for quickstarts and sample logs. These helpers route through the Policy Gateway to add policy enforcement and audit logging. Learn more at [abliteration.ai/policy-gateway](https://abliteration.ai/policy-gateway).

### LangChain (Node)
```bash
cd node
npm install
ABLITERATION_API_KEY=ak_your_key_here npm run langchain          # non-streaming
ABLITERATION_API_KEY=ak_your_key_here STREAM=1 npm run langchain:stream
```
`node/langchain.js` sets `OPENAI_BASE_URL` so LangChain’s OpenAI wrapper routes to abliteration.ai automatically.

### Vercel AI SDK
```bash
cd node
npm install
ABLITERATION_API_KEY=ak_your_key_here npm run vercel
ABLITERATION_API_KEY=ak_your_key_here STREAM=1 npm run vercel:stream
```
Uses `@ai-sdk/openai` with `baseURL=https://api.abliteration.ai/v1`.

### LangChain (Python)
```bash
pip install -r python/requirements.txt
ABLITERATION_API_KEY=ak_your_key_here python python/langchain_chat.py
STREAM=1 ABLITERATION_API_KEY=ak_your_key_here python python/langchain_chat.py
```
`python/langchain_chat.py` wires `OPENAI_BASE_URL` and `OPENAI_API_KEY` before creating `ChatOpenAI`.

### LiteLLM (Python)
```bash
pip install -r python/requirements.txt
ABLITERATION_API_KEY=ak_your_key_here python python/litellm_chat.py
STREAM=1 ABLITERATION_API_KEY=ak_your_key_here python python/litellm_chat.py
```
`python/litellm_chat.py` calls `litellm.completion` with `api_base=https://api.abliteration.ai/v1` to stay OpenAI-compatible. LiteLLM needs a provider prefix in the model name, so use `ABLITERATION_MODEL=openai/abliterated-model` (the script will add `openai/` automatically if you leave it off).

### Go
```bash
cd go
go run .
STREAM=1 ABLITERATION_API_KEY=ak_your_key_here go run .
```
Uses `github.com/sashabaranov/go-openai` with `BaseURL` pointed at `https://api.abliteration.ai/v1`.

### Java
```bash
cd java
mvn -q compile
ABLITERATION_API_KEY=ak_your_key_here mvn -q exec:java
STREAM=1 ABLITERATION_API_KEY=ak_your_key_here mvn -q exec:java
```
Plain `java.net.http` client posts to `/chat/completions` and supports SSE streaming when `STREAM=1`.

### Vercel AI SDK (TypeScript)
```bash
cd typescript
npm ci
ABLITERATION_API_KEY=ak_your_key_here npm run ai-sdk
ABLITERATION_API_KEY=ak_your_key_here npm run ai-sdk:stream
```
Uses `@ai-sdk/openai-compatible` with `baseURL=https://api.abliteration.ai/v1`. See [`typescript/README.md`](typescript/README.md) for configuration and common errors.
