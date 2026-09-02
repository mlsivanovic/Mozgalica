import {
  ArrowLeft, ArrowRight, Bell, BookOpen, Brain, CalendarDays, Check, ChevronDown,
  ChevronRight, CircleAlert, CircleCheck, Clock3, Cloud, CloudOff, Crown, Download,
  Gift, GraduationCap, Home, LayoutDashboard, ListChecks, Menu, Moon, MoreHorizontal,
  Palette, PencilLine, Play, Plus, RotateCcw, Search, Settings, ShoppingBag,
  Sparkles, Star, Sun, Swords, Target, TrendingUp, Trophy, UserRound, UsersRound, X,
  type LucideIcon,
} from 'lucide-react'

const IKONE = {
  nazad: ArrowLeft, napred: ArrowRight, obavestenja: Bell, knjiga: BookOpen,
  mozak: Brain, raspored: CalendarDays, potvrda: Check, dole: ChevronDown,
  desno: ChevronRight, upozorenje: CircleAlert, gotovo: CircleCheck, vreme: Clock3,
  sacuvano: Cloud, offline: CloudOff, titula: Crown, nagrade: Gift,
  skola: GraduationCap, danas: Home, pregled: LayoutDashboard, zadaci: ListChecks,
  meni: Menu, tamna: Moon, vise: MoreHorizontal, izgled: Palette, uredi: PencilLine,
  pokreni: Play, dodaj: Plus, ponovi: RotateCcw, pretraga: Search,
  podesavanja: Settings, preuzmi: Download, prodavnica: ShoppingBag, sjaj: Sparkles, zvezda: Star,
  svetla: Sun, sah: Swords, cilj: Target, napredak: TrendingUp, pehar: Trophy, dete: UserRound,
  deca: UsersRound, zatvori: X,
} satisfies Record<string, LucideIcon>

export type ImeIkone = keyof typeof IKONE

export function Ikona({ ime, velicina = 22, debljina = 2 }: {
  ime: ImeIkone
  velicina?: number
  debljina?: number
}) {
  const Komponenta = IKONE[ime]
  return <Komponenta size={velicina} strokeWidth={debljina} aria-hidden="true" />
}
