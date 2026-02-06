# Pyra Voice Website — Technical Analysis

**Based on Official Google Documentation**
**Date:** 2026-02-06

---

## 🎯 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Microphone  │    │   Avatar    │    │   Speaker   │         │
│  │  (Input)    │    │   (Simli)   │    │  (Output)   │         │
│  └──────┬──────┘    └──────▲──────┘    └──────▲──────┘         │
│         │                  │                  │                  │
│         │           ┌──────┴──────────────────┘                  │
│         │           │                                            │
│  ┌──────▼───────────▼──────────────────────────────────────┐   │
│  │              Frontend (Next.js)                          │   │
│  │  - MediaRecorder API (capture mic)                       │   │
│  │  - WebSocket to Backend                                  │   │
│  │  - Simli SDK (avatar rendering)                          │   │
│  │  - AudioContext (playback)                               │   │
│  └──────────────────────┬───────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │ WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js)                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  WebSocket Server                         │   │
│  │  - Receives PCM audio from browser                        │   │
│  │  - Forwards to Gemini Live API                            │   │
│  │  - Receives audio response                                │   │
│  │  - Sends to Simli for lip-sync                            │   │
│  │  - Returns video + audio to browser                       │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                        │
│           ┌─────────────┼─────────────┐                         │
│           ▼             ▼             ▼                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │   Gemini    │ │   Simli     │ │  Supabase   │               │
│  │  Live API   │ │    API      │ │  (Memory)   │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Gemini Live API Specifications

### Model
```
Model: gemini-2.5-flash-native-audio-latest
API Version: v1beta
```

### WebSocket Endpoint
```
wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key={API_KEY}
```

### Audio Format

| Direction | Format | Sample Rate | Channels | Bit Depth |
|-----------|--------|-------------|----------|-----------|
| **Input** | PCM | 16,000 Hz | Mono (1) | 16-bit |
| **Output** | PCM | 24,000 Hz | Mono (1) | 16-bit |

### Message Protocol

#### 1. Setup Message (First Message)
```json
{
  "setup": {
    "model": "models/gemini-2.5-flash-native-audio-latest",
    "generationConfig": {
      "responseModalities": ["AUDIO"]
    },
    "systemInstruction": {
      "parts": [{
        "text": "You are Pyra, an AI assistant from Pyramedia..."
      }]
    }
  }
}
```

#### 2. Send Audio (Streaming)
```json
{
  "realtime_input": {
    "media_chunks": [{
      "data": "<base64_encoded_pcm_16bit_16khz>",
      "mime_type": "audio/pcm"
    }]
  }
}
```

#### 3. Receive Audio Response
```json
{
  "serverContent": {
    "modelTurn": {
      "parts": [{
        "inlineData": {
          "data": "<base64_encoded_pcm_16bit_24khz>",
          "mimeType": "audio/pcm"
        }
      }]
    },
    "turnComplete": false
  }
}
```

#### 4. Turn Complete Signal
```json
{
  "serverContent": {
    "turnComplete": true
  }
}
```

---

## 🎭 Simli Avatar Integration

### API Flow
```
1. Start session → Get session_token
2. Stream audio → Get video frames
3. Display video in browser
```

### Simli Endpoints

#### Start Session
```http
POST https://api.simli.ai/startAudioToVideoSession
Content-Type: application/json

{
  "faceId": "0c2b8b04-5274-41f1-a21c-d5c98322efa9",
  "apiKey": "4mhe7frjc5bkyifpsoppx8",
  "syncAudio": true
}

Response:
{
  "session_token": "..."
}
```

#### Stream Audio (WebRTC/WebSocket)
- Send PCM audio chunks
- Receive video frames with lip-sync

### Audio Requirements for Simli
- Format: PCM or WAV
- Sample Rate: 16kHz or 24kHz
- Must convert Gemini output (24kHz) if needed

---

## 🌐 Frontend Architecture

### Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Audio:** Web Audio API + MediaRecorder
- **WebSocket:** Native WebSocket API
- **Avatar:** Simli React SDK
- **Styling:** Tailwind CSS

### Key Components

