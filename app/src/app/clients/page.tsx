import { createClient } from '@/lib/supabase/server'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import AddClientModal from './AddClientModal'
import { Users, ChevronRight } from 'lucide-react'
import type { Client } from '@/types'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('name')

  return (
    <AppLayout>
      <div className="p-6 lg:p-10 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-stone-800">Clients</h1>
            <p className="text-stone-400 text-sm mt-1">
              {clients?.length ?? 0} client{clients?.length !== 1 ? 's' : ''}
            </p>
          </div>
          <AddClientModal />
        </div>

        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/60">
          {(clients as Client[] | null)?.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-gold-50/40 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-100 to-sky-200 flex items-center justify-center text-sky-600 font-semibold text-sm">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-700">{client.name}</p>
                  {client.email && (
                    <p className="text-xs text-stone-400">{client.email}</p>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-gold-400 transition-colors" />
            </Link>
          ))}

          {(!clients || clients.length === 0) && (
            <div className="text-center py-16 text-stone-300">
              <Users className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">No clients yet. Add your first client above.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
