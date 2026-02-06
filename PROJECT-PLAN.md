# Pyra Voice Website — Project Plan

**Project:** Interactive AI Voice Website with Animated Avatar
**Client:** Pyramedia
**Date:** 2026-02-06
**Status:** Planning Phase

---

## 📋 Executive Summary

Build a standalone website where visitors can have **live voice conversations** with Pyra AI, featuring an **animated avatar** that moves/reacts during conversation. This will serve as a **live demo** to impress potential clients.

---

## 🎯 Project Goals

1. **Impress visitors** — "Wow, this is the future!"
2. **Demonstrate Pyra capabilities** — Live, not just text
3. **Capture leads** — Convert visitors to meetings
4. **Showcase Pyramedia's AI expertise**

---

## 🔍 Requirements Analysis

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| F1 | Voice input from user (microphone) | Must |
| F2 | Voice output from Pyra (speaker) | Must |
| F3 | Animated avatar that moves while speaking | Must |
| F4 | Real-time conversation (low latency) | Must |
| F5 | Arabic + English support | Must |
| F6 | Conversation memory (remembers context) | Should |
| F7 | Lead capture (name, email, phone) | Should |
| F8 | Calendar booking integration | Could |
| F9 | Live transcript display | Could |
| F10 | Mobile responsive | Must |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NF1 | Response latency | < 1 second |
| NF2 | Voice quality | Natural, clear |
| NF3 | Uptime | 99%+ |
| NF4 | Concurrent users | 10+ |
| NF5 | Browser support | Chrome, Safari, Edge |

---

## 🛠️ Tools & Technologies Analysis

### 1. Voice AI — Gemini Live API

**Status:** ✅ Available (Mohammed has access)

**Specs:**
- Model: `gemini-2.0-flash-live` or `gemini-2.5-pro-live`
- Input: Audio stream (WebSocket)
- Output: Audio stream + text
- Latency: ~300-500ms
- Languages: Arabic ✅, English ✅
- Cost: ~$0.04-0.08 per minute

**API Requirements:**
```
- Google AI API Key ✅ (available)
- WebSocket connection
- Audio format: PCM 16-bit, 16kHz
```

**Verification Needed:**
- [ ] Test Gemini Live API access
- [ ] Verify Arabic voice quality
- [ ] Check rate limits

---

### 2. Animated Avatar Options

#### Option A: Simli.ai ⭐ RECOMMENDED

**What:** Real-time avatar that lip-syncs to audio
**Pros:**
- Specifically built for AI conversations
- Low latency (~200ms)
- Easy API integration
- Custom avatar upload
- Realistic lip-sync

**Cons:**
- Subscription cost (~$50-100/mo)
- Limited customization

**Integration:**
```javascript
// Send audio → Get video stream
simli.streamAudio(audioChunk) → videoFrame
```

---

#### Option B: D-ID

**What:** AI avatar video generation
**Pros:**
- High quality
- Many preset avatars
- Custom avatar from photo

**Cons:**
- Higher latency (not real-time)
- More expensive
- Better for pre-recorded, not live

**Verdict:** ❌ Not ideal for real-time

---

#### Option C: HeyGen

**What:** AI avatar platform
**Pros:**
- Professional quality
- Streaming API available
- Custom avatars

**Cons:**
- Enterprise pricing
- Complex integration

**Verdict:** ⚠️ Possible but expensive

---

#### Option D: LivePortrait (Open Source)

**What:** Open source lip-sync from audio
**Pros:**
- Free
- Self-hosted
- Full control

**Cons:**
- Requires GPU server
- Complex setup
- More latency

**Verdict:** ⚠️ Good for later, not MVP

---

#### Option E: Ready Player Me + Visemes

**What:** 3D avatar with lip-sync
**Pros:**
- Free avatar creation
- Web-based (Three.js)
- Full customization

**Cons:**
- 3D style (not realistic)
- More development work

**Verdict:** ⚠️ Alternative option

---

### 🏆 Avatar Recommendation

**For MVP:** Simli.ai
- Best balance of quality, latency, and ease
- Built for exactly this use case
- Can upgrade later

**Alternative:** Ready Player Me (if want 3D style)

---

### 3. Frontend Framework

#### Option A: Next.js ⭐ RECOMMENDED

**Pros:**
- React-based
- Fast
- Easy deployment (Vercel)
- SSR for SEO

**Cons:**
- Slightly more complex

---

#### Option B: Plain HTML/JS

**Pros:**
- Simple
- No build step

**Cons:**
- Harder to maintain
- No component reuse

---

### 4. Audio Handling

**Web APIs needed:**
- `MediaRecorder` — capture microphone
- `AudioContext` — process audio
- `WebSocket` — stream to server

