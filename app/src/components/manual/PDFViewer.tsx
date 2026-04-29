'use client'

/**
 * PDFViewer — renders a PDF via react-pdf-highlighter with custom colored annotations.
 *
 * This file is loaded ONLY via next/dynamic({ ssr: false }) — never server-rendered.
 * It handles:
 *   - Displaying the PDF exactly as it looks (existing flattened highlights show automatically)
 *   - Text selection → color picker (global) or auto-teal (client)
 *   - Persisting new annotations to Supabase
 *   - Rendering saved annotations as colored highlight overlays
 *   - Notes (text added to a highlight)
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { PdfLoader, PdfHighlighter, Popup } from 'react-pdf-highlighter'
import type { IHighlight, ScaledPosition } from 'react-pdf-highlighter'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/store/useSessionStore'
import { Trash2, ExternalLink } from 'lucide-react'

// ── Color palette ────────────────────────────────────────────────────────────

const GLOBAL_COLORS = [
  { name: 'Light blue',   hex: '#bfdbfe' },
  { name: 'Light green',  hex: '#bbf7d0' },
  { name: 'Pink',         hex: '#fbcfe8' },
  { name: 'Yellow',       hex: '#fef08a' },
  { name: 'Orange',       hex: '#fed7aa' },
  { name: 'Salmon',       hex: '#fca5a5' },
  { name: 'Forest green', hex: '#86efac' },
  { name: 'Light purple', hex: '#e9d5ff' },
  { name: 'Dark purple',  hex: '#c4b5fd' },
]

const CLIENT_COLOR = '#22d3ee' // bright teal — reserved for client annotations

// ── Extended highlight type ───────────────────────────────────────────────────

interface AppHighlight extends IHighlight {
  highlightColor: string
  scope: 'global' | 'client'
  supabaseId: string
  noteContent?: string
}

// ── Selection tip (appears above selected text) ───────────────────────────────

interface SelectionTipProps {
  content: { text?: string }
  hideTipAndSelection: () => void
  onSave: (params: {
    position: ScaledPosition
    content: { text?: string }
    color: string
    scope: 'global' | 'client'
    note?: string
  }) => void
  position: ScaledPosition
  clientName?: string
}

function SelectionTip({ content, position, hideTipAndSelection, onSave, clientName }: SelectionTipProps) {
  const [step, setStep] = useState<'choice' | 'globalColor' | 'note'>('choice')
  const [pendingScope, setPendingScope] = useState<'global' | 'client'>('global')
  const [pendingColor, setPendingColor] = useState('')
  const [noteText, setNoteText] = useState('')
  const [isNote, setIsNote] = useState(false)

  const preview = (content.text || '').slice(0, 40)

  function handleHighlight(scope: 'global' | 'client') {
    setPendingScope(scope)
    if (scope === 'client') {
      onSave({ position, content, color: CLIENT_COLOR, scope: 'client' })
      hideTipAndSelection()
    } else {
      setIsNote(false)
      setStep('globalColor')
    }
  }

  function handleNote(scope: 'global' | 'client') {
    setPendingScope(scope)
    setIsNote(true)
    if (scope === 'client') {
      setPendingColor(CLIENT_COLOR)
      setStep('note')
    } else {
      setStep('globalColor')
    }
  }

  function handleColorPick(color: string) {
    setPendingColor(color)
    if (isNote) {
      setStep('note')
    } else {
      onSave({ position, content, color, scope: 'global' })
      hideTipAndSelection()
    }
  }

  function handleSaveNote() {
    if (!noteText.trim()) return
    onSave({ position, content, color: pendingColor, scope: pendingScope, note: noteText.trim() })
    hideTipAndSelection()
  }

  return (
    <div className="glass rounded-2xl shadow-xl shadow-stone-200/60 p-3 min-w-[200px] max-w-[264px] z-50">
      {step === 'choice' && (
        <div className="space-y-1">
          <p className="text-xs text-stone-400 px-2 pb-1.5 border-b border-stone-100 truncate">
            &ldquo;{preview}{(content.text || '').length > 40 ? '…' : ''}&rdquo;
          </p>

          {/* Client actions */}
          {clientName && (
            <>
              <button
                onClick={() => handleHighlight('client')}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-700 hover:bg-cyan-50 transition-colors"
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: CLIENT_COLOR }} />
                Highlight for {clientName}
              </button>
              <button
                onClick={() => handleNote('client')}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-700 hover:bg-cyan-50 transition-colors"
              >
                <span className="text-sm">📝</span>
                Note for {clientName}
              </button>
            </>
          )}

          {/* Global actions */}
          <button
            onClick={() => handleHighlight('global')}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <span className="w-3 h-3 rounded-full bg-yellow-200 border border-yellow-300 flex-shrink-0" />
            Global highlight
          </button>
          <button
            onClick={() => handleNote('global')}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <span className="text-sm">📝</span>
            Global note
          </button>

          <button
            onClick={hideTipAndSelection}
            className="w-full pt-1.5 pb-0.5 text-xs text-stone-300 hover:text-stone-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {step === 'globalColor' && (
        <div className="space-y-2">
          <p className="text-xs text-stone-400 px-1 pb-1 border-b border-stone-100">
            {isNote ? 'Note color' : 'Highlight color'}
          </p>
          <div className="grid grid-cols-5 gap-2 px-1 pt-1">
            {GLOBAL_COLORS.map((c) => (
              <button
                key={c.hex}
                title={c.name}
                onClick={() => handleColorPick(c.hex)}
                className="w-8 h-8 rounded-full border-2 border-white/80 shadow hover:scale-110 transition-transform"
                style={{ background: c.hex }}
              />
            ))}
          </div>
          <button onClick={() => setStep('choice')} className="w-full py-1 text-xs text-stone-400 hover:text-stone-600 transition-colors">
            ← Back
          </button>
        </div>
      )}

      {step === 'note' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 pb-1 border-b border-stone-100">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: pendingColor }} />
            <p className="text-xs text-stone-400">Add note</p>
          </div>
          <textarea
            autoFocus
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write your note…"
            rows={3}
            className="w-full px-3 py-2 text-xs text-stone-700 bg-white/70 rounded-xl border border-white/80 resize-none focus:outline-none focus:ring-2 focus:ring-gold-300/60 placeholder-stone-300"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveNote}
              disabled={!noteText.trim()}
              className="flex-1 py-2 rounded-xl text-xs font-semibold bg-stone-700 text-white hover:bg-stone-800 disabled:opacity-40 transition-colors"
            >
              Save note
            </button>
            <button
              onClick={hideTipAndSelection}
              className="px-3 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Popup shown when tapping an existing highlight ────────────────────────────

