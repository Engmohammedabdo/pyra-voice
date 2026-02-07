const { v4: uuidv4 } = require('uuid');
const { GeminiLiveClient } = require('./gemini');
const { saveConversation } = require('../memory/supabase');

const sessions = new Map();

const MAX_MESSAGE_SIZE = 2 * 1024 * 1024; // 2MB max per WS message

function handleConnection(ws) {
  const sessionId = uuidv4();
  const session = {
    id: sessionId,
    gemini: null,
    startedAt: null,
    audioChunksReceived: 0,
    audioChunksSent: 0,
  };
  sessions.set(sessionId, session);

  console.log(`[Handler][${sessionId}] Session created`);

  sendToClient(ws, { type: 'session', sessionId });

  ws.on('message', async (data) => {
    try {
      const raw = data.toString();
      if (raw.length > MAX_MESSAGE_SIZE) {
        sendToClient(ws, { type: 'error', message: 'Message too large' });
        return;
      }
      const message = JSON.parse(raw);
      await handleMessage(ws, session, message);
    } catch (err) {
      console.error(`[Handler][${sessionId}] Message parse error:`, err.message);
      sendToClient(ws, { type: 'error', message: 'Invalid message format' });
    }
  });

  ws.on('close', () => {
    console.log(`[Handler][${sessionId}] Client disconnected`);
    cleanup(session);
  });

  ws.on('error', (err) => {
    console.error(`[Handler][${sessionId}] WebSocket error:`, err.message);
    cleanup(session);
  });
}

async function handleMessage(ws, session, message) {
  switch (message.type) {
    case 'start':
      await startConversation(ws, session);
      break;

    case 'audio':
      if (!message.data || typeof message.data !== 'string') {
        sendToClient(ws, { type: 'error', message: 'Missing or invalid audio data' });
        return;
      }
      if (session.gemini) {
        session.gemini.sendAudio(message.data);
        session.audioChunksReceived++;
      } else {
        sendToClient(ws, { type: 'error', message: 'Conversation not started' });
      }
      break;

    case 'end':
      console.log(`[Handler][${session.id}] Client ended conversation`);
      await endConversation(session);
      sendToClient(ws, { type: 'ended' });
      break;

    default:
      console.warn(`[Handler][${session.id}] Unknown message type: ${message.type}`);
  }
}

async function startConversation(ws, session) {
  if (session.gemini) {
    console.warn(`[Handler][${session.id}] Already has active Gemini connection`);
    sendToClient(ws, { type: 'ready' });
    return;
  }

  console.log(`[Handler][${session.id}] Starting Gemini connection...`);
  session.startedAt = new Date();

  const gemini = new GeminiLiveClient(session.id);

  gemini.onAudio = (base64Audio) => {
    session.audioChunksSent++;
    sendToClient(ws, { type: 'audio', data: base64Audio });
  };

  gemini.onTranscript = (text) => {
    sendToClient(ws, { type: 'transcript', text });
  };

  gemini.onTurnComplete = () => {
    sendToClient(ws, { type: 'turn_complete' });
  };

  gemini.onError = (errorMsg) => {
    sendToClient(ws, { type: 'error', message: errorMsg });
  };

  gemini.onReady = () => {
    sendToClient(ws, { type: 'ready' });
  };

  try {
    await gemini.connect();
    session.gemini = gemini;
    console.log(`[Handler][${session.id}] Gemini connected and ready`);
  } catch (err) {
    console.error(`[Handler][${session.id}] Gemini connection failed:`, err.message);
    // Provide more specific error messages to the client
    let clientMsg = 'Failed to connect to AI service';
    if (err.message.includes('not configured')) {
      clientMsg = 'AI service not configured. Please set GOOGLE_API_KEY.';
    } else if (err.message.includes('403') || err.message.includes('PERMISSION_DENIED')) {
      clientMsg = 'API key invalid or Generative Language API not enabled.';
    } else if (err.message.includes('timeout')) {
      clientMsg = 'AI service connection timed out. Please try again.';
    }
    sendToClient(ws, { type: 'error', message: clientMsg });
  }
}

async function endConversation(session) {
  if (session.gemini) {
    session.gemini.close();
    session.gemini = null;
  }

  if (session.startedAt) {
    try {
      await saveConversation({
        sessionId: session.id,
        startedAt: session.startedAt.toISOString(),
        endedAt: new Date().toISOString(),
        audioChunksReceived: session.audioChunksReceived,
        audioChunksSent: session.audioChunksSent,
      });
      console.log(`[Handler][${session.id}] Conversation saved`);
    } catch (err) {
      console.error(`[Handler][${session.id}] Failed to save conversation:`, err.message);
    }
  }

  session.startedAt = null;
  session.audioChunksReceived = 0;
  session.audioChunksSent = 0;
}

function cleanup(session) {
  endConversation(session).catch(() => {});
  sessions.delete(session.id);
  console.log(`[Handler][${session.id}] Session cleaned up. Active: ${sessions.size}`);
}

function sendToClient(ws, data) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

module.exports = { handleConnection };
