import {
  AlertTriangle, ArrowLeft, ArrowRight, Bell, BellOff, BookOpen, Brain, CalendarDays, Check, ChevronDown,
  ChevronRight, CircleAlert, CircleCheck, Clock3, Cloud, CloudOff, Crown, Download, Eye, EyeOff,
  FileText, Gift, GraduationCap, Home, KeyRound, LayoutDashboard, ListChecks, LogOut, Mail, Menu, Moon,
  MoreHorizontal, MoreVertical, Palette, PencilLine, Play, Plus, RotateCcw, Search, Settings,
  ShieldCheck, ShoppingBag, Smartphone, Sparkles, Star, Sun, Swords, Target, Trash2, TrendingUp,
  Trophy, UserRound, UsersRound, X,
  type LucideIcon,
} from 'lucide-react'

const IKONE = {
  nazad: ArrowLeft, napred: ArrowRight, obavestenja: Bell, obavestenjaIskljucena: BellOff, knjiga: BookOpen,
  mozak: Brain, raspored: CalendarDays, potvrda: Check, dole: ChevronDown,
  desno: ChevronRight, upozorenje: CircleAlert, gotovo: CircleCheck, vreme: Clock3,
  sacuvano: Cloud, offline: CloudOff, titula: Crown, nagrade: Gift,
  skola: GraduationCap, danas: Home, pregled: LayoutDashboard, zadaci: ListChecks,
  meni: Menu, mejl: Mail, odjava: LogOut, tamna: Moon, vise: MoreHorizontal, opcije: MoreVertical, izgled: Palette, uredi: PencilLine,
  pokreni: Play, dodaj: Plus, ponovi: RotateCcw, pretraga: Search,
  podesavanja: Settings, preuzmi: Download, prikazi: Eye, sakrij: EyeOff, dokument: FileText,
  lozinka: KeyRound, privatnost: ShieldCheck, prodavnica: ShoppingBag, uredjaj: Smartphone,
  sjaj: Sparkles, zvezda: Star, svetla: Sun, sah: Swords, cilj: Target, obrisi: Trash2,
  napredak: TrendingUp, pehar: Trophy, dete: UserRound, deca: UsersRound, opasnost: AlertTriangle, zatvori: X,
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
