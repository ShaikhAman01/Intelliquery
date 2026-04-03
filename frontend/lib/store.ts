import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  data?: any[];
  visualization?: any;
  sql?: string;
  timestamp: Date;
}

export interface Connection {
  id: number;
  name: string;
  db_type: string;
  host: string;
}

interface AppState {
  connections: Connection[];
  activeConnectionId: number | null;
  messages: Message[];
  isLoading: boolean;
  setConnections: (conns: Connection[]) => void;
  setActiveConnection: (id: number) => void;
  addMessage: (msg: Message) => void;
  setLoading: (loading: boolean) => void;
  addConnection: (conn: Connection) => void;
}

export const useStore = create<AppState>((set) => ({
  connections: [],
  activeConnectionId: null,
  messages: [],
  isLoading: false,
  setConnections: (conns) => set({ connections: conns }),
  setActiveConnection: (id) => set({ activeConnectionId: id }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setLoading: (loading) => set({ isLoading: loading }),
  addConnection: (conn) => set((state) => ({ connections: [...state.connections, conn] })),
}));