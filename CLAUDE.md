# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server with Turbopack (http://localhost:3000)
npm run dev:daemon   # Start in background, logs to logs.txt

# Build & production
npm run build
npm run start

# Linting
npm run lint         # ESLint via next lint

# Testing
npm test             # Run all tests with Vitest
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx  # Single test file

# Database
npm run setup        # Install deps + prisma generate + migrate dev
npm run db:reset     # Reset database (destructive)
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma migrate dev --name <name>  # Create and run a new migration
```

## Environment

Copy `.env.example` to `.env`. `ANTHROPIC_API_KEY` is optional — the app falls back to a mock provider that generates static components without it.

## Code style

Use comments sparingly — only for complex or non-obvious logic.

## Architecture

**UIGen** is an AI-powered React component generator with live preview. Users describe components in natural language; Claude generates code into a virtual (in-memory) file system that renders instantly in an iframe.

### Data flow

1. User sends a message → `ChatContext` (`src/lib/contexts/chat-context.tsx`) → `POST /api/chat`
2. The API route streams a response from Claude using Vercel AI SDK with two tools:
   - `str_replace_editor` — view/create/edit files via string replacement or insertion
   - `file_manager` — rename/delete files
3. Tool calls are executed by `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`), which mutates the `VirtualFileSystem` instance
4. `PreviewFrame` detects file changes, runs `jsx-transformer.ts` (Babel standalone, client-side), creates a Blob URL, and loads it in an isolated iframe with an import map for `@/` aliases

### Key abstractions

| File | Role |
|------|------|
| `src/lib/file-system.ts` | `VirtualFileSystem` — in-memory tree, path normalization, serialization |
| `src/lib/provider.ts` | Wraps `@ai-sdk/anthropic` (or mock fallback) |
| `src/lib/auth.ts` | JWT sessions via `jose`, bcrypt passwords, httpOnly cookie |
| `src/lib/transform/jsx-transformer.ts` | Babel JSX → JS for iframe preview |
| `src/app/api/chat/route.ts` | Streaming chat endpoint; saves project after each turn |
| `src/app/main-content.tsx` | Root layout: resizable panels (35% chat / 65% editor+preview) |

### State management

- No Redux/Zustand — two React contexts cover the app:
  - `FileSystemContext`: owns the `VirtualFileSystem` instance, handles AI tool calls, triggers preview refresh
  - `ChatContext`: wraps Vercel AI SDK's `useChat`, bridges tool-call results back to the file system

### Preview pipeline

JSX files are transformed client-side by Babel, CSS imports are stripped, a Blob URL is created, and injected into an `<iframe>` with an import map resolving `react`, `react-dom`, and `@/` paths. This keeps generated code isolated from the host app.

### AI model

Uses `claude-haiku-4-5` via `@ai-sdk/anthropic` with prompt caching on the system prompt. Max 10,000 output tokens, up to 40 agentic steps. The mock provider (no API key needed) generates a counter/form/card component from keyword matching.

### Authentication

JWT stored in an httpOnly cookie (`session`, 7-day expiry). `src/middleware.ts` protects `/api/projects` and `/api/filesystem`. Server actions in `src/actions/` handle sign-up, sign-in, sign-out, and project CRUD.

### Database

Prisma with SQLite (dev). Schema defined in `prisma/schema.prisma` file Reference it anytime you need to understand the structure of data stored in the databse. Two models: `User` (email + bcrypt password) and `Project` (stores chat `messages` and serialized file system `data` as JSON strings). Prisma client is generated into `src/generated/prisma`.

### Testing

Vitest + Testing Library (`jsdom` environment by default). Config is in `vitest.config.mts`. Tests live in `__tests__/` directories co-located with source. Path aliases (`@/`) are resolved via `vite-tsconfig-paths`. Use `// @vitest-environment node` at the top of a test file when the jsdom environment causes issues (e.g. tests that use Node crypto APIs like `jose`).
