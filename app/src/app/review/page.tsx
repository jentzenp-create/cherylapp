import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { MessageSquare, Highlighter, ArrowRight } from 'lucide-react'
import type { Annotation } from '@/types'

export default async function ReviewPage() {
  const supabase = await createClient()

  const { data: annotations } = await supabase
    .from('annotations')
    .select(`
      *,
      section:manual_sections(id, title, manual_id, manual:manuals(id, title)),
      manual:manuals(id, title)
    `)
    .eq('scope', 'global')
    .order('created_at', { ascending: false })

  const notes = (annotations as Annotation[] | null)?.filter((a) => a.type === 'note') ?? []
  const highlights = (annotations as Annotation[] | null)?.filter((a) => a.type === 'highlight') ?? []

  type ReviewAnnotation = Annotation & {
    section?: { id: string; title: string; manual_id: string; manual?: { id: string; title: string } };
    manual?: { id: string; title: string };
  }

  function getLink(ann: ReviewAnnotation) {
    const section = ann.section
    const manual = ann.manual
    if (section?.manual_id) return `/manuals/${section.manual_id}/read?section=${section.id}`
    if (ann.manual_id) return `/manuals/${ann.manual_id}/read`
    if (manual?.id) return `/manuals/${manual.id}/read`
    return null
  }

  function getSource(ann: ReviewAnnotation) {
    const section = ann.section
    const manual = ann.manual
    const manualTitle = section?.manual?.title ?? manual?.title ?? 'Manual'
    const locationLabel = section?.title ?? (ann.page_number ? `Page ${ann.page_number}` : null)
    return { manualTitle, locationLabel }
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-10">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Review Notes</h1>
          <p className="text-stone-400 text-sm mt-1">
            Your global notes and highlights across all manuals
          </p>
        </div>

        {/* Global notes */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-stone-700">Global notes ({notes.length})</h2>
          </div>
          <div className="space-y-3">
            {notes.map((ann) => {
              const link = getLink(ann)
              const { manualTitle, locationLabel } = getSource(ann)
              return (
                <div key={ann.id} className="glass rounded-2xl p-5">
                  <div className="flex items-center gap-1.5 mb-3">
                    {ann.color && (
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ann.color }} />
                    )}
                    <span className="text-xs text-stone-400">{manualTitle}</span>
                    {locationLabel && (
                      <>
                        <span className="text-stone-200">·</span>
                        <span className="text-xs text-stone-400">{locationLabel}</span>
                      </>
                    )}
                    {link && (
                      <Link
                        href={link}
                        className="ml-auto flex items-center gap-1 text-xs text-gold-500 hover:text-gold-600 transition-colors"
                      >
                        Go <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  {ann.exact_text && (
                    <p className="text-xs text-stone-400 italic mb-2 pl-3 border-l-2 border-stone-100">
                      &ldquo;{ann.exact_text}&rdquo;
                    </p>
                  )}
                  <p className="text-sm text-stone-700">{ann.content}</p>
                  <p className="text-xs text-stone-300 mt-2">
                    {new Date(ann.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              )
            })}
            {notes.length === 0 && (
              <div className="text-center py-10 text-stone-300 text-sm glass rounded-2xl">
                No global notes yet. Add them while reading.
              </div>
            )}
          </div>
        </div>

        {/* Global highlights */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Highlighter className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-stone-700">Global highlights ({highlights.length})</h2>
          </div>
          <div className="glass rounded-2xl overflow-hidden divide-y divide-white/60">
            {highlights.map((ann) => {
              const link = getLink(ann)
              const { manualTitle, locationLabel } = getSource(ann)
              return (
                <div key={ann.id} className="px-5 py-4 flex gap-3">
                  {ann.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                      style={{ background: ann.color }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-xs text-stone-400">{manualTitle}</span>
                      {locationLabel && (
                        <>
                          <span className="text-stone-200">·</span>
                          <span className="text-xs text-stone-400">{locationLabel}</span>
                        </>
                      )}
                      {link && (
                        <Link
                          href={link}
                          className="ml-auto flex items-center gap-1 text-xs text-gold-500 hover:text-gold-600"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                    <p className="text-sm text-stone-700 italic">&ldquo;{ann.exact_text}&rdquo;</p>
                  </div>
                </div>
              )
            })}
            {highlights.length === 0 && (
              <div className="text-center py-10 text-stone-300 text-sm">No global highlights yet.</div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
