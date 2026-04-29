'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'

export default function AddClientModal() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    await supabase.from('clients').insert({ name: name.trim(), email: email || null, phone: phone || null })

    setLoading(false)
    setOpen(false)
    setName('')
    setEmail('')
    setPhone('')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 text-white text-sm font-semibold shadow-md shadow-gold-200 hover:from-gold-500 hover:to-gold-600 transition-all active:scale-[0.98]"
      >
        <Plus className="w-4 h-4" />
        Add client
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative glass rounded-3xl p-8 w-full max-w-md shadow-2xl shadow-stone-200/50"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-stone-800">New client</h2>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">Name *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/70 border border-white/80 text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-gold-300/60 transition-all text-sm"
                    placeholder="Client name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/70 border border-white/80 text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-gold-300/60 transition-all text-sm"
                    placeholder="optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">Phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/70 border border-white/80 text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-gold-300/60 transition-all text-sm"
                    placeholder="optional"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 text-white font-semibold text-sm shadow-md shadow-gold-200 hover:from-gold-500 hover:to-gold-600 transition-all active:scale-[0.98] disabled:opacity-60 mt-2"
                >
                  {loading ? 'Adding…' : 'Add client'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
