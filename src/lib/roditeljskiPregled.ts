import { supabase } from './supabase'

export interface RoditeljskiZadatak {
  id: string
  kind: 'quiz' | 'chess'
  childProfileId: string | null
  childName: string | null
  avatar: string | null
  title: string
  createdAt: string
  state: 'assigned' | 'in_progress' | 'unassigned'
  unassigned: boolean
}
export interface RoditeljskiRaspored {
  id: string
  kind: 'quiz' | 'chess'
  childProfileId: string
  childName: string
  title: string
  active: boolean
  nextAt: string
  error: string | null
}
export interface DnevniPregledDeteta {
  id: string
  name: string
  avatar: string
  completedToday: number
  quizCount: number
  chessCount: number
  lastResult: { id: string; score: number | null; pending: boolean; at: string } | null
}
export interface RoditeljskiDogadjaj {
  id: string
  kind: 'quiz' | 'chess'
  childProfileId: string | null
  childName: string
  title: string
  at: string
  score: number | null
  pending: boolean
  stars: number | null
  result: string | null
}
export interface RoditeljskiPregled {
  ok: boolean
  date: string
  updatedAt: string
  children: DnevniPregledDeteta[]
  schedules: RoditeljskiRaspored[]
  reviewCount: number
  rewardCount: number
  events: RoditeljskiDogadjaj[]
}
async function procitaj<T>(ime: string, dete: string): Promise<T> {
  const { data, error } = await supabase().rpc(ime, { p_child_profile_id: dete || null })
  if (error) throw new Error('Pregled trenutno nije dostupan. Pokušaj ponovo.')
  if (!data?.ok) throw new Error(data?.error === 'not_found' ? 'Profil deteta nije dostupan.' : 'Nemaš dozvolu za ovaj pregled.')
  return data as T
}
export const ucitajRoditeljskiPregled = (dete: string) => procitaj<RoditeljskiPregled>('admin_parent_overview', dete)
export async function ucitajRoditeljskeZadatke(dete: string): Promise<RoditeljskiZadatak[]> {
  return (await procitaj<{ tasks: RoditeljskiZadatak[] }>('admin_parent_tasks', dete)).tasks
}

export function kljucZadatka(z: RoditeljskiZadatak): string {
  return `${z.kind}:${z.id}:${z.childProfileId ?? '-'}`
}

// Pretraga ignoriše kvačice da bi „sah” našao „Šah”.
const bezKvacica = (tekst: string) => tekst.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export interface FilterZadataka {
  vrsta: string
  stanje: string
  pretraga: string
}

export function filtrirajZadatke(zadaci: RoditeljskiZadatak[], filter: FilterZadataka): RoditeljskiZadatak[] {
  const trazeni = bezKvacica(filter.pretraga.trim())
  return zadaci.filter(z =>
    (!filter.vrsta || z.kind === filter.vrsta)
    && (!filter.stanje || z.state === filter.stanje)
    && (!trazeni || bezKvacica(`${z.title} ${z.childName ?? ''}`).includes(trazeni)))
}

export interface RezultatBrisanjaZadataka {
  removed: number
  archived: number
  preserved: number
  errors: Array<{ id: string; message: string }>
}

export async function obrisiRoditeljskeZadatke(zadaci: RoditeljskiZadatak[]): Promise<RezultatBrisanjaZadataka> {
  if (zadaci.length === 0) return { removed: 0, archived: 0, preserved: 0, errors: [] }
  const { data, error } = await supabase().rpc('admin_delete_parent_tasks', {
    p_tasks: zadaci.map(z => ({ kind: z.kind, id: z.id, childProfileId: z.childProfileId })),
  })
  if (error) throw new Error('Zadatke trenutno nije moguće obrisati. Pokušaj ponovo.')
  const rezultat = data as { ok: boolean; error?: string; removed?: number; archived?: number; preserved?: number; errors?: Array<{ id: string; message: string }> }
  if (!rezultat?.ok) throw new Error(rezultat?.error === 'forbidden' ? 'Nemaš dozvolu za brisanje zadataka.' : 'Brisanje zadataka nije uspelo. Pokušaj ponovo.')
  return {
    removed: rezultat.removed ?? 0,
    archived: rezultat.archived ?? 0,
    preserved: rezultat.preserved ?? 0,
    errors: rezultat.errors ?? [],
  }
}

