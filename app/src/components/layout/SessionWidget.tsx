'use client'

import { useSessionStore } from '@/store/useSessionStore'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { UserCheck, Square } from 'lucide-react'
import { useState } from 'react'

export default function SessionWidget() {
  const { activeSession, endSession } = useSessionStore()
  const [ending, setEnding] = useState(false)
  const supabase = createClient()

  async function handleEndSession() {
    if (!activeSession) return
    setEnding(true)
    await supabase
      .from('sessions')
      .update({ end_time: new Date().toISOString() })
      .eq('id', activeSession.sessionId)
    endSession()
    setEnding(false)
  }

  return (
    <AnimatePresence>
      {activeSession && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <div className="glass rounded-2xl px-4 py-3 shadow-xl shadow-gold-100/50 border border-gold-200/60 flex items-center gap-3 min-w-[220px]">
            <div className="w-2.5 h-2.5 rounded-full bg-gold-400 animate-pulse shadow-sm shadow-gold-300" />
            <div className="flex-1">
              <p className="text-xs text-stone-400 leading-none mb-0.5">Active session</p>
              <p className="text-sm font-semibold text-stone-700 leading-none">
                {activeSession.clientName}
              </p>
            </div>
            <button
              onClick={handleEndSession}
              disabled={ending}
              title="End session"
              className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors"
            >
              <Square className="w-4 h-4" fill="currentColor" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
