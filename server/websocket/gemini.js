const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const GEMINI_MODEL = 'models/gemini-2.5-flash-native-audio-latest';

// Load system prompt - try multiple locations for Docker + local dev
const PROMPT_PATHS = [
  path.join(__dirname, '..', '..', 'pyra-voice-prompt.md'),
  path.join(__dirname, '..', '..', 'prompt.md'),
];

let SYSTEM_PROMPT = '';
for (const p of PROMPT_PATHS) {
  try {
    SYSTEM_PROMPT = fs.readFileSync(p, 'utf-8');
    console.log(`[Gemini] Loaded system prompt from ${p}`);
    break;
  } catch { /* try next */ }
}
if (!SYSTEM_PROMPT) {
  SYSTEM_PROMPT = 'You are Pyra, a friendly AI voice assistant for Pyramedia, a Dubai-based marketing and AI company. You speak Arabic and English. Keep responses short (1-2 sentences) since this is voice.';
  console.warn('[Gemini] Could not load pyra-voice-prompt.md, using fallback prompt');
}

const MAX_AUDIO_CHUNK_SIZE = 1024 * 1024; // 1MB max per chunk

class GeminiLiveClient {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.ws = null;
    this.isConnected = false;
    this.isSetupComplete = false;
    this._setupTimeout = null;
    this._settled = false;
    this.onAudio = null;
    this.onTranscript = null;
    this.onTurnComplete = null;
    this.onError = null;
    this.onReady = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        console.error(`[Gemini][${this.sessionId}] GOOGLE_API_KEY is not set in environment variables`);
        reject(new Error('GOOGLE_API_KEY not configured'));
        return;
      }

      console.log(`[Gemini][${this.sessionId}] Connecting with API key: ${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`);

      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

      this.ws = new WebSocket(url);

      const settle = (fn, value) => {
        if (this._settled) return;
        this._settled = true;
        clearTimeout(this._setupTimeout);
        fn(value);
      };

      this.ws.on('open', () => {
        console.log(`[Gemini][${this.sessionId}] WebSocket connected`);
        this.isConnected = true;
        this._sendSetup();
      });

      this.ws.on('message', (data) => {
        this._handleMessage(data, (result) => settle(resolve, result));
      });

      this.ws.on('close', (code, reason) => {
        console.log(`[Gemini][${this.sessionId}] WebSocket closed: ${code} ${reason}`);
        this.isConnected = false;
        this.isSetupComplete = false;
        settle(reject, new Error(`Gemini WebSocket closed: ${code}`));
      });

      this.ws.on('error', (err) => {
        console.error(`[Gemini][${this.sessionId}] WebSocket error:`, err.message);
        if (this.onError) this.onError(err.message);
        settle(reject, err);
      });

      this._setupTimeout = setTimeout(() => {
        settle(reject, new Error('Gemini setup timeout (15s)'));
      }, 15000);
    });
  }

  _sendSetup() {
    const setupMessage = {
      setup: {
        model: GEMINI_MODEL,
        generationConfig: {
          responseModalities: ['AUDIO'],
        },
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
      },
    };

    this.ws.send(JSON.stringify(setupMessage));
    console.log(`[Gemini][${this.sessionId}] Setup message sent`);
  }

  _handleMessage(rawData, onSetupComplete) {
    try {
      const message = JSON.parse(rawData.toString());

      if (message.setupComplete) {
        console.log(`[Gemini][${this.sessionId}] Setup complete`);
        this.isSetupComplete = true;
        if (onSetupComplete) onSetupComplete();
        if (this.onReady) this.onReady();
        return;
      }

      if (message.serverContent) {
        const { modelTurn, turnComplete } = message.serverContent;

        if (modelTurn && modelTurn.parts) {
          for (const part of modelTurn.parts) {
            if (part.inlineData && this.onAudio) {
              this.onAudio(part.inlineData.data);
            }
            if (part.text && this.onTranscript) {
              this.onTranscript(part.text);
            }
          }
        }

        if (turnComplete && this.onTurnComplete) {
          this.onTurnComplete();
        }
      }
    } catch (err) {
      console.error(`[Gemini][${this.sessionId}] Parse error:`, err.message);
    }
  }

  sendAudio(base64PcmData) {
    if (!this.isConnected || !this.isSetupComplete) {
      return;
    }

    if (typeof base64PcmData !== 'string' || base64PcmData.length > MAX_AUDIO_CHUNK_SIZE) {
      console.warn(`[Gemini][${this.sessionId}] Invalid audio chunk, dropping`);
      return;
    }

    const message = {
      realtime_input: {
        media_chunks: [
          {
            data: base64PcmData,
            mime_type: 'audio/pcm',
          },
        ],
      },
    };

    try {
      this.ws.send(JSON.stringify(message));
    } catch (err) {
      console.error(`[Gemini][${this.sessionId}] Send error:`, err.message);
    }
  }

  close() {
    clearTimeout(this._setupTimeout);
    if (this.ws) {
      console.log(`[Gemini][${this.sessionId}] Closing connection`);
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.isSetupComplete = false;
    }
  }
}

module.exports = { GeminiLiveClient };
