export interface SessionQuery {
  question: string;
  sql: string;
  timestamp: number;
}

export interface Session {
  id: string;
  title: string;
  connectionId: number;
  queries: SessionQuery[];
  updatedAt: number;
}

const KEY = 'iq_sessions';
const MAX = 30;

export function getSessions(): Session[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

export function getSession(id: string): Session | null {
  return getSessions().find((s) => s.id === id) ?? null;
}

export function upsertSession(session: Session): void {
  const rest = getSessions().filter((s) => s.id !== session.id);
  try { localStorage.setItem(KEY, JSON.stringify([session, ...rest].slice(0, MAX))); }
  catch {}
}

export function createSessionId(): string {
  return `iq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
