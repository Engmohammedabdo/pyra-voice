const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function getClient() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.warn('[Supabase] Not configured, conversation storage disabled');
      return null;
    }

    supabase = createClient(url, key);
    console.log('[Supabase] Client initialized');
  }
  return supabase;
}

/**
 * Save conversation metadata
 */
async function saveConversation({ sessionId, startedAt, endedAt, audioChunksReceived, audioChunksSent }) {
  const client = getClient();
  if (!client) return;

  try {
    const { error } = await client
      .from('pyra_voice_conversations')
      .insert({
        session_id: sessionId,
        started_at: startedAt,
        ended_at: endedAt,
        audio_chunks_received: audioChunksReceived,
        audio_chunks_sent: audioChunksSent,
        duration_seconds: Math.round((new Date(endedAt) - new Date(startedAt)) / 1000),
      });

    if (error) {
      console.warn('[Supabase] Insert error (table may not exist yet):', error.message);
    }
  } catch (err) {
    console.warn('[Supabase] Save failed:', err.message);
  }
}

module.exports = { saveConversation };