**Libraries:**
- `recordrtc` — easier recording
- `howler.js` — audio playback
- `socket.io` — WebSocket

---

### 5. Backend / Middleware

#### Option A: n8n Workflow

**Pros:**
- Already familiar
- Visual
- Easy to modify

**Cons:**
- WebSocket handling complex
- May need custom node

---

#### Option B: Node.js Server ⭐ RECOMMENDED

**Pros:**
- Full control
- WebSocket native
- Can host anywhere

**Cons:**
- More code

---

#### Option C: Cloudflare Workers

**Pros:**
- Serverless
- Fast global
- WebSocket support

**Cons:**
- Learning curve

---

### 6. Memory / Database

**Use:** Supabase (already have)

**Tables needed:**
```sql
-- Conversations
CREATE TABLE voice_conversations (
  id UUID PRIMARY KEY,
  session_id TEXT,
  visitor_id TEXT,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  lead_captured BOOLEAN
);

-- Messages
CREATE TABLE voice_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES voice_conversations,
  role TEXT, -- 'user' or 'assistant'
  content TEXT,
  audio_url TEXT,
  timestamp TIMESTAMP
);

-- Leads
CREATE TABLE voice_leads (
  id UUID PRIMARY KEY,
  conversation_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  business_type TEXT,
  captured_at TIMESTAMP
);
```

---

### 7. Hosting

| Component | Platform | Cost |
|-----------|----------|------|
| Frontend | Vercel | Free |
| Backend | Railway / Render | ~$5-20/mo |
| Database | Supabase | Free |
| Domain | pyramedia subdomain | Free |

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                    (Next.js on Vercel)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Microphone │  │   Avatar    │  │  Transcript │             │
│  │   Input     │  │   (Simli)   │  │   Display   │             │
│  └──────┬──────┘  └──────▲──────┘  └──────▲──────┘             │
│         │                │                │                      │
│         │         ┌──────┴────────────────┴──────┐              │
│         │         │        WebSocket             │              │
│         └─────────┤        Connection            ├──────────────│
│                   └──────────────┬───────────────┘              │
└──────────────────────────────────┼──────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                         BACKEND                                   │
│                   (Node.js on Railway)                           │
│                                                                   │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐             │
│  │  WebSocket │───▶│   Gemini   │───▶│   Simli    │             │
│  │   Server   │    │  Live API  │    │    API     │             │
│  └────────────┘    └────────────┘    └────────────┘             │
│         │                │                                        │
│         ▼                ▼                                        │
│  ┌─────────────────────────────────┐                             │
│  │         Supabase                │                             │
│  │   (Memory + Leads + Logs)       │                             │
│  └─────────────────────────────────┘                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Conversation Flow

```
1. Visitor opens website
         │
         ▼
2. Sees Pyra avatar + "Talk to Pyra" button
         │
         ▼
3. Clicks button → Microphone permission
         │
         ▼
4. Speaks: "Hi, I want to know about your AI"
         │
         ▼
5. Audio streamed → Backend → Gemini Live
         │
         ▼
6. Gemini responds (text + audio)
         │
         ▼
7. Audio → Simli → Avatar lip-syncs
         │
         ▼
8. Pyra speaks: "You're talking to Pyra right now! What's your business?"
         │
         ▼
9. Loop continues...
         │
         ▼
10. Lead captured → Supabase → Email to team
```

---

## 📅 Project Timeline

### Phase 1: Setup & Validation (Day 1-2)

| Task | Duration | Status |
|------|----------|--------|
| Verify Gemini Live API access | 2h | ⬜ |
| Test Gemini Live with Arabic | 2h | ⬜ |
| Create Simli account & test | 2h | ⬜ |
| Setup project repository | 1h | ⬜ |
| Setup Supabase tables | 1h | ⬜ |

### Phase 2: Backend Development (Day 2-3)

| Task | Duration | Status |
|------|----------|--------|
| Node.js WebSocket server | 3h | ⬜ |
| Gemini Live integration | 3h | ⬜ |
| Simli API integration | 2h | ⬜ |
| Memory/Supabase integration | 2h | ⬜ |
| Error handling | 2h | ⬜ |

### Phase 3: Frontend Development (Day 3-4)

| Task | Duration | Status |
|------|----------|--------|
| Next.js project setup | 1h | ⬜ |
| Landing page UI | 3h | ⬜ |
| Audio capture component | 2h | ⬜ |
| Avatar display component | 2h | ⬜ |
| Transcript display | 1h | ⬜ |
| Lead capture form | 2h | ⬜ |
| Mobile responsive | 2h | ⬜ |

### Phase 4: Integration & Testing (Day 4-5)

