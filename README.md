# Pyra Voice — AI Voice Assistant

Real-time voice AI assistant website for **Pyramedia**. Visitors talk live with Pyra using their microphone, and hear AI responses instantly — powered by Google Gemini Live API.

## Architecture

```
Browser (Mic/Speaker)
        |
   WebSocket (wss://)
        |
  Combined Server (:3000)
   ├── Next.js 14 (Frontend)
   └── Express + WS (Backend :3001)
          ├── Google Gemini Live API (Voice AI)
          ├── Simli.ai (Avatar - optional)
          └── Supabase (Storage - optional)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Audio | Web Audio API, AudioWorklet (PCM 16kHz/24kHz) |
| Backend | Node.js 22, Express, WebSocket (`ws`) |
| AI | Google Gemini 2.5 Flash (native audio, bidirectional) |
| Avatar | Simli.ai (optional) + Animated fallback |
| Database | Supabase PostgreSQL (optional) |
| Deploy | Docker multi-stage, Coolify-ready |

## Features

- Real-time voice conversation with AI
- Bilingual support (Arabic + English) with RTL
- Animated avatar with state indicators (idle, listening, speaking)
- Live waveform visualization
- Particle background animation
- Conversation transcript display
- AudioWorklet for off-thread audio processing (ScriptProcessor fallback)
- Health-check based server startup (no race conditions)
- Multi-stage Docker build with non-root user
- Coolify one-click deployment ready

## Quick Start

### Prerequisites

- Node.js 22+
- A [Google Gemini API key](https://aistudio.google.com/apikey)

### Setup

```bash
# Clone
git clone https://github.com/Engmohammedabdo/pyra-voice.git
cd pyra-voice

# Install
npm install

# Configure
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY
```

### Development

Run both frontend and backend:

```bash
# Terminal 1 - Backend (port 3001)
npm run server

# Terminal 2 - Frontend (port 3000)
npm run dev
```

> In dev mode, the frontend auto-detects the WebSocket URL from the browser's host.

### Production (Local)

```bash
npm run build
npm start
```

This starts the combined server on port 3000 — frontend + backend + WebSocket proxy, all on one port.

## Deploy on Coolify

### Option 1: Docker (Recommended)

1. Create new project in Coolify
2. Select **Docker** as build method
3. Connect your GitHub repo
4. Set **Port** to `3000`
5. Set **Health Check Path** to `/health`
6. Add environment variables (see below)
7. Deploy

### Option 2: Docker Compose

```bash
docker compose up -d
```

### Option 3: Nixpacks / Raw Dockerfile

Coolify will auto-detect the `Dockerfile` in the repo root.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Google Gemini API key |
| `PORT` | No | Combined server port (default: `3000`) |
| `BACKEND_PORT` | No | Internal backend port (default: `3001`) |
| `CORS_ORIGIN` | No | Allowed origins (default: `*`) |
| `SIMLI_API_KEY` | No | Simli.ai API key (avatar) |
| `SIMLI_FACE_ID` | No | Simli avatar face ID |
| `SUPABASE_URL` | No | Supabase project URL |
| `SUPABASE_ANON_KEY` | No | Supabase anonymous key |
| `SUPABASE_SERVICE_KEY` | No | Supabase service role key |

> Only `GOOGLE_API_KEY` is required. Everything else is optional with sensible defaults.

## Project Structure

```
pyra-voice/
├── app/                     # Next.js pages
│   ├── layout.tsx           # Root layout + fonts
│   ├── page.tsx             # Main page
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── Avatar.tsx           # Animated avatar
│   ├── Background.tsx       # Particle background
│   ├── Header.tsx           # Header + language toggle
│   ├── Transcript.tsx       # Live conversation display
│   ├── VoiceButton.tsx      # Mic control button
│   └── WaveForm.tsx         # Audio visualizer
├── hooks/                   # Custom React hooks
│   ├── useVoiceSession.ts   # Session orchestration
│   ├── useAudioCapture.ts   # Mic input (AudioWorklet)
│   └── useAudioPlayback.ts  # Speaker output
├── lib/
│   └── constants.ts         # URLs, types
├── server/                  # Node.js backend
│   ├── index.js             # Express + WebSocket server
│   ├── websocket/
│   │   ├── handler.js       # Client connection manager
│   │   └── gemini.js        # Gemini Live API client
│   ├── simli/client.js      # Simli.ai integration
│   ├── memory/supabase.js   # Database storage
│   └── utils/audio.js       # Audio utilities
├── server.js                # Combined server (frontend + backend)
├── Dockerfile               # Multi-stage production build
├── docker-compose.yml       # Docker Compose config
├── .env.example             # Environment template
└── pyra-voice-prompt.md     # AI system prompt
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Server health check |
| POST | `/api/simli/session` | Create Simli avatar session |
| WS | `/ws` | WebSocket for voice streaming |

## WebSocket Protocol

| Type | Direction | Description |
|------|-----------|-------------|
| `start` | Client -> Server | Begin conversation |
| `session` | Server -> Client | Session ID |
| `ready` | Server -> Client | Ready for audio |
| `audio` | Bidirectional | PCM audio chunks (base64) |
| `transcript` | Server -> Client | AI response text |
| `turn_complete` | Server -> Client | AI finished speaking |
| `end` | Client -> Server | End conversation |
| `ended` | Server -> Client | Conversation closed |
| `error` | Server -> Client | Error message |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server (port 3000) |
| `npm run server` | Backend only (port 3001) |
| `npm run build` | Build Next.js for production |
| `npm start` | Combined server (production) |

---

Built by [Pyramedia](https://pyramedia.ai)
