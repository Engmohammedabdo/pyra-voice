const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const GEMINI_MODEL = 'models/gemini-2.5-flash-native-audio-latest';

// Load system prompt
let SYSTEM_PROMPT;
try {
  SYSTEM_PROMPT = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', '..', '..', 'pyra-voice-prompt.md'),
    'utf-8'
  );
} catch {
  // Fallback: try from workspace root
  try {
    SYSTEM_PROMPT = fs.readFileSync('/home/node/openclaw/pyra-voice-prompt.md', 'utf-8');
  } catch {
    SYSTEM_PROMPT = 'You are Pyra, a friendly AI voice assistant for Pyramedia, a Dubai-based marketing and AI company.';
    console.warn('[Gemini] Could not load pyra-voice-prompt.md, using fallback prompt');
  }
}

class GeminiLiveClient {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.ws = null;
    this.isConnected = false;
    this.isSetupComplete = false;
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
        reject(new Error('GOOGLE_API_KEY not configured'));
        return;
      }

      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        console.log(`[Gemini][${this.sessionId}] WebSocket connected`);
        this.isConnected = true;
        this._sendSetup();
      });

      this.ws.on('message', (data) => {
        this._handleMessage(data);
      });

      this.ws.on('close', (code, reason) => {
        console.log(`[Gemini][${this.sessionId}] WebSocket closed: ${code} ${reason}`);
        this.isConnected = false;
        this.isSetupComplete = false;
      });

      this.ws.on('error', (err) => {
        console.error(`[Gemini][${this.sessionId}] WebSocket error:`, err.message);
        if (this.onError) this.onError(err.message);
        if (!this.isConnected) reject(err);
      });

      // Resolve once setup acknowledgment comes back
      const setupTimeout = setTimeout(() => {
        if (!this.isSetupComplete) {
          reject(new Error('Gemini setup timeout'));
        }
      }, 15000);

      this._setupResolve = () => {
        clearTimeout(setupTimeout);
        resolve();
      };
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

  _handleMessage(rawData) {
    try {
      const message = JSON.parse(rawData.toString());

      // Setup complete acknowledgment
      if (message.setupComplete) {
        console.log(`[Gemini][${this.sessionId}] Setup complete`);
        this.isSetupComplete = true;
        if (this._setupResolve) {
          this._setupResolve();
          this._setupResolve = null;
        }
        if (this.onReady) this.onReady();
        return;
      }

      // Server content (audio response)
      if (message.serverContent) {
        const { modelTurn, turnComplete } = message.serverContent;

        if (modelTurn && modelTurn.parts) {
          for (const part of modelTurn.parts) {
            // Audio data
            if (part.inlineData) {
              if (this.onAudio) {
                this.onAudio(part.inlineData.data);
              }
            }
            // Text transcript (if available)
            if (part.text) {
              if (this.onTranscript) {
                this.onTranscript(part.text);
              }
            }
          }
        }

        if (turnComplete) {
          if (this.onTurnComplete) this.onTurnComplete();
        }
      }

      // Tool calls or other messages can be handled here in the future
    } catch (err) {
      console.error(`[Gemini][${this.sessionId}] Parse error:`, err.message);
    }
  }

  sendAudio(base64PcmData) {
    if (!this.isConnected || !this.isSetupComplete) {
      console.warn(`[Gemini][${this.sessionId}] Not ready, dropping audio chunk`);
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