function HighlightPopup({
  highlight,
  onDelete,
}: {
  highlight: AppHighlight
  onDelete: (id: string) => void
}) {
  return (
    <div className="glass rounded-2xl shadow-xl shadow-stone-200/60 p-3 min-w-[160px] max-w-[240px]">
      <p className="text-xs text-stone-400 mb-1.5 px-1">
        {highlight.scope === 'client' ? 'Client annotation' : 'Global annotation'}
      </p>
      {highlight.noteContent && (
        <p className="text-xs text-stone-700 italic mb-2 pl-2 border-l-2 border-stone-200">
          {highlight.noteContent}
        </p>
      )}
      <button
        onClick={() => onDelete(highlight.supabaseId)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  pdfUrl: string
  manualId: string
  initialPage?: number
}

export default function PDFViewer({ pdfUrl, manualId, initialPage }: Props) {
  const fullPdfUrl = typeof window !== 'undefined' ? `${window.location.origin}${pdfUrl}` : pdfUrl
  const [highlights, setHighlights] = useState<AppHighlight[]>([])
  const [pdfError, setPdfError] = useState<string | null>(null)
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const { activeSession } = useSessionStore()
  const supabase = createClient()

  // Scroll to the target page using direct DOM manipulation on the .PdfHighlighter
  // scroll container. Does NOT depend on scrollRef/isViewerReady (which is broken in
  // React 18 Strict Mode dev due to class component double-mount + eventBus mismatch).
  // Retries every 200ms until the page element exists in the DOM (handles initial load).
  useEffect(() => {
    if (!initialPage) return

    let retries = 0
    const MAX_RETRIES = 20 // up to 4 seconds

    const tryScroll = () => {
      const container = pdfContainerRef.current?.querySelector('.PdfHighlighter') as HTMLElement | null
      const pageEl = container?.querySelector(`.page[data-page-number="${initialPage}"]`) as HTMLElement | null

      if (container && pageEl) {
        const containerRect = container.getBoundingClientRect()
        const pageRect = pageEl.getBoundingClientRect()
        container.scrollTop += pageRect.top - containerRect.top
        return
      }

      retries++
      if (retries < MAX_RETRIES) {
        retryTimer = setTimeout(tryScroll, 200)
      }
    }

    let retryTimer: ReturnType<typeof setTimeout> = setTimeout(tryScroll, 300)
    return () => clearTimeout(retryTimer)
  }, [initialPage])

  const fetchAnnotations = useCallback(async () => {
    let query = supabase
      .from('annotations')
      .select('*')
      .eq('manual_id', manualId)
      .not('position_data', 'is', null)

    if (activeSession) {
      query = query.or(`scope.eq.global,and(scope.eq.client,client_id.eq.${activeSession.clientId})`)
    } else {
      query = query.eq('scope', 'global')
    }

    const { data } = await query.order('created_at')
    if (!data) return

    setHighlights(
      data.map((ann) => ({
        id: ann.id,
        supabaseId: ann.id,
        position: ann.position_data as ScaledPosition,
        content: { text: ann.exact_text || '' },
        comment: { text: ann.content || '', emoji: ann.type === 'note' ? '📝' : '' },
        highlightColor: ann.color || '#fef08a',
        scope: ann.scope as 'global' | 'client',
        noteContent: ann.content || undefined,
      }))
    )
  }, [manualId, activeSession]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAnnotations()
  }, [fetchAnnotations])

  async function handleSave({
    position,
    content,
    color,
    scope,
    note,
  }: {
    position: ScaledPosition
    content: { text?: string }
    color: string
    scope: 'global' | 'client'
    note?: string
  }) {
    await supabase.from('annotations').insert({
      section_id: null,
      manual_id: manualId,
      page_number: position.pageNumber,
      type: note ? 'note' : 'highlight',
      scope,
      color,
      client_id: scope === 'client' ? activeSession?.clientId ?? null : null,
      session_id: scope === 'client' ? activeSession?.sessionId ?? null : null,
      exact_text: content.text || null,
      content: note || null,
      position_data: position,
    })
    fetchAnnotations()
  }

  async function handleDelete(id: string) {
    await supabase.from('annotations').delete().eq('id', id)
    fetchAnnotations()
  }

  return (
    <div ref={pdfContainerRef} className="h-full w-full relative min-h-[500px]">
      <div className="flex justify-between items-center mb-4 px-4">
        <h3 className="text-stone-500 font-medium text-sm">PDF Viewer</h3>
        <a 
          href={fullPdfUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-gold-600 hover:text-gold-700 font-medium bg-gold-50 px-3 py-1.5 rounded-lg transition-colors border border-gold-100"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open PDF in New Tab
        </a>
      </div>

      <PdfLoader
        url={fullPdfUrl}
        workerSrc="/pdf.worker.min.mjs"
        onError={(e: unknown) => {
          const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
          console.error('PdfLoader error:', e)
          setPdfError(msg)
        }}
        beforeLoad={
          <div className="flex items-center justify-center p-20 text-stone-400 text-sm animate-pulse">
            Establishing connection to PDF...
          </div>
        }
        errorMessage={
          <div className="p-10 m-4 rounded-xl glass border border-red-200 bg-red-50/50">
            <h2 className="text-red-800 font-semibold mb-2">Technical Issue loading PDF</h2>
            <p className="text-red-700 text-sm mb-4">
              We couldn&apos;t load the file from: <code className="bg-white/50 px-1 rounded">{fullPdfUrl}</code>
            </p>
            {pdfError && (
              <p className="text-xs font-mono bg-red-100 text-red-700 p-2 rounded mb-3 break-all">
                {pdfError}
              </p>
            )}
            <p className="text-xs text-stone-500 mb-4">
              Please check if the file exists in the public folder and matches the case.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => typeof window !== 'undefined' && window.location.reload()}
                className="px-4 py-2 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-700 transition-all font-medium"
              >
                Retry Loading
              </button>
              <a 
                href={fullPdfUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-white text-stone-700 border border-stone-200 rounded-lg text-sm hover:bg-stone-50 transition-all font-medium flex items-center gap-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Source PDF
              </a>
            </div>
          </div>
        }
      >
        {(pdfDocument) => (
          <PdfHighlighter
            pdfDocument={pdfDocument}
            enableAreaSelection={() => false}
            onScrollChange={() => {}}
            pdfScaleValue="page-width"
            scrollRef={() => {}}
            onSelectionFinished={(position, content, hideTipAndSelection) => (
              <SelectionTip
                position={position}
                content={content}
                hideTipAndSelection={hideTipAndSelection}
                onSave={handleSave}
                clientName={activeSession?.clientName}
              />
            )}
            highlightTransform={(highlight, index, setTip, hideTip) => {
              const ah = highlight as unknown as AppHighlight
              return (
                <Popup
                  key={index}
                  popupContent={
                    <HighlightPopup highlight={ah} onDelete={handleDelete} />
                  }
                  onMouseOver={(popupContent) => setTip(highlight, () => popupContent)}
                  onMouseOut={hideTip}
                >
                  <div
                    style={{ position: 'relative' }}
                    onClick={() =>
                      setTip(highlight, () => (
                        <HighlightPopup highlight={ah} onDelete={handleDelete} />
                      ))
                    }
                  >
                    {highlight.position.rects.map((rect, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'absolute',
                          left: rect.left,
                          top: rect.top,
                          width: rect.width,
                          height: rect.height,
                          background: ah.highlightColor,
                          opacity: 0.5,
                          mixBlendMode: 'multiply',
                          borderRadius: 2,
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                </Popup>
              )
            }}
            highlights={highlights}
          />
        )}
      </PdfLoader>
    </div>
  )
}
