# Path of Destiny (운명의 길) - TRPG App

Real-time multiplayer fantasy TRPG built with React + Vite frontend and an Express + Socket.io backend, with Gemini AI integration for the GM.

## Stack
- Node.js 20
- Vite 6 + React 19 + Tailwind v4 (frontend, built to `dist/`)
- Express 4 + Socket.io 4 (backend in `server.ts`, run via `tsx`)
- @google/genai for Gemini API

## Replit Setup
- Single workflow "Start application": `npm run build && npm start` on port 5000 (webview).
- Server binds `0.0.0.0:5000` and serves the built `dist/` plus `/api/*` and Socket.io.
- Optional secret: `GEMINI_API_KEY` for the `/api/gm` endpoint.

## Deployment
- Target: `vm` (persistent process for Socket.io / in-memory rooms).
- Build: `npm run build`
- Run: `npm start`
