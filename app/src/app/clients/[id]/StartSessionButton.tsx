'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/store/useSessionStore'
import { Play, Loader2 } from 'lucide-react'

interface Props {
  clientId: string
  clientName: string
}

export default function StartSessionButton({ clientId, clientName }: Props) {
  const { activeSession, startSession } = useSessionStore()
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const isActive = activeSession?.clientId === clientId

  async function handleStart() {
    if (activeSession) {
      alert('Please end the current session before starting a new one.')
      return
    }
    setLoading(true)

    const { data } = await supabase
      .from('sessions')
      .insert({ client_id: clientId, start_time: new Date().toISOString() })
      .select()
      .single()

    if (data) {
      startSession(clientId, clientName, data.id)
      router.push('/manuals')
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleStart}
      disabled={loading || isActive || !!activeSession}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all active:scale-[0.98] ${
        isActive
          ? 'bg-gold-100 text-gold-600 border border-gold-200'
          : activeSession
          ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
          : 'bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow-gold-200 hover:from-gold-500 hover:to-gold-600'
      }`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Play className="w-4 h-4" fill="currentColor" />
      )}
      {isActive ? 'Session active' : 'Start session'}
    </button>
  )
}
