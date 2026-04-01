# Frontend

React + Vite client for Lena. This app is the authenticated UI for chat, session management, access requests, artifact viewing, and model-mode controls.

## What This App Does

- Authenticates users against the backend
- Restores existing authenticated sessions on page load
- Renders the chat workspace and session list
- Streams assistant responses from the backend
- Persists selected UI state in browser storage
- Shows access-denied UX and access-request flows
- Displays generated artifacts in a viewer page
- Lets users toggle research mode and thinking mode per session

## Current Feature Areas

- Login screen for seeded backend users
- Auth bootstrap and logout
- Session list with create, rename, delete, and selection flows
- Streaming assistant output
- Research mode toggle stored per chat session
- Thinking mode toggle stored per chat session
- Access denied card with request escalation
- Access request modal and history/status screen
- Artifact preview/download flow
- Backend health indicator

## Tech Stack

- React
- TypeScript
- Vite
- Native fetch-based API helpers
- Local storage for lightweight session UI persistence

## Why This Frontend Is Intentionally Thin

The frontend does not own authorization or orchestration rules.

Those responsibilities stay in the backend so that:

- RBAC cannot be bypassed by client changes
- session ownership is enforced server-side
- the LLM/tool orchestration remains consistent across all clients

The frontend mainly handles:

- user interaction
- display state
- streaming updates
- local UX persistence

## Project Structure

```text
src/
  features/
    auth/             Login page and auth-aware API helpers
    chat/             Chat workspace, sessions, messages, composer, streaming helpers
    access-requests/  Access request modal, history page, API helpers
    artifacts/        Artifact viewer flow
  utils/              Browser helpers such as local storage wrappers
  config.ts           API base URL resolution
  styles.css          Application styling
  App.tsx             App shell and top-level auth/path gating
  main.tsx            React entry point
```

## Prerequisites

- Node.js 18+
- Backend API running locally, typically on `http://localhost:4000`

## Environment

Create a local env file from the example:

```bash
copy .env.example .env
```

Current frontend environment variables:

```bash
VITE_API_URL=http://localhost:4000
```

Notes:

- If `VITE_API_URL` is missing, blank, or the literal string `undefined`, the app falls back to `http://localhost:4000`
- The Vite dev server runs on port `5173`

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Expected local URL:

```text
http://localhost:5173
```

## Production Build

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## App Flow

### 1. Auth Bootstrap

On load, the app:

- checks for a stored token
- calls `/api/auth/me` if present
- either restores the authenticated shell or falls back to login

### 2. Login

The user submits credentials to `/api/auth/login`.

On success:

- token is stored locally
- user state is populated
- chat shell renders

### 3. Chat Workspace

The workspace manages:

- active session selection
- session list loading
- per-session message loading
- prompt submission
- streamed response rendering
- mode toggles

### 4. Session-Scoped Mode Toggles

The frontend stores the following per session:

- active session ID
- research mode
- thinking mode

This allows different conversations to retain different operational modes.

### 5. Access Request UX

When the backend responds with an RBAC denial pattern, the UI can show:

- an access denied card
- a modal to raise a request
- a history/status page for previous requests

### 6. Artifact Viewer

Previewable artifacts can be opened in a dedicated viewer route, and downloadable artifacts can be fetched from the backend.

## Backend Integration

This client expects the backend to expose:

Public/auth bootstrap routes:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /health`

Chat/session routes:

- `POST /chat`
- `POST /chat/stream`
- `GET /sessions`
- `POST /sessions`
- `GET /sessions/:sessionId/messages`
- `PATCH /sessions/:sessionId`
- `DELETE /sessions/:sessionId`

Artifact routes:

- `GET /artifacts`
- `GET /artifacts/:artifactId`
- `GET /artifacts/:artifactId/preview`
- `GET /artifacts/:artifactId/download`

Access request routes:

- `GET /access-requests`
- `POST /access-requests`

All routes except login and health checks require a valid backend-issued JWT.

## Current UX Notes

- The app uses simple path checks in `App.tsx` instead of a full router library
- Session/message bootstrapping is resilient to partial backend failures
- Unauthorized API responses clear the token and return the user to login
- The access-request and artifact flows are built on top of the same authenticated shell model

## Typical Local Workflow

1. Start the backend from the `backend/` folder.
2. Start the frontend with `npm run dev`.
3. Log in with one of the seeded users.
4. Open or create a session.
5. Send prompts and observe streamed responses.
6. Toggle research or thinking mode for the active session if needed.
7. Raise and review access requests when RBAC blocks a query.
8. Open generated artifacts through the viewer flow when returned by the backend.
