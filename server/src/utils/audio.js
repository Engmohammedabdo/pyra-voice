/**
 * Audio utilities for PCM processing
 */

/**
 * Validate base64 string
 */
function isValidBase64(str) {
  if (!str || typeof str !== 'string') return false;
  try {
    return Buffer.from(str, 'base64').toString('base64') === str;
  } catch {
    return false;
  }
}

/**
 * Get duration of PCM audio in seconds
 * @param {string} base64Data - Base64 encoded PCM data
 * @param {number} sampleRate - Sample rate (16000 or 24000)
 * @param {number} bytesPerSample - Bytes per sample (2 for 16-bit)
 * @param {number} channels - Number of channels (1 for mono)
 */
function getPcmDuration(base64Data, sampleRate = 16000, bytesPerSample = 2, channels = 1) {
  const bytes = Buffer.from(base64Data, 'base64').length;
  return bytes / (sampleRate * bytesPerSample * channels);
}

/**
 * Encode a Buffer to base64
 */
function bufferToBase64(buffer) {
  return buffer.toString('base64');
}

/**
 * Decode base64 to Buffer
 */
function base64ToBuffer(base64) {
  return Buffer.from(base64, 'base64');
}

module.exports = {
  isValidBase64,
  getPcmDuration,
  bufferToBase64,
  base64ToBuffer,
};
