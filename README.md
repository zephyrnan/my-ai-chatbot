# 灵境

灵境是一个基于 `Next.js 16`、`React 19`、`TypeScript`、`Auth.js`、`Drizzle` 和 `AI SDK` 构建的全栈 AI 工作台。

它目前支持：

- 本地 `Ollama` 模型，用于聊天、推理和视觉理解
- 通过 OpenAI 兼容接口接入阿里云 `DashScope`
- 可选的 `Vercel AI Gateway` 兜底路由
- 聊天记录持久化、游客模式、账号登录、文件上传、文档工具和 E2E 测试

## 技术栈

- Next.js App Router
- React 19
- TypeScript
- AI SDK
- Auth.js
- Drizzle ORM
- Postgres
- Tailwind CSS
- Playwright

## 模型路由

模型路由逻辑集中在 `lib/ai/providers.ts`。

- `LOCAL_CHAT_MODEL_IDS` 中的模型走 `Ollama`
- `DASHSCOPE_CHAT_MODEL_IDS` 中的模型走 `DashScope`
- 其他模型 ID 会回退到 `Vercel AI Gateway`
- `Auto` 模式当前的策略是：
  - 图片请求走 `minicpm-v:8b`
  - 纯文本请求在配置了 DashScope 时走 `qwen-plus-2025-07-28`
  - 否则回退到本地 `qwen3:8b`

当前项目内置模型：

- 本地模型：`qwen3:8b`、`deepseek-r1:8b`、`minicpm-v:8b`
- DashScope 模型：`qwen-plus-2025-07-28`、`qvq-max-2025-03-25`、`qwen-vl-plus-latest`、`qwen-math-turbo`

## 环境变量

把 `.env.example` 复制为 `.env.local`，然后按需填写。

正常运行至少需要：

- `POSTGRES_URL`
- `AUTH_SECRET`

常用可选变量：

- `OLLAMA_BASE_URL`
- `OLLAMA_API_KEY`
- `DASHSCOPE_API_KEY`
- `DASHSCOPE_BASE_URL`
- `AI_GATEWAY_API_KEY`
- `REDIS_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_BASE_PATH`
- `BLOB_READ_WRITE_TOKEN`

说明：

- 如果没有配置 `BLOB_READ_WRITE_TOKEN`，图片上传会自动回退到 `public/uploads`
- `REDIS_URL` 只用于生产环境限流
- 只有在同时设置了 `DASHSCOPE_BASE_URL` 时，`OPENAI_API_KEY` 才会被当成 DashScope 的兼容 key 使用

## 本地开发

1. 安装依赖：

```bash
pnpm install
```

2. 初始化数据库：

```bash
pnpm db:migrate
```

3. 如果要使用本地模型，启动 Ollama 并拉取模型：

```bash
ollama serve
ollama pull qwen3:8b
ollama pull deepseek-r1:8b
ollama pull minicpm-v:8b
```

4. 启动开发环境：

```bash
pnpm dev
```

本地生产模式预览：

```bash
pnpm build
pnpm start
```

## 部署说明

### 方案一：部署到自己的服务器 / Docker / 虚拟机

适合你自己控制 Node 运行环境的场景。

必需变量：

- `POSTGRES_URL`
- `AUTH_SECRET`

按模型策略补充：

- 本地模型：`OLLAMA_BASE_URL`、`OLLAMA_API_KEY`
- DashScope：`DASHSCOPE_API_KEY`，可选 `DASHSCOPE_BASE_URL`
- Gateway 模型：`AI_GATEWAY_API_KEY`
- 限流：`REDIS_URL`

部署命令：

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

### 方案二：部署到 Vercel

适合直接托管 Next.js 应用。

建议在 Vercel 项目环境变量中配置：

- `POSTGRES_URL`
- `AUTH_SECRET`
- `DASHSCOPE_API_KEY`
- `OLLAMA_BASE_URL`（如果线上还需要连远程 Ollama）
- `AI_GATEWAY_API_KEY`
- `REDIS_URL`
- `BLOB_READ_WRITE_TOKEN`
- `NEXT_PUBLIC_APP_URL`

注意：

- Vercel 不能直接在同一实例里运行本地 Ollama。如果线上还要用 Ollama，`OLLAMA_BASE_URL` 需要指向另一台可访问机器
- 如果你只想云端部署，建议避免把运行时强依赖放在本地模型上
- `NEXT_PUBLIC_APP_URL` 应该配置成线上真实域名

## 验证与回归

常用命令：

```bash
pnpm build
pnpm exec playwright test
```

当前项目的回归目标：

- Windows 下可正常构建
- 生产模式可以正常启动
- 认证流程可用
- 聊天输入和响应链路可用
- 模型选择器可用
- API 与建议操作的 E2E 可用

## 目录结构

- `app/`：页面路由、认证、API 路由
- `components/`：聊天 UI、文档 UI、基础组件
- `lib/ai/`：模型配置、Provider 路由、AI 相关工具
- `lib/db/`：数据库 schema、查询、迁移
- `tests/e2e/`：Playwright 端到端测试

## 当前运行特性

- 支持游客直接进入聊天
- 聊天记录持久化到 Postgres
- 上传优先走 Vercel Blob，未配置时自动回退到本地磁盘
- 本地推理模型可在前端展示 reasoning 内容
- 本地模型和云模型可以在同一个模型选择器里共存
