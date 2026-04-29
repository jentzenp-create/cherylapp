import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { BookOpen, ChevronRight } from 'lucide-react'
import type { Manual } from '@/types'

const COVER_GRADIENTS = [
  'from-sky-200 to-blue-300',
  'from-gold-200 to-amber-300',
  'from-emerald-100 to-teal-200',
  'from-violet-100 to-purple-200',
  'from-rose-100 to-pink-200',
  'from-orange-100 to-amber-200',
]

export default async function ManualsPage() {
  const supabase = await createClient()
  const { data: manuals } = await supabase
    .from('manuals')
    .select('*')
    .order('created_at')

  return (
    <AppLayout>
      <div className="p-6 lg:p-10 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-stone-800">Manuals</h1>
          <p className="text-stone-400 text-sm mt-1">Select a manual to begin reading</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {(manuals as Manual[] | null)?.map((manual, i) => (
            <Link key={manual.id} href={`/manuals/${manual.id}`}>
              <div className="group rounded-2xl overflow-hidden shadow-md shadow-stone-100 hover:shadow-lg hover:shadow-stone-200 transition-all hover:-translate-y-0.5 cursor-pointer bg-white/60">
                {/* Cover */}
                <div className={`h-36 bg-gradient-to-br ${COVER_GRADIENTS[i % COVER_GRADIENTS.length]} flex items-center justify-center`}>
                  <BookOpen className="w-10 h-10 text-white/80" />
                </div>
                {/* Info */}
                <div className="p-4 flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-stone-700 leading-tight line-clamp-2">
                      {manual.title}
                    </h2>
                    {manual.description && (
                      <p className="text-xs text-stone-400 mt-1 line-clamp-2">{manual.description}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-gold-400 transition-colors flex-shrink-0 mt-0.5" />
                </div>
              </div>
            </Link>
          ))}

          {(!manuals || manuals.length === 0) && (
            <div className="col-span-3 text-center py-16 text-stone-300">
              <BookOpen className="w-12 h-12 mx-auto mb-3" />
              <p className="text-sm">No manuals yet. Run the PDF parser to import content.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
