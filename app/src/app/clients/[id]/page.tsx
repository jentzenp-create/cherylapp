import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import StartSessionButton from './StartSessionButton'
import { Calendar, MessageSquare, Highlighter, ArrowRight } from 'lucide-react'
import type { Session, Annotation } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientProfilePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: client }, { data: sessions }, { data: annotations }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase
      .from('sessions')
      .select('*')
      .eq('client_id', id)
      .order('start_time', { ascending: false }),
    supabase
      .from('annotations')
      .select(`
        *,
        section:manual_sections(id, title, manual_id, manual:manuals(id, title)),
        manual:manuals(id, title)
      `)
      .eq('client_id', id)
      .eq('scope', 'client')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!client) notFound()

  function getLink(ann: any) {
    const section = ann.section
    const manual = ann.manual
    if (section?.manual_id) return `/manuals/${section.manual_id}/read?section=${section.id}`
    if (ann.manual_id) return `/manuals/${ann.manual_id}/read`
    if (manual?.id) return `/manuals/${manual.id}/read`
    return null
  }

  function getSource(ann: any) {
    const section = ann.section
    const manual = ann.manual
    const manualTitle = section?.manual?.title ?? manual?.title ?? 'Manual'
    const locationLabel = section?.title ?? (ann.page_number ? `Page ${ann.page_number}` : null)
    return { manualTitle, locationLabel }
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-8">
        {/* Client header */}
        <div className="glass rounded-2xl p-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-100 to-sky-200 flex items-center justify-center text-sky-600 font-bold text-xl">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-stone-800">{client.name}</h1>
              {client.email && <p className="text-sm text-stone-400">{client.email}</p>}
              {client.phone && <p className="text-sm text-stone-400">{client.phone}</p>}
            </div>
          </div>
          <StartSessionButton clientId={client.id} clientName={client.name} />
        </div>

        {/* Sessions */}
        <div>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3 px-1">
            Sessions ({sessions?.length ?? 0})
          </h2>
          <div className="glass rounded-2xl overflow-hidden divide-y divide-white/60">
            {(sessions as Session[] | null)?.map((session) => (
              <div key={session.id} className="px-5 py-4 flex items-center gap-3">
                <Calendar className="w-4 h-4 text-stone-300 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-stone-700">
                    {new Date(session.start_time).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </p>
                  {session.end_time && (
                    <p className="text-xs text-stone-400">
                      {new Date(session.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      {' – '}
                      {new Date(session.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  {!session.end_time && (
                    <p className="text-xs text-gold-500 font-medium">In progress</p>
                  )}
                </div>
              </div>
            ))}
            {(!sessions || sessions.length === 0) && (
              <div className="text-center py-10 text-stone-300 text-sm">No sessions yet.</div>
            )}
          </div>
        </div>

        {/* Annotations */}
        <div>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3 px-1">
            Notes & Highlights
          </h2>
          <div className="glass rounded-2xl overflow-hidden divide-y divide-white/60">
            {(annotations as Annotation[] | null)?.map((ann) => {
              const link = getLink(ann)
              const { manualTitle, locationLabel } = getSource(ann)

              return (
                <div key={ann.id} className="px-5 py-4 flex gap-3">
                  {ann.color ? (
                    <span className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ background: ann.color }} />
                  ) : ann.type === 'highlight' ? (
                    <Highlighter className="w-4 h-4 text-gold-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
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
                          className="ml-auto flex items-center gap-0.5 text-xs text-gold-500 hover:text-gold-600 transition-colors flex-shrink-0"
                        >
                          Go <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                    {ann.exact_text && (
                      <p className="text-sm text-stone-700 italic line-clamp-2">&ldquo;{ann.exact_text}&rdquo;</p>
                    )}
                    {ann.content && (
                      <p className="text-sm text-stone-600 mt-0.5">{ann.content}</p>
                    )}
                    <p className="text-xs text-stone-300 mt-1">
                      {new Date(ann.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )
            })}
            {(!annotations || annotations.length === 0) && (
              <div className="text-center py-10 text-stone-300 text-sm">No annotations yet.</div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
