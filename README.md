# Pyra Voice — AI Voice Assistant Website

Interactive voice AI website with animated avatar. Visitors talk live with Pyra, Pyramedia's AI assistant.

## Architecture

```
Browser (Next.js) ←→ Backend (Node.js/WS) ←→ Gemini Live API
                                            ←→ Simli.ai Avatar
                                            ←→ Supabase (Storage)
```

## Stack

- **Frontend:** Next.js 14, Tailwind CSS, Web Audio API
- **Backend:** Node.js, WebSocket (`ws`), Express
- **AI Voice:** Google Gemini Live (native audio)
- **Avatar:** Simli.ai / Fallback animated avatar
- **Database:** Supabase (conversations + leads)

## Quick Start (Local)

### Backend
```bash
cd server
cp .env.example .env  # Fill in your API keys
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Deploy (Docker / Coolify)

```bash
# Set environment variables in Coolify or .env
docker compose up -d
```

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_API_KEY` | Google Gemini API key |
| `SIMLI_API_KEY` | Simli.ai API key |
| `SIMLI_FACE_ID` | Simli avatar face ID |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `DOMAIN` | Production domain (e.g. voice.pyramedia.ai) |

## Ports

| Service | Port |
|---------|------|
| Frontend | 3000 |
| Backend | 3001 |
| Backend WS | 3001 (`/ws`) |

---

Built by [Pyramedia](https://pyramedia.ai)
