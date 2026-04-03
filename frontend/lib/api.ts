import axios from 'axios';

// Relative URL — requests go to Next.js (localhost:3000) which proxies
// them to the FastAPI backend via next.config.ts rewrites. This ensures
// session cookies are sent (same-origin).
const API_URL = '/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ── Connections ──────────────────────────────────────────────────────────────

export const getConnections = async () => {
  const res = await api.get('/connections/');
  return res.data;
};

export const createConnection = async (data: Record<string, unknown>) => {
  // user_id is now derived from session on server — strip it out
  const { user_id, ...connectionData } = data;
  const res = await api.post('/connections/', connectionData);
  return res.data;
};

export const testConnection = async (data: Record<string, unknown>) => {
  const res = await api.post('/connections/test', data);
  return res.data;
};

export const deleteConnection = async (id: number) => {
  const res = await api.delete(`/connections/${id}`);
  return res.data;
};

// ── Query ────────────────────────────────────────────────────────────────────

export const sendQuery = async (query: string, connectionId: number) => {
  const res = await api.post('/query/generate', null, {
    params: { user_query: query, connection_id: connectionId },
  });
  return res.data;
};

export const explainQuery = async (sql: string, question: string = '') => {
  const res = await api.post('/query/explain', null, {
    params: { sql, user_question: question },
  });
  return res.data;
};

// ── History ──────────────────────────────────────────────────────────────────

export const getHistory = async (connectionId?: number, limit = 50, offset = 0) => {
  const params: Record<string, unknown> = { limit, offset };
  if (connectionId) params.connection_id = connectionId;
  const res = await api.get('/history/', { params });
  return res.data;
};

export const deleteHistory = async (id: number) => {
  const res = await api.delete(`/history/${id}`);
  return res.data;
};

// ── Schema ───────────────────────────────────────────────────────────────────

export const getSchema = async (connectionId: number) => {
  const res = await api.get(`/schema/${connectionId}/tables`);
  return res.data;
};

export const searchSchema = async (connectionId: number, query: string) => {
  const res = await api.get(`/schema/${connectionId}/search`, { params: { q: query } });
  return res.data;
};

// ── Voice ────────────────────────────────────────────────────────────────────

export const transcribeAudio = async (audioFile: File) => {
  const formData = new FormData();
  formData.append('file', audioFile);
  const res = await api.post('/voice/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// ── Settings ─────────────────────────────────────────────────────────────────

export const getProfile = async () => {
  const res = await api.get('/settings/profile');
  return res.data;
};

export const updateProfile = async (name: string) => {
  const res = await api.put('/settings/profile', { name });
  return res.data;
};

export const getOrganization = async () => {
  const res = await api.get('/settings/organization');
  return res.data;
};

export const createOrganization = async (name: string) => {
  const res = await api.post('/settings/organization', { name });
  return res.data;
};

export const updateOrganization = async (name: string) => {
  const res = await api.put('/settings/organization', { name });
  return res.data;
};

export const getTeamMembers = async () => {
  const res = await api.get('/settings/team');
  return res.data;
};

export const inviteTeamMember = async (email: string, role: string = 'viewer') => {
  const res = await api.post('/settings/team/invite', { email, role });
  return res.data;
};

export const updateMemberRole = async (userId: string, role: string) => {
  const res = await api.put('/settings/team/role', { user_id: userId, role });
  return res.data;
};

export const getMyInvites = async () => {
  const res = await api.get('/settings/team/invites');
  return res.data;
};

export const acceptInvite = async (inviteId: number) => {
  const res = await api.post(`/settings/team/invites/${inviteId}/accept`);
  return res.data;
};

export const declineInvite = async (inviteId: number) => {
  const res = await api.post(`/settings/team/invites/${inviteId}/decline`);
  return res.data;
};