import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  port: string;
  username: string;
  db_name: string;
  use_ssl: boolean;
  is_active?: boolean;
}

interface AppState {
  connections: Connection[];
  activeConnectionId: number | null;
  messages: Message[];
  isLoading: boolean;
  setConnections: (conns: Connection[]) => void;
  setActiveConnection: (id: number | null) => void;
  addMessage: (msg: Message) => void;
  setLoading: (loading: boolean) => void;
  addConnection: (conn: Connection) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      connections: [],
      activeConnectionId: null,
      messages: [],
      isLoading: false,
      setConnections: (conns) => set({ connections: conns }),
      setActiveConnection: (id) => set({ activeConnectionId: id }),
      addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
      setLoading: (loading) => set({ isLoading: loading }),
      addConnection: (conn) => set((state) => ({ connections: [...state.connections, conn] })),
    }),
    {
      name: 'iq-connection',
      partialize: (state) => ({ activeConnectionId: state.activeConnectionId }),
    }
  )
);