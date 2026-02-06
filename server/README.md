# Pyra Voice Server

WebSocket server for Pyra Voice AI — connects browser clients to Gemini Live API for real-time voice conversations with Simli.ai avatar integration.

## Quick Start

```bash
cp .env.example .env  # Configure your API keys
npm install
npm start
```

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/simli/session` | POST | Get Simli avatar session token |
| `/ws` | WebSocket | Voice conversation |

## WebSocket Protocol

### Client → Server
- `{ type: "start" }` — Start conversation (connects to Gemini)
- `{ type: "audio", data: "<base64_pcm_16khz>" }` — Send audio chunk
- `{ type: "end" }` — End conversation

### Server → Client
- `{ type: "session", sessionId: "..." }` — Session assigned
- `{ type: "ready" }` — Gemini connected, ready for audio
- `{ type: "audio", data: "<base64_pcm_24khz>" }` — AI audio response
- `{ type: "transcript", text: "..." }` — Text transcript
- `{ type: "turn_complete" }` — AI finished speaking
- `{ type: "error", message: "..." }` — Error occurred

## Audio Formats
- **Input:** PCM 16-bit, 16kHz, mono
- **Output:** PCM 16-bit, 24kHz, mono

## Docker

```bash
docker build -t pyra-voice-server .
docker run -p 3001:3001 --env-file .env pyra-voice-server
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_API_KEY` | Google AI API key for Gemini |
| `SIMLI_API_KEY` | Simli.ai API key |
| `SIMLI_FACE_ID` | Simli avatar face ID |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `PORT` | Server port (default: 3001) |
| `CORS_ORIGIN` | Allowed CORS origin (default: *) |
