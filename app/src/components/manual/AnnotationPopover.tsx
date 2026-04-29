'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Highlighter, MessageSquare, Globe, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/store/useSessionStore'
import type { Annotation, AnnotationType, AnnotationScope } from '@/types'

interface PopoverPosition {
  x: number
  y: number
}

interface Props {
  sectionId: string
  onAnnotationCreated: () => void
  // For tapping an existing annotation
  existingAnnotation?: Annotation | null
  onDismiss: () => void
}

interface NewAnnotationState {
  text: string
  position: PopoverPosition
}

// This component is controlled from the parent ContentRenderer
export function useAnnotationPopover(sectionId: string, onCreated: () => void) {
  const [newAnnotation, setNewAnnotation] = useState<NewAnnotationState | null>(null)
  const [existingAnnotation, setExistingAnnotation] = useState<Annotation | null>(null)
  const [noteText, setNoteText] = useState('')
  const [step, setStep] = useState<'menu' | 'note'>('menu')
  const { activeSession } = useSessionStore()
  const supabase = createClient()

  function handleTextSelection(text: string, position: PopoverPosition) {
    if (!text.trim()) return
    setExistingAnnotation(null)
    setNewAnnotation({ text, position })
    setStep('menu')
    setNoteText('')
  }

  function handleExistingAnnotationTap(annotation: Annotation, position: PopoverPosition) {
    setNewAnnotation(null)
    setExistingAnnotation(annotation)
    setStep('menu')
  }

  function dismiss() {
    setNewAnnotation(null)
    setExistingAnnotation(null)
    setNoteText('')
    setStep('menu')
  }

  async function applyHighlight(scope: AnnotationScope) {
    if (!newAnnotation) return
    await supabase.from('annotations').insert({
      section_id: sectionId,
      type: 'highlight' as AnnotationType,
      scope,
      client_id: scope === 'client' ? activeSession?.clientId : null,
      session_id: scope === 'client' ? activeSession?.sessionId : null,
      exact_text: newAnnotation.text,
      position_data: newAnnotation.position,
    })
    dismiss()
    onCreated()
  }

  async function applyNote(scope: AnnotationScope) {
    if (!newAnnotation || !noteText.trim()) return
    await supabase.from('annotations').insert({
      section_id: sectionId,
      type: 'note' as AnnotationType,
      scope,
      client_id: scope === 'client' ? activeSession?.clientId : null,
      session_id: scope === 'client' ? activeSession?.sessionId : null,
      exact_text: newAnnotation.text,
      content: noteText.trim(),
      position_data: newAnnotation.position,
    })
    dismiss()
    onCreated()
  }

  async function deleteAnnotation() {
    if (!existingAnnotation) return
    await supabase.from('annotations').delete().eq('id', existingAnnotation.id)
    dismiss()
    onCreated()
  }

  return {
    newAnnotation,
    existingAnnotation,
    noteText,
    setNoteText,
    step,
    setStep,
    handleTextSelection,
    handleExistingAnnotationTap,
    dismiss,
    applyHighlight,
    applyNote,
    deleteAnnotation,
    activeSession,
  }
}

export default function AnnotationPopover({
  popoverState,
}: {
  popoverState: ReturnType<typeof useAnnotationPopover>
}) {
  const {
    newAnnotation,
    existingAnnotation,
    noteText,
    setNoteText,
    step,
    setStep,
    dismiss,
    applyHighlight,
    applyNote,
    deleteAnnotation,
    activeSession,
  } = popoverState

  const isOpen = !!(newAnnotation || existingAnnotation)
  const position = newAnnotation?.position ?? { x: 0, y: 0 }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop to dismiss */}
          <div className="fixed inset-0 z-40" onClick={dismiss} />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 4 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 rounded-2xl shadow-2xl shadow-stone-200/60 p-3 min-w-[200px]"
            style={{
              background: 'rgba(255, 255, 255, 0.90)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              left: Math.min(position.x, window.innerWidth - 240),
              top: position.y + 8,
            }}
          >
            {/* Existing annotation — show delete */}
            {existingAnnotation && (
              <div className="space-y-1">
                <p className="text-xs text-stone-400 px-2 pb-1 border-b border-stone-100">
                  {existingAnnotation.type === 'highlight' ? 'Highlight' : 'Note'} ·{' '}
                  {existingAnnotation.scope === 'client' ? 'Client' : 'Global'}
                </p>
                {existingAnnotation.content && (
                  <p className="text-xs text-stone-600 px-2 py-1 italic">{existingAnnotation.content}</p>
                )}
                <button
                  onClick={deleteAnnotation}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            )}

            {/* New annotation menu */}
            {newAnnotation && step === 'menu' && (
              <div className="space-y-1">
                <p className="text-xs text-stone-400 px-2 pb-1 border-b border-stone-100 truncate max-w-[180px]">
                  &quot;{newAnnotation.text.slice(0, 30)}{newAnnotation.text.length > 30 ? '…' : ''}&quot;
                </p>

                {/* Highlight options */}
                {activeSession && (
                  <button
                    onClick={() => applyHighlight('client')}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-700 hover:bg-gold-50 transition-colors"
                  >
                    <Highlighter className="w-3.5 h-3.5 text-gold-500" />
                    Highlight for {activeSession.clientName}
                  </button>
                )}
                <button
                  onClick={() => applyHighlight('global')}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-700 hover:bg-sky-50 transition-colors"
                >
                  <Highlighter className="w-3.5 h-3.5 text-sky-400" />
                  <Globe className="w-2.5 h-2.5 text-sky-400 -ml-0.5" />
                  Global highlight
                </button>

                {/* Note options */}
                {activeSession && (
                  <button
                    onClick={() => setStep('note')}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-700 hover:bg-gold-50 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-gold-500" />
                    Add note for {activeSession.clientName}
                  </button>
                )}
                <button
                  onClick={() => setStep('note')}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-700 hover:bg-sky-50 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                  <Globe className="w-2.5 h-2.5 text-sky-400 -ml-0.5" />
                  Global note
                </button>
              </div>
            )}

            {/* Note input step */}
            {newAnnotation && step === 'note' && (
              <div className="space-y-2 min-w-[220px]">
                <textarea
                  autoFocus
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Write your note…"
                  className="w-full h-20 px-3 py-2 text-xs text-stone-700 bg-white/70 rounded-xl border border-white/80 resize-none focus:outline-none focus:ring-2 focus:ring-gold-300/60 placeholder-stone-300"
                />
                <div className="flex gap-2">
                  {activeSession && (
                    <button
                      onClick={() => applyNote('client')}
                      disabled={!noteText.trim()}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-gold-400 to-gold-500 text-white disabled:opacity-40 transition-all"
                    >
                      Save for {activeSession.clientName.split(' ')[0]}
                    </button>
                  )}
                  <button
                    onClick={() => applyNote('global')}
                    disabled={!noteText.trim()}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold bg-sky-100 text-sky-600 hover:bg-sky-200 disabled:opacity-40 transition-all"
                  >
                    Save global
                  </button>
                </div>
                <button
                  onClick={() => setStep('menu')}
                  className="w-full py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-600 transition-colors"
                >
                  ← Back
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
