import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, Edit3 } from 'lucide-react'
import type { ManualSection } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ManualTOCPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: manual }, { data: sections }] = await Promise.all([
    supabase.from('manuals').select('*').eq('id', id).single(),
    supabase
      .from('manual_sections')
      .select('id, chapter, title, order_idx')
      .eq('manual_id', id)
      .order('order_idx'),
  ])

  if (!manual) notFound()

  // Group sections by chapter
  const chapters = (sections as ManualSection[] | null)?.reduce<Record<string, ManualSection[]>>(
    (acc, section) => {
      const ch = section.chapter || 'Main'
      if (!acc[ch]) acc[ch] = []
      acc[ch].push(section)
      return acc
    },
    {}
  ) ?? {}

  return (
    <AppLayout>
      <div className="p-6 lg:p-10 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <p className="text-xs text-stone-400 mb-1">Manual</p>
            <h1 className="text-2xl font-semibold text-stone-800">{manual.title}</h1>
            {manual.description && (
              <p className="text-stone-400 text-sm mt-1">{manual.description}</p>
            )}
          </div>
          <Link
            href={`/manuals/${id}/edit`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-stone-500 bg-white/60 hover:bg-white/80 border border-white/80 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </Link>
        </div>

        {/* Table of contents */}
        <div className="space-y-6">
          {Object.entries(chapters).map(([chapter, chapterSections]) => (
            <div key={chapter}>
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2 px-1">
                {chapter}
              </h2>
              <div className="glass rounded-2xl overflow-hidden divide-y divide-white/60">
                {chapterSections.map((section) => (
                  <Link
                    key={section.id}
                    href={`/manuals/${id}/read?section=${section.id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-gold-50/50 transition-colors group"
                  >
                    <span className="text-sm text-stone-700 group-hover:text-stone-900">
                      {section.title}
                    </span>
                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-gold-400 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(chapters).length === 0 && (
            <div className="text-center py-16 text-stone-300 text-sm">
              No sections found for this manual.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
