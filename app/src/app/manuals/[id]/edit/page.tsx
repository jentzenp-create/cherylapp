import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EditView from './EditView'
import { ChevronLeft } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ section?: string }>
}

export default async function EditPage({ params, searchParams }: Props) {
  const { id } = await params
  const { section: sectionId } = await searchParams
  const supabase = await createClient()

  const [{ data: manual }, { data: allSections }] = await Promise.all([
    supabase.from('manuals').select('id, title').eq('id', id).single(),
    supabase
      .from('manual_sections')
      .select('id, title, chapter, order_idx')
      .eq('manual_id', id)
      .order('order_idx'),
  ])

  if (!manual) notFound()

  const activeSectionId = sectionId || allSections?.[0]?.id

  const { data: activeSection } = activeSectionId
    ? await supabase.from('manual_sections').select('*').eq('id', activeSectionId).single()
    : { data: null }

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Section list sidebar */}
        <div className="hidden lg:flex flex-col w-56 border-r border-white/50 py-4 overflow-y-auto flex-shrink-0">
          <Link
            href={`/manuals/${id}`}
            className="flex items-center gap-1.5 px-4 py-2 text-xs text-stone-400 hover:text-stone-600 transition-colors mb-2"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Contents
          </Link>
          <div className="px-2 space-y-0.5">
            {allSections?.map((s) => (
              <Link
                key={s.id}
                href={`/manuals/${id}/edit?section=${s.id}`}
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

        {/* Editor */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-6 lg:p-10">
            <div className="flex items-center gap-2 mb-6">
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                Edit mode
              </span>
              <span className="text-xs text-stone-400">{manual.title}</span>
            </div>

            {activeSection ? (
              <EditView section={activeSection} />
            ) : (
              <p className="text-stone-300 text-sm">Select a section to edit.</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
