/**
 * Simli.ai client - provides session tokens for frontend avatar rendering
 */

const SIMLI_API_URL = 'https://api.simli.ai/startAudioToVideoSession';

async function createSimliSession() {
  const apiKey = process.env.SIMLI_API_KEY;
  const faceId = process.env.SIMLI_FACE_ID;

  if (!apiKey || !faceId) {
    throw new Error('SIMLI_API_KEY or SIMLI_FACE_ID not configured');
  }

  const response = await fetch(SIMLI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      faceId,
      apiKey,
      syncAudio: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Simli API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  console.log('[Simli] Session created successfully');
  return data;
}

module.exports = { createSimliSession };
