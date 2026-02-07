/**
 * Audio utilities for PCM processing
 */

const MAX_BASE64_LENGTH = 1024 * 1024; // ~750KB decoded

/**
 * Validate base64 audio chunk
 */
function isValidAudioChunk(str) {
  if (!str || typeof str !== 'string') return false;
  if (str.length > MAX_BASE64_LENGTH) return false;
  return /^[A-Za-z0-9+/]*={0,2}$/.test(str);
}

/**
 * Get duration of PCM audio in seconds
 */
function getPcmDuration(base64Data, sampleRate = 16000, bytesPerSample = 2, channels = 1) {
  const bytes = Buffer.from(base64Data, 'base64').length;
  return bytes / (sampleRate * bytesPerSample * channels);
}

module.exports = {
  isValidAudioChunk,
  getPcmDuration,
};
