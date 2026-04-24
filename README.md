# LingJing

LingJing is a full-stack AI workspace built with Next.js 16, React 19, TypeScript, Auth.js, Drizzle, and the AI SDK.

It supports:

- local Ollama models for chat, reasoning, and vision
- Alibaba DashScope models through an OpenAI-compatible endpoint
- optional Vercel AI Gateway fallback for other hosted models
- chat history, guest mode, authentication, file upload, document tools, and E2E coverage

## Stack

- Next.js App Router
- React 19
- TypeScript
- AI SDK
- Auth.js
- Drizzle ORM
- Postgres
- Tailwind CSS
- Playwright

## Model Routing

The routing layer lives in `lib/ai/providers.ts`.

- Models in `LOCAL_CHAT_MODEL_IDS` go to Ollama.
- Models in `DASHSCOPE_CHAT_MODEL_IDS` go to DashScope.
- Other model IDs fall back to Vercel AI Gateway.
- `Auto` mode currently routes:
  - image requests to `minicpm-v:8b`
  - text requests to `qwen-plus-2025-07-28` when DashScope is configured
  - otherwise to local `qwen3:8b`

Current curated models in this repo:

- Local: `qwen3:8b`, `deepseek-r1:8b`, `minicpm-v:8b`
- DashScope: `qwen-plus-2025-07-28`, `qvq-max-2025-03-25`, `qwen-vl-plus-latest`, `qwen-math-turbo`

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values you need.

Required for normal app usage:

- `POSTGRES_URL`
- `AUTH_SECRET`

Common optional variables:

- `OLLAMA_BASE_URL`
- `OLLAMA_API_KEY`
- `DASHSCOPE_API_KEY`
- `DASHSCOPE_BASE_URL`
- `AI_GATEWAY_API_KEY`
- `REDIS_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_BASE_PATH`
- `BLOB_READ_WRITE_TOKEN`

Notes:

- If `BLOB_READ_WRITE_TOKEN` is missing, image uploads fall back to `public/uploads` automatically.
- `REDIS_URL` is only used for production rate limiting.
- `OPENAI_API_KEY` is only treated as a DashScope key when `DASHSCOPE_BASE_URL` is also set.

## Local Development

1. Install dependencies:

```bash
pnpm install
```

2. Prepare the database:

```bash
pnpm db:migrate
```

3. If you want local models, start Ollama and pull the models:

```bash
ollama serve
ollama pull qwen3:8b
ollama pull deepseek-r1:8b
ollama pull minicpm-v:8b
```

4. Start the app:

```bash
pnpm dev
```

Local production preview:

```bash
pnpm build
pnpm start
```

## Deployment

### Option A: Node deployment

Use this when deploying to your own server, Docker host, or a VM.

Required:

- `POSTGRES_URL`
- `AUTH_SECRET`

Recommended depending on your model strategy:

- local models: `OLLAMA_BASE_URL`, `OLLAMA_API_KEY`
- DashScope: `DASHSCOPE_API_KEY`, optionally `DASHSCOPE_BASE_URL`
- gateway models: `AI_GATEWAY_API_KEY`
- rate limiting: `REDIS_URL`

Run:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

### Option B: Vercel deployment

Use this when you want managed Next.js hosting.

Set these project environment variables in Vercel:

- `POSTGRES_URL`
- `AUTH_SECRET`
- `DASHSCOPE_API_KEY` if you use hosted Qwen models
- `OLLAMA_BASE_URL` if your Vercel app needs to reach a remote Ollama host
- `AI_GATEWAY_API_KEY` if you keep gateway-only models enabled
- `REDIS_URL` if you want production rate limiting
- `BLOB_READ_WRITE_TOKEN` if you want Vercel Blob uploads instead of local fallback

Important deployment notes:

- Vercel cannot run local Ollama on the same instance. If you want Ollama in production, point `OLLAMA_BASE_URL` at another reachable machine.
- If you only want cloud deployment, disable reliance on local-only models in your runtime configuration.
- The metadata base URL should match your public domain through `NEXT_PUBLIC_APP_URL`.

## Validation and Regression

Useful commands:

```bash
pnpm build
pnpm exec playwright test
```

The current verification target for this repo is:

- build succeeds on Windows
- app starts successfully in production mode
- authentication flow passes
- chat input and response flow passes
- model selector flow passes
- API and suggested action E2E checks pass

## Project Structure

- `app/`: routes, auth, API handlers
- `components/`: chat UI, document UI, shared primitives
- `lib/ai/`: model list, provider routing, AI helpers
- `lib/db/`: schema, queries, migrations
- `tests/e2e/`: Playwright end-to-end coverage

## Current Runtime Behavior

- guest users can enter and chat without a manual signup step
- chats are persisted in Postgres
- uploads use Vercel Blob when available and local disk fallback otherwise
- local reasoning models expose reasoning output in the UI
- cloud and local models can coexist in the same selector
