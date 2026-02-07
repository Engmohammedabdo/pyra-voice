const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const GEMINI_MODEL = 'models/gemini-2.5-flash-native-audio-preview-12-2025';

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
    this._audioChunksSent = 0;
    this._audioChunksReceived = 0;
    this._messagesReceived = 0;
    this.onAudio = null;
    this.onTranscript = null;
    this.onTurnComplete = null;
    this.onError = null;
    this.onReady = null;
    this.onFunctionCall = null;
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
      console.log(`[Gemini][${this.sessionId}] Using model: ${GEMINI_MODEL}`);

      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

      this.ws = new WebSocket(url);

      const settle = (fn, value) => {
        if (this._settled) return;
        this._settled = true;
        clearTimeout(this._setupTimeout);
        fn(value);
      };

      this.ws.on('open', () => {
        console.log(`[Gemini][${this.sessionId}] WebSocket connected to Google`);
        this.isConnected = true;
        this._sendSetup();
      });

      this.ws.on('message', (data) => {
        this._handleMessage(data, (result) => settle(resolve, result));
      });

      this.ws.on('close', (code, reason) => {
        console.log(`[Gemini][${this.sessionId}] WebSocket closed: ${code} ${reason}`);
        console.log(`[Gemini][${this.sessionId}] Stats: sent=${this._audioChunksSent} received=${this._audioChunksReceived} messages=${this._messagesReceived}`);
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
        tools: [{
          functionDeclarations: [
            {
              name: 'execute_action',
              description: 'Execute a business action through Pyramedia automation system. Use for booking meetings, sending emails, web search, searching company files, creating documents, or sending WhatsApp notifications to admin.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  action: {
                    type: 'STRING',
                    enum: ['book_meeting', 'check_calendar', 'send_email', 'search_web', 'search_files', 'create_document', 'notify_admin'],
                    description: 'The type of action to execute'
                  },
                  message: {
                    type: 'STRING',
                    description: 'Natural language description of what needs to be done, in the language of the conversation'
                  },
                  name: { type: 'STRING', description: 'Person name if relevant' },
                  email: { type: 'STRING', description: 'Email address if relevant' },
                  phone: { type: 'STRING', description: 'Phone number if relevant' },
                  date: { type: 'STRING', description: 'Date in YYYY-MM-DD format if relevant' },
                  time: { type: 'STRING', description: 'Time in HH:MM format if relevant' },
                  subject: { type: 'STRING', description: 'Email subject if relevant' },
                },
                required: ['action', 'message']
              }
            }
          ]
        }]
      },
    };

    this.ws.send(JSON.stringify(setupMessage));
    console.log(`[Gemini][${this.sessionId}] Setup message sent (model=${GEMINI_MODEL}, prompt=${SYSTEM_PROMPT.length} chars, tools=1)`);
  }

  _handleMessage(rawData, onSetupComplete) {
    try {
      const message = JSON.parse(rawData.toString());
      this._messagesReceived++;

      // Log all message keys for debugging
      const keys = Object.keys(message);
      if (!message.serverContent) {
        console.log(`[Gemini][${this.sessionId}] Received message #${this._messagesReceived}: keys=${JSON.stringify(keys)}`);
      }

      if (message.setupComplete) {
        console.log(`[Gemini][${this.sessionId}] ✅ Setup complete - ready for audio`);
        this.isSetupComplete = true;
        if (onSetupComplete) onSetupComplete();
        if (this.onReady) this.onReady();
        return;
      }

      // Handle tool call messages from Gemini
      if (message.toolCall) {
        const functionCalls = message.toolCall.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
          for (const call of functionCalls) {
            console.log(`[Gemini][${this.sessionId}] Function call: ${call.name}(${JSON.stringify(call.args)})`);
            if (this.onFunctionCall) {
              this.onFunctionCall(call);
            }
          }
        }
        return;
      }

      // Handle tool call cancellation
      if (message.toolCallCancellation) {
        console.log(`[Gemini][${this.sessionId}] Tool call cancelled: ${JSON.stringify(message.toolCallCancellation)}`);
        return;
      }

      if (message.serverContent) {
        const { modelTurn, turnComplete } = message.serverContent;

        if (modelTurn && modelTurn.parts) {
          for (const part of modelTurn.parts) {
            if (part.inlineData && this.onAudio) {
              this._audioChunksReceived++;
              if (this._audioChunksReceived <= 3 || this._audioChunksReceived % 50 === 0) {
                console.log(`[Gemini][${this.sessionId}] 🔊 Audio response chunk #${this._audioChunksReceived} (${part.inlineData.data.length} base64 chars, mime=${part.inlineData.mimeType || 'not specified'})`);
              }
              this.onAudio(part.inlineData.data);
            }
            if (part.text && this.onTranscript) {
              // Filter out Gemini's internal thinking/reasoning text
              if (part.thought) {
                console.log(`[Gemini][${this.sessionId}] 💭 Thinking (filtered): "${part.text.substring(0, 80)}..."`);
              } else {
                console.log(`[Gemini][${this.sessionId}] 📝 Transcript: "${part.text.substring(0, 100)}"`);
                this.onTranscript(part.text);
              }
            }
            if (part.functionCall) {
              console.log(`[Gemini][${this.sessionId}] Function call (inline): ${part.functionCall.name}(${JSON.stringify(part.functionCall.args)})`);
              if (this.onFunctionCall) {
                this.onFunctionCall(part.functionCall);
              }
            }
          }
        }

        if (turnComplete) {
          console.log(`[Gemini][${this.sessionId}] 🔄 Turn complete (sent=${this._audioChunksSent}, received=${this._audioChunksReceived})`);
          if (this.onTurnComplete) this.onTurnComplete();
        }
      }

      // Log unexpected message types
      if (!message.setupComplete && !message.serverContent && !message.toolCall && !message.toolCallCancellation) {
        console.log(`[Gemini][${this.sessionId}] ⚠️ Unexpected message format:`, JSON.stringify(message).substring(0, 500));
      }
    } catch (err) {
      console.error(`[Gemini][${this.sessionId}] Parse error:`, err.message);
      console.error(`[Gemini][${this.sessionId}] Raw data (first 200 chars):`, rawData.toString().substring(0, 200));
    }
  }

  sendToolResponse(functionCallId, result) {
    if (!this.isConnected || !this.isSetupComplete) {
      console.warn(`[Gemini][${this.sessionId}] Cannot send tool response - not connected`);
      return;
    }

    const message = {
      toolResponse: {
        functionResponses: [{
          response: { result: typeof result === 'string' ? result : JSON.stringify(result) },
          id: functionCallId
        }]
      }
    };

    try {
      this.ws.send(JSON.stringify(message));
      console.log(`[Gemini][${this.sessionId}] Tool response sent for ${functionCallId}`);
    } catch (err) {
      console.error(`[Gemini][${this.sessionId}] Tool response send error:`, err.message);
    }
  }

  sendAudio(base64PcmData) {
    if (!this.isConnected || !this.isSetupComplete) {
      if (this._audioChunksSent === 0) {
        console.warn(`[Gemini][${this.sessionId}] ⚠️ Tried to send audio but not ready (connected=${this.isConnected}, setup=${this.isSetupComplete})`);
      }
      return;
    }

    if (typeof base64PcmData !== 'string' || base64PcmData.length > MAX_AUDIO_CHUNK_SIZE) {
      console.warn(`[Gemini][${this.sessionId}] Invalid audio chunk, dropping`);
      return;
    }

    this._audioChunksSent++;

    // Log first few chunks and then periodically
    if (this._audioChunksSent <= 3 || this._audioChunksSent % 100 === 0) {
      console.log(`[Gemini][${this.sessionId}] 🎤 Sending audio chunk #${this._audioChunksSent} (${base64PcmData.length} base64 chars)`);
    }

    const message = {
      realtime_input: {
        media_chunks: [
          {
            data: base64PcmData,
            mime_type: 'audio/pcm;rate=16000',
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
      console.log(`[Gemini][${this.sessionId}] Closing connection (sent=${this._audioChunksSent}, received=${this._audioChunksReceived})`);
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.isSetupComplete = false;
    }
  }
}

module.exports = { GeminiLiveClient };
