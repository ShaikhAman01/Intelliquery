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

const KEY = (userId: string) => `iq_sessions_${userId}`;
const MAX = 30;

export function getSessions(userId: string): Session[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY(userId)) || '[]'); }
  catch { return []; }
}

export function getSession(userId: string, id: string): Session | null {
  return getSessions(userId).find((s) => s.id === id) ?? null;
}

export function upsertSession(userId: string, session: Session): void {
  const rest = getSessions(userId).filter((s) => s.id !== session.id);
  try { localStorage.setItem(KEY(userId), JSON.stringify([session, ...rest].slice(0, MAX))); }
  catch {}
}

export function createSessionId(): string {
  return `iq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
