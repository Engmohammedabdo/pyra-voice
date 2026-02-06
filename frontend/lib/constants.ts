// In combined deployment, backend runs on same host at port 3001
// But we access it via the same domain using Next.js rewrites
const getWsUrl = () => {
  if (typeof window === 'undefined') return 'ws://localhost:3001/ws';
  // Use same host as the page, but construct WS URL
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
};

const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  return `${window.location.protocol}//${window.location.host}`;
};

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || getWsUrl();
export const API_URL = process.env.NEXT_PUBLIC_API_URL || getApiUrl();
export const SIMLI_FACE_ID = '0c2b8b04-5274-41f1-a21c-d5c98322efa9';

export type SessionState = 
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}
