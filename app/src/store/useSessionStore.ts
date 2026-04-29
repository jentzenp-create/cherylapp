'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ActiveSession } from '@/types'

interface SessionStore {
  activeSession: ActiveSession | null
  startSession: (clientId: string, clientName: string, sessionId: string) => void
  endSession: () => void
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      activeSession: null,
      startSession: (clientId, clientName, sessionId) =>
        set({
          activeSession: {
            sessionId,
            clientId,
            clientName,
            startTime: new Date().toISOString(),
          },
        }),
      endSession: () => set({ activeSession: null }),
    }),
    {
      name: 'active-session',
    }
  )
)
