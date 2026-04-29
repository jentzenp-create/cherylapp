import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ReadingView from './ReadingView'
import PDFViewerWrapper from '@/components/manual/PDFViewerWrapper'
import { ChevronLeft, List } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ section?: string }>
}

export default async function ReadPage({ params, searchParams }: Props) {
  const { id } = await params
  const { section: sectionId } = await searchParams
  const supabase = await createClient()

  const [{ data: manual }, { data: allSections }] = await Promise.all([
    supabase.from('manuals').select('id, title, pdf_url').eq('id', id).single(),
    supabase
      .from('manual_sections')
      .select('id, title, chapter, order_idx, page_number')
      .eq('manual_id', id)
      .order('order_idx'),
  ])

  if (!manual) notFound()

  // ── PDF mode ────────────────────────────────────────────────────────────────
  if (manual.pdf_url) {
    const activeSection = allSections?.find((s) => s.id === sectionId) || allSections?.[0]
    // Build a section-id → page-number map so the client can react to URL changes directly
    const sectionPages: Record<string, number> = {}
    allSections?.forEach((s) => { if (s.page_number) sectionPages[s.id] = s.page_number })
    const defaultPage = allSections?.[0]?.page_number

    return (
      <AppLayout>
        <div className="flex h-full">
          {/* Section sidebar (desktop) */}
          <div className="hidden lg:flex flex-col w-64 border-r border-white/50 py-4 overflow-y-auto flex-shrink-0">
            <Link
              href={`/manuals/${id}`}
              className="flex items-center gap-1.5 px-4 py-2 text-xs text-stone-400 hover:text-stone-600 transition-colors mb-2"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Contents
            </Link>
            <div className="space-y-0.5 px-2">
              {allSections?.map((s) => (
                <Link
                  key={s.id}
                  href={`/manuals/${id}/read?section=${s.id}`}
                  className={`block px-3 py-2 rounded-lg text-xs transition-colors leading-tight ${
                    s.id === activeSection?.id
                      ? 'bg-gold-100/80 text-gold-700 font-medium'
                      : 'text-stone-500 hover:bg-white/50 hover:text-stone-700'
                  }`}
                >
                  {s.title}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            {/* Top bar — title updates via server re-render */}
            <div className="flex items-center gap-3 px-4 py-3 glass border-b border-white/50 flex-shrink-0">
              <Link
                href={`/manuals/${id}`}
                className="lg:hidden flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Contents
              </Link>
              <span className="text-sm font-medium text-stone-700 truncate">
                {activeSection?.title || manual.title}
              </span>
            </div>

            {/* PDF fills remaining height */}
            <div className="flex-1 relative bg-stone-100/30 h-full">
              <Suspense fallback={<div className="flex items-center justify-center h-full text-stone-400 text-sm animate-pulse">Loading viewer…</div>}>
                <PDFViewerWrapper
                  pdfUrl={manual.pdf_url}
                  manualId={manual.id}
                  sectionPages={sectionPages}
                  defaultPage={defaultPage}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  // ── Text / HTML mode (fallback for manuals without a PDF) ───────────────────
  const activeSectionId = sectionId || allSections?.[0]?.id

  if (!activeSectionId) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-stone-300 text-sm">
          No content found for this manual.
        </div>
      </AppLayout>
    )
  }

  const { data: activeSection } = await supabase
    .from('manual_sections')
    .select('*')
    .eq('id', activeSectionId)
    .single()

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Section sidebar (desktop) */}
        <div className="hidden lg:flex flex-col w-56 border-r border-white/50 py-4 overflow-y-auto flex-shrink-0">
          <Link
            href={`/manuals/${id}`}
            className="flex items-center gap-1.5 px-4 py-2 text-xs text-stone-400 hover:text-stone-600 transition-colors mb-2"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Contents
          </Link>
          <div className="space-y-0.5 px-2">
            {allSections?.map((s) => (
              <Link
                key={s.id}
                href={`/manuals/${id}/read?section=${s.id}`}
                className={`block px-3 py-2 rounded-lg text-xs transition-colors leading-tight ${
                  s.id === activeSectionId
                    ? 'bg-gold-100/80 text-gold-700 font-medium'
                    : 'text-stone-500 hover:bg-white/50 hover:text-stone-700'
                }`}
              >
                {s.title}
              </Link>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-6 lg:p-10">
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <Link
                href={`/manuals/${id}`}
                className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors"
              >
                <List className="w-4 h-4" />
                Contents
              </Link>
            </div>

            <div className="mb-6">
              <p className="text-xs text-stone-400 uppercase tracking-widest mb-1">
                {activeSection?.chapter}
              </p>
              <h1 className="text-xl font-semibold text-stone-800">{activeSection?.title}</h1>
            </div>

            {activeSection && (
              <ReadingView sectionId={activeSection.id} section={activeSection} />
            )}

            {allSections && (
              <div className="flex items-center justify-between mt-12 pt-8 border-t border-stone-100">
                {(() => {
                  const idx = allSections.findIndex((s) => s.id === activeSectionId)
                  const prev = allSections[idx - 1]
                  const next = allSections[idx + 1]
                  return (
                    <>
                      {prev ? (
                        <Link
                          href={`/manuals/${id}/read?section=${prev.id}`}
                          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span className="line-clamp-1 max-w-[140px]">{prev.title}</span>
                        </Link>
                      ) : <span />}
                      {next ? (
                        <Link
                          href={`/manuals/${id}/read?section=${next.id}`}
                          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
                        >
                          <span className="line-clamp-1 max-w-[140px]">{next.title}</span>
                          <ChevronLeft className="w-4 h-4 rotate-180" />
                        </Link>
                      ) : <span />}
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
