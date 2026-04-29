'use client'

import { useRef, useCallback, useState } from 'react'
import Image from 'next/image'
import AnnotationPopover, { useAnnotationPopover } from './AnnotationPopover'
import type { ManualSection, Annotation } from '@/types'

interface Props {
  section: ManualSection
  annotations: Annotation[]
  onAnnotationChange: () => void
}

export default function ContentRenderer({ section, annotations, onAnnotationChange }: Props) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  const popoverState = useAnnotationPopover(section.id, onAnnotationChange)
  const { handleTextSelection, handleExistingAnnotationTap } = popoverState

  const handleSelectionEnd = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return
    const text = selection.toString().trim()
    if (!text || text.length < 2) return
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    handleTextSelection(text, { x: rect.left, y: rect.bottom + window.scrollY })
    selection.removeAllRanges()
  }, [handleTextSelection])

  function handleContentClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement

    // Sticky note icon click — toggle inline note display
    if (target.dataset.noteId) {
      e.stopPropagation()
      setExpandedNote(expandedNote === target.dataset.noteId ? null : target.dataset.noteId)
      return
    }

    // Click on a highlighted mark — open the delete/edit popover
    const annotationId = target.dataset.annotationId
    if (!annotationId) return
    const ann = annotations.find((a) => a.id === annotationId)
    if (ann) {
      const rect = target.getBoundingClientRect()
      handleExistingAnnotationTap(ann, { x: rect.left, y: rect.bottom + window.scrollY })
    }
  }

  function buildAnnotatedContent() {
    let html = section.content

    // Sort by text length desc to avoid nested replacement conflicts
    const toAnnotate = annotations.filter((a) => a.exact_text)
    toAnnotate.sort((a, b) => (b.exact_text?.length ?? 0) - (a.exact_text?.length ?? 0))

    for (const ann of toAnnotate) {
      if (!ann.exact_text) continue
      const escaped = ann.exact_text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(escaped, 'g')
      const cls = ann.scope === 'client' ? 'annotation-highlight-client' : 'annotation-highlight-global'

      if (ann.type === 'highlight') {
        html = html.replace(
          re,
          `<mark class="${cls}" data-annotation-id="${ann.id}">${ann.exact_text}</mark>`
        )
      } else if (ann.type === 'note') {
        // Highlighted text + a small sticky note icon after it
        html = html.replace(
          re,
          `<mark class="${cls}" data-annotation-id="${ann.id}">${ann.exact_text}</mark><span class="note-marker" data-note-id="${ann.id}" data-annotation-id="${ann.id}" title="View note">📝</span>`
        )
      }
    }

    return html
  }

  const noteAnnotations = annotations.filter((a) => a.type === 'note')

  return (
    <div className="relative">
      {/* Main content */}
      <div
        ref={contentRef}
        className="prose prose-stone max-w-none text-stone-700 leading-relaxed"
        style={{ fontSize: '1.05rem', lineHeight: '1.85' }}
        onMouseUp={handleSelectionEnd}
        onTouchEnd={handleSelectionEnd}
        onClick={handleContentClick}
        dangerouslySetInnerHTML={{ __html: buildAnnotatedContent() }}
      />

      {/* Inline expanded note card — shown below content when a note marker is tapped */}
      {expandedNote && (() => {
        const ann = annotations.find((a) => a.id === expandedNote)
        if (!ann) return null
        return (
          <div className={`mt-4 p-4 rounded-2xl border text-sm animate-in fade-in slide-in-from-top-1 duration-150 ${
            ann.scope === 'client'
              ? 'bg-gold-50 border-gold-200'
              : 'bg-sky-50 border-sky-200'
          }`}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">
                {ann.scope === 'client' ? 'Client note' : 'Global note'}
              </p>
              <button
                onClick={() => setExpandedNote(null)}
                className="text-stone-300 hover:text-stone-500 text-xs leading-none"
              >
                ✕
              </button>
            </div>
            {ann.exact_text && (
              <p className="text-xs text-stone-400 italic mb-2 pl-3 border-l-2 border-stone-200">
                "{ann.exact_text}"
              </p>
            )}
            <p className="text-stone-700">{ann.content}</p>
          </div>
        )
      })()}

      {/* Embedded images */}
      {section.image_urls && section.image_urls.length > 0 && (
        <div className="mt-6 space-y-4">
          {section.image_urls.map((url, i) => (
            <div key={i} className="rounded-xl overflow-hidden border border-stone-100">
              <Image
                src={url}
                alt={`Figure ${i + 1}`}
                width={800}
                height={600}
                className="w-full h-auto object-contain bg-stone-50"
              />
            </div>
          ))}
        </div>
      )}

      {/* Notes without an exact_text anchor — show at bottom as fallback */}
      {noteAnnotations.filter((a) => !a.exact_text).length > 0 && (
        <div className="mt-8 space-y-3">
          <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-widest">
            Section notes
          </h4>
          {noteAnnotations
            .filter((a) => !a.exact_text)
            .map((ann) => (
              <div
                key={ann.id}
                onClick={() => handleExistingAnnotationTap(ann, { x: 0, y: 0 })}
                className={`p-3 rounded-xl text-sm cursor-pointer transition-colors ${
                  ann.scope === 'client'
                    ? 'bg-gold-50/60 border border-gold-100'
                    : 'bg-sky-50/60 border border-sky-100'
                }`}
              >
                <p className="text-stone-700">{ann.content}</p>
              </div>
            ))}
        </div>
      )}

      {/* Popover */}
      <AnnotationPopover popoverState={popoverState} />
    </div>
  )
}
