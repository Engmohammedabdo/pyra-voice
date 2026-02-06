export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
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
