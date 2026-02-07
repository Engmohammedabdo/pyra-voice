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

/**
 * Save transcripts for a session
 */
async function saveTranscripts(sessionId, transcripts) {
  const client = getClient();
  if (!client) return;
  if (!transcripts || transcripts.length === 0) return;

  try {
    const rows = transcripts.map(t => ({
      session_id: sessionId,
      role: t.role,
      text: t.text,
      created_at: t.created_at,
    }));

    const { error } = await client
      .from('pyra_voice_transcripts')
      .insert(rows);

    if (error) {
      console.warn('[Supabase] Transcript insert error:', error.message);
    } else {
      console.log(`[Supabase] Saved ${rows.length} transcript(s) for session ${sessionId}`);
    }
  } catch (err) {
    console.warn('[Supabase] Transcript save failed:', err.message);
  }
}

/**
 * Save a lead
 */
async function saveLead({ sessionId, name, email, phone, businessType, interest }) {
  const client = getClient();
  if (!client) return;

  try {
    const { error } = await client
      .from('pyra_voice_leads')
      .insert({
        session_id: sessionId || null,
        name: name || null,
        email: email || null,
        phone: phone || null,
        business_type: businessType || null,
        interest: interest || null,
      });

    if (error) {
      console.warn('[Supabase] Lead insert error:', error.message);
    } else {
      console.log('[Supabase] Lead saved successfully');
    }
  } catch (err) {
    console.warn('[Supabase] Lead save failed:', err.message);
  }
}

module.exports = { saveConversation, saveTranscripts, saveLead };
