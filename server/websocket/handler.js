const { v4: uuidv4 } = require('uuid');
const { GeminiLiveClient } = require('./gemini');
const { saveConversation } = require('../memory/supabase');

// Active sessions map
const sessions = new Map();

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

  // Send session ID to client
  sendToClient(ws, { type: 'session', sessionId });

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
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
  const { id: sessionId } = session;

  switch (message.type) {
    case 'start':
      await startConversation(ws, session);
      break;

    case 'audio':
      if (!message.data) {
        sendToClient(ws, { type: 'error', message: 'Missing audio data' });
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
      console.log(`[Handler][${sessionId}] Client ended conversation`);
      await endConversation(session);
      sendToClient(ws, { type: 'ended' });
      break;

    default:
      console.warn(`[Handler][${sessionId}] Unknown message type: ${message.type}`);
  }
}

async function startConversation(ws, session) {
  const { id: sessionId } = session;

  if (session.gemini) {
    console.warn(`[Handler][${sessionId}] Already has active Gemini connection`);
    sendToClient(ws, { type: 'ready' });
    return;
  }

  console.log(`[Handler][${sessionId}] Starting Gemini connection...`);
  session.startedAt = new Date();

  const gemini = new GeminiLiveClient(sessionId);

  // Wire up Gemini events to client
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
    console.log(`[Handler][${sessionId}] Gemini connected and ready`);
  } catch (err) {
    console.error(`[Handler][${sessionId}] Gemini connection failed:`, err.message);
    sendToClient(ws, { type: 'error', message: 'Failed to connect to AI service' });
  }
}

async function endConversation(session) {
  const { id: sessionId, startedAt } = session;

  if (session.gemini) {
    session.gemini.close();
    session.gemini = null;
  }

  // Save conversation metadata to Supabase
  if (startedAt) {
    try {
      await saveConversation({
        sessionId,
        startedAt: startedAt.toISOString(),
        endedAt: new Date().toISOString(),
        audioChunksReceived: session.audioChunksReceived,
        audioChunksSent: session.audioChunksSent,
      });
      console.log(`[Handler][${sessionId}] Conversation saved`);
    } catch (err) {
      console.error(`[Handler][${sessionId}] Failed to save conversation:`, err.message);
    }
  }

  session.startedAt = null;
  session.audioChunksReceived = 0;
  session.audioChunksSent = 0;
}

function cleanup(session) {
  endConversation(session).catch(() => {});
  sessions.delete(session.id);
  console.log(`[Handler][${session.id}] Session cleaned up. Active sessions: ${sessions.size}`);
}

function sendToClient(ws, data) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

module.exports = { handleConnection };