| Task | Duration | Status |
|------|----------|--------|
| Connect frontend ↔ backend | 2h | ⬜ |
| End-to-end testing | 3h | ⬜ |
| Latency optimization | 2h | ⬜ |
| Arabic voice testing | 2h | ⬜ |
| Bug fixes | 3h | ⬜ |

### Phase 5: Polish & Deploy (Day 5-6)

| Task | Duration | Status |
|------|----------|--------|
| UI polish & animations | 3h | ⬜ |
| Loading states | 1h | ⬜ |
| Error messages | 1h | ⬜ |
| Deploy to production | 2h | ⬜ |
| Domain setup | 1h | ⬜ |
| Final testing | 2h | ⬜ |

### Total Estimated Time: 5-6 days

---

## 💰 Cost Estimation

### One-time Costs

| Item | Cost |
|------|------|
| Development | Internal |
| Domain (if new) | ~$15/year |

### Monthly Recurring

| Service | Cost/month | Notes |
|---------|------------|-------|
| Gemini API | ~$20-50 | Based on usage |
| Simli.ai | ~$50-100 | Avatar streaming |
| Vercel | $0 | Free tier |
| Railway/Render | $5-20 | Backend hosting |
| Supabase | $0-25 | Free tier likely enough |
| **Total** | **~$75-195/month** | |

### Cost per Conversation

```
~2 min average conversation
Gemini: ~$0.08-0.16
Simli: ~$0.10-0.20
Total: ~$0.18-0.36 per conversation
```

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gemini Live latency too high | High | Test early, have fallback (GPT-4 Realtime) |
| Simli quality not good enough | Medium | Test alternatives (HeyGen, custom) |
| Arabic voice quality poor | High | Test thoroughly, tune settings |
| Browser compatibility issues | Medium | Test all major browsers early |
| High costs at scale | Medium | Set usage limits, optimize |
| User microphone issues | Medium | Clear instructions, fallback to text |

---

## ✅ Pre-Development Checklist

### API Access Verification

- [ ] Gemini Live API — test connection
- [ ] Gemini Live — test Arabic voice
- [x] Simli.ai — create account ✅
- [ ] Simli.ai — test API
- [x] Supabase — verify access ✅

**Credentials saved:** `/home/node/.openclaw/credentials/pyra-voice.env`

### Asset Requirements

- [ ] Pyra avatar image/video (for Simli)
- [ ] Pyramedia logo
- [ ] Brand colors (from brand kit)
- [ ] Favicon

### Account Setup

- [ ] Simli.ai account
- [ ] Vercel account (if not existing)
- [ ] Railway account (if not existing)

---

## 🎨 UI/UX Design Brief

### Landing Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [Pyramedia Logo]                    [العربية] [English]     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌─────────────────┐                       │
│                    │                 │                       │
│                    │   PYRA AVATAR   │                       │
│                    │    (Animated)   │                       │
│                    │                 │                       │
│                    └─────────────────┘                       │
│                                                              │
│              "مرحباً! أنا بايرا، مساعدتك الذكية"              │
│                                                              │
│                 [ 🎤 تحدث مع بايرا ]                         │
│                                                              │
│     ┌────────────────────────────────────────────┐          │
│     │                                            │          │
│     │            Transcript Area                 │          │
│     │     (Shows conversation text live)         │          │
│     │                                            │          │
│     └────────────────────────────────────────────┘          │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│           Powered by Pyramedia | pyramedia.ai                │
└──────────────────────────────────────────────────────────────┘
```

### Color Scheme (from Brand Kit)

```css
--primary: #your-brand-color;
--secondary: #your-secondary;
--background: #0a0a0a; /* Dark, tech feel */
--text: #ffffff;
--accent: #gradient-or-glow;
```

### States

1. **Idle** — Avatar breathing/blinking, "Click to talk"
2. **Listening** — Microphone active, waveform animation
3. **Processing** — Brief thinking indicator
4. **Speaking** — Avatar lip-syncing, audio playing
5. **Error** — Friendly error message

---

## 📄 Deliverables

1. ✅ Project Plan (this document)
2. ⬜ Voice System Prompt (done: pyra-voice-prompt.md)
3. ⬜ Backend Server Code
4. ⬜ Frontend Website Code
5. ⬜ Database Schema
6. ⬜ Deployment Documentation
7. ⬜ Testing Report
8. ⬜ Live Website URL

---

## 🚀 Next Steps

1. **Review this plan** — Any changes needed?
2. **Verify APIs** — Test Gemini Live & Simli access
3. **Prepare assets** — Pyra avatar image
4. **Start Phase 1** — Setup & Validation

---

*Document Version: 1.0*
*Last Updated: 2026-02-06*
