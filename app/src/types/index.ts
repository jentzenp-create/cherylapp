export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  notes?: string
  created_at: string
}

export interface Session {
  id: string
  client_id: string
  start_time: string
  end_time?: string
  summary?: string
  client?: Client
}

export interface Manual {
  id: string
  title: string
  description?: string
  cover_color?: string
  pdf_url?: string
  created_at: string
}

export interface ManualSection {
  id: string
  manual_id: string
  chapter: string
  title: string
  content: string
  order_idx: number
  image_urls?: string[]
  page_number?: number
}

export type AnnotationType = 'highlight' | 'note'
export type AnnotationScope = 'client' | 'global'

export interface Annotation {
  id: string
  section_id?: string
  manual_id?: string
  page_number?: number
  color?: string
  type: AnnotationType
  scope: AnnotationScope
  client_id?: string
  session_id?: string
  content?: string
  exact_text?: string
  position_data?: Json
  created_at: string
  client?: Client
  session?: Session
  section?: ManualSection
}

export interface ActiveSession {
  sessionId: string
  clientId: string
  clientName: string
  startTime: string
}
