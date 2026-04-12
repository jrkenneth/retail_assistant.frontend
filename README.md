# Frontend (Lena Web Client)

React + Vite client for the Lena retail AI assistant. This app provides the authenticated chat UI, session management, access request flow, and artifact viewing experience.

## Role in the System

- Handles login and authenticated user interaction.
- Calls Lena backend APIs for chat, sessions, access requests, and artifacts.
- Streams assistant responses from the backend.
- Stores lightweight UI state locally (active session and mode toggles).

Security, RBAC, tool execution, and policy enforcement remain backend responsibilities.

## Prerequisites

- Node.js 18+
- Lena backend running (default: `http://localhost:4000`)

## Environment Setup

1. Copy the example file:

```bash
cp .env.example .env
```

2. Update values if needed:

```env
VITE_API_URL=http://localhost:4000
```

If `VITE_API_URL` is missing, blank, or equal to `undefined`, the app falls back to `http://localhost:4000`.

## Install and Run

```bash
npm install
npm run dev
```

Dev server URL:

```text
http://localhost:5173
```

## Build and Preview

```bash
npm run build
npm run preview
```

## Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - TypeScript build + Vite production build
- `npm run preview` - Preview production build locally

## Project Structure

```text
src/
  features/
    auth/             Login and auth API helpers
    chat/             Chat workspace, messages, streaming, cards
    access-requests/  Access request UI and API helpers
    artifacts/        Artifact viewer flow
  utils/              Browser and local-state helpers
  config.ts           API base URL resolution
  styles.css          Global UI styling
  App.tsx             App shell and route gating
  main.tsx            React entry point
```

## Expected Backend Endpoints

Public endpoints:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /health`

Authenticated endpoints:

- `POST /chat`
- `POST /chat/stream`
- `GET /sessions`
- `POST /sessions`
- `GET /sessions/:sessionId/messages`
- `PATCH /sessions/:sessionId`
- `DELETE /sessions/:sessionId`
- `GET /artifacts`
- `GET /artifacts/:artifactId`
- `GET /artifacts/:artifactId/preview`
- `GET /artifacts/:artifactId/download`
- `GET /access-requests`
- `POST /access-requests`

## Quick Local Startup Order

1. Start Velora demo backend (`backend/velora_backend`).
2. Start Lena backend (`backend`).
3. Start this frontend (`frontend`).
