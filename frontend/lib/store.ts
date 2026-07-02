import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  setConnections: (conns: Connection[]) => void;
  setActiveConnection: (id: number | null) => void;
  addConnection: (conn: Connection) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      connections: [],
      activeConnectionId: null,
      setConnections: (conns) => set({ connections: conns }),
      setActiveConnection: (id) => set({ activeConnectionId: id }),
      addConnection: (conn) => set((state) => ({ connections: [...state.connections, conn] })),
    }),
    {
      name: 'iq-connection',
      partialize: (state) => ({ activeConnectionId: state.activeConnectionId }),
    }
  )
);