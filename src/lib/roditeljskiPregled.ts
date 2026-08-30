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