```
/app
├── page.tsx              # Main page
├── components/
│   ├── VoiceButton.tsx   # Push-to-talk button
│   ├── Avatar.tsx        # Simli avatar display
│   ├── Transcript.tsx    # Live transcript
│   └── WaveForm.tsx      # Audio visualizer
├── hooks/
│   ├── useAudioCapture.ts    # Mic capture
│   ├── useWebSocket.ts       # WS connection
│   └── useAudioPlayback.ts   # Speaker output
└── lib/
    ├── audioUtils.ts     # PCM conversion
    └── simliClient.ts    # Simli SDK wrapper
```

### Audio Capture (Browser)
```javascript
// Capture mic as PCM 16-bit, 16kHz
const audioContext = new AudioContext({ sampleRate: 16000 });
const mediaStream = await navigator.mediaDevices.getUserMedia({ 
  audio: {
    channelCount: 1,
    sampleRate: 16000,
    echoCancellation: true,
    noiseSuppression: true
  }
});

// Process audio in chunks
const processor = audioContext.createScriptProcessor(512, 1, 1);
processor.onaudioprocess = (e) => {
  const pcmData = convertFloat32ToPCM16(e.inputBuffer.getChannelData(0));
  websocket.send(pcmData);
};
```

### Audio Playback (Browser)
```javascript
// Play PCM 16-bit, 24kHz
const playbackContext = new AudioContext({ sampleRate: 24000 });

function playPCM(base64Data) {
  const pcmData = base64ToArrayBuffer(base64Data);
  const float32 = convertPCM16ToFloat32(pcmData);
  
  const buffer = playbackContext.createBuffer(1, float32.length, 24000);
  buffer.getChannelData(0).set(float32);
  
  const source = playbackContext.createBufferSource();
  source.buffer = buffer;
  source.connect(playbackContext.destination);
  source.start();
}
```

---

## ⚙️ Backend Architecture

### Tech Stack
- **Runtime:** Node.js 20+
- **WebSocket:** `ws` library
- **HTTP:** Express.js (optional, for health checks)

### Server Structure
```
/server
├── index.ts              # Entry point
├── websocket/
│   ├── handler.ts        # Client connection handler
│   └── gemini.ts         # Gemini WS client
├── simli/
│   └── client.ts         # Simli API client
├── memory/
│   └── supabase.ts       # Conversation storage
└── utils/
    └── audio.ts          # Audio conversion utils
```

### WebSocket Flow
```javascript
// Server-side WebSocket handler

// 1. Client connects
wss.on('connection', async (clientWs) => {
  
  // 2. Connect to Gemini
  const geminiWs = new WebSocket(GEMINI_URI);
  
  // 3. Send setup to Gemini
  geminiWs.send(JSON.stringify({
    setup: {
      model: "models/gemini-2.5-flash-native-audio-latest",
      systemInstruction: { parts: [{ text: PYRA_PROMPT }] }
    }
  }));
  
  // 4. Start Simli session
  const simliSession = await startSimliSession();
  
  // 5. Forward client audio to Gemini
  clientWs.on('message', (audioData) => {
    geminiWs.send(JSON.stringify({
      realtime_input: {
        media_chunks: [{
          data: audioData.toString('base64'),
          mime_type: "audio/pcm"
        }]
      }
    }));
  });
  
  // 6. Forward Gemini audio to Simli, then to client
  geminiWs.on('message', async (data) => {
    const response = JSON.parse(data);
    if (response.serverContent?.modelTurn?.parts) {
      const audioData = response.serverContent.modelTurn.parts[0].inlineData.data;
      
      // Send to Simli for lip-sync
      const videoFrame = await simliSession.processAudio(audioData);
      
      // Send audio + video to client
      clientWs.send(JSON.stringify({
        audio: audioData,
        video: videoFrame
      }));
    }
  });
});
```

---

## 🗄️ Database Schema (Supabase)

```sql
-- Conversations table
CREATE TABLE voice_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  visitor_id TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_turns INTEGER DEFAULT 0,
  metadata JSONB
);

-- Messages table  
CREATE TABLE voice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES voice_conversations(id),
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT,
  audio_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads table
CREATE TABLE voice_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES voice_conversations(id),
  name TEXT,
  email TEXT,
  phone TEXT,
  business_type TEXT,
  interest TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversations_session ON voice_conversations(session_id);
CREATE INDEX idx_messages_conversation ON voice_messages(conversation_id);
```

---

## 📦 Required Dependencies

### Backend (Node.js)
```json
{
  "dependencies": {
    "ws": "^8.16.0",
    "express": "^4.18.2",
    "@supabase/supabase-js": "^2.39.0",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.0"
  }
}
```

### Frontend (Next.js)
```json
{
  "dependencies": {
    "next": "^14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@simli/client": "latest",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## 🔐 Environment Variables

### Backend (.env)
```env
# Gemini
GOOGLE_API_KEY=AIzaSyB-kGuHPYMRvEmmy9Y8mNGskVE5XEvEvtE

# Simli
SIMLI_API_KEY=4mhe7frjc5bkyifpsoppx8
SIMLI_FACE_ID=0c2b8b04-5274-41f1-a21c-d5c98322efa9

# Supabase
SUPABASE_URL=https://elitelifedb.pyramedia.cloud
SUPABASE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# Server
PORT=3001
NODE_ENV=production
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_WS_URL=wss://pyra-voice.pyramedia.ai/ws
```

---

## 🚀 Deployment Architecture

### Coolify on Hostinger VPS
```
┌─────────────────────────────────────────┐
│         Hostinger VPS (Coolify)         │
│         72.61.148.81                    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Nginx (Reverse Proxy)       │   │
│  │     - SSL/TLS termination       │   │
│  │     - WebSocket upgrade         │   │
│  └─────────────┬───────────────────┘   │
│                │                        │
│       ┌────────┴────────┐              │
│       ▼                 ▼              │
│  ┌─────────┐      ┌─────────┐         │
│  │Frontend │      │ Backend │         │
│  │ :3000   │      │  :3001  │         │
│  │(Next.js)│      │(Node.js)│         │
│  └─────────┘      └─────────┘         │
│                                         │
└─────────────────────────────────────────┘
```

### Domain Setup
- Frontend: `pyra.pyramedia.ai` or `voice.pyramedia.ai`
- Backend WS: `wss://pyra.pyramedia.ai/ws`

---

## ⚡ Performance Considerations

### Latency Budget (Target: < 500ms)
| Component | Target | Notes |
|-----------|--------|-------|
| Browser → Server | 50ms | WebSocket |
| Server → Gemini | 100ms | Google infra |
| Gemini Processing | 200ms | AI inference |
| Gemini → Server | 100ms | Audio chunks |
| Server → Simli | 50ms | Video generation |
| Total | ~500ms | Acceptable for conversation |

### Audio Buffer Strategy
- Input buffer: 512 samples (32ms at 16kHz)
- Output queue: Store chunks, play continuously
- Handle interruptions: Clear queue on turn_complete

---

## ✅ Verified Components

| Component | Status | Notes |
|-----------|--------|-------|
| Gemini API Key | ✅ | Working |
| Gemini WebSocket | ✅ | Connects successfully |
| Gemini Text Response | ✅ | Returns Arabic |
| Simli API Key | ✅ | Working |
| Simli Session | ✅ | Token generated |
| Simli Face ID | ✅ | Avatar ready |
| Hostinger VPS | ✅ | Coolify installed |
| Supabase | ✅ | Available |

---

## 📋 Implementation Checklist

### Phase 1: Proof of Concept
- [ ] Test Gemini Live with real audio input
- [ ] Test Simli video generation
- [ ] Verify audio format conversions

### Phase 2: Backend
- [ ] WebSocket server setup
- [ ] Gemini connection manager
- [ ] Simli integration
- [ ] Supabase memory

### Phase 3: Frontend
- [ ] Audio capture component
- [ ] Avatar display component
- [ ] WebSocket client
- [ ] UI/UX design

### Phase 4: Integration
- [ ] End-to-end testing
- [ ] Latency optimization
- [ ] Error handling

### Phase 5: Deployment
- [ ] Coolify setup
- [ ] Domain configuration
- [ ] SSL certificates
- [ ] Production testing

---

*Document Version: 1.0*
*Last Updated: 2026-02-06*
