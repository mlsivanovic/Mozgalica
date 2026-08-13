// Generator: geometrijska tela (4. razred) — klasifikacija (rogljasta/obla),
// osobine kvadra/kocke/piramide (temena, ivice, strane), i bogat fond tvrdnji
// tačno/netačno + višestruki izbor ("koja tvrdnja NIJE tačna", kombinovane
// osobine). Ograničeno na činjenice/klasifikaciju — crtanje mreža ostaje ručno
// unošenje pitanja (kao i "geometrija"/"razlomci" u 3. razredu).
import type { Opcija } from '../../types/db.ts'
import { izaberi, promesaj, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { poeniZaTezinu, upakujRacun } from '../moduli/zajednicko.ts'

interface Rogljasto {
  naziv: string
  temena: number
  ivice: number
  strane: number
}

const ROGLJASTA: Rogljasto[] = [
  { naziv: 'kvadar', temena: 8, ivice: 12, strane: 6 },
  { naziv: 'kocka', temena: 8, ivice: 12, strane: 6 },
  { naziv: 'piramida', temena: 5, ivice: 8, strane: 5 },
]
const OBLA = ['lopta', 'valjak', 'kupa'] as const
const SVA_TELA = [...ROGLJASTA.map((r) => r.naziv), ...OBLA]

// Fond tvrdnji tačno/netačno — dovoljno veliki da t2/t3 imaju bogat prostor
// različitih pitanja (ne samo 3 trivijalna brojanja).
interface Tvrdnja {
  tekst: string
  tacno: boolean
}

const TVRDNJE: Tvrdnja[] = [
  { tekst: 'Kvadar ima 12 ivica.', tacno: true },
  { tekst: 'Kvadar ima 6 temena.', tacno: false },
  { tekst: 'Kvadar ima 8 temena.', tacno: true },
  { tekst: 'Kvadar ima 6 strana.', tacno: true },
  { tekst: 'Sve strane kvadra su kvadrati.', tacno: false },
  { tekst: 'Kvadar ima 3 para podudarnih strana.', tacno: true },
  { tekst: 'Iz svakog temena kvadra polaze 3 ivice.', tacno: true },
  { tekst: 'Kvadar ima po 4 ivice iste dužine, u tri različite dužine (a, b, c).', tacno: true },
  { tekst: 'Kocka ima 8 temena.', tacno: true },
  { tekst: 'Kocka ima 10 ivica.', tacno: false },
  { tekst: 'Kocka ima 12 ivica.', tacno: true },
  { tekst: 'Sve strane kocke su kvadrati.', tacno: true },
  { tekst: 'Sve ivice kocke su jednake dužine.', tacno: true },
  { tekst: 'Kocka ima 5 strana.', tacno: false },
  { tekst: 'Piramida ima 5 temena.', tacno: true },
  { tekst: 'Piramida ima 8 ivica.', tacno: true },
  { tekst: 'Piramida ima 6 strana.', tacno: false },
  { tekst: 'Piramida je obla tela.', tacno: false },
  { tekst: 'Lopta nema ni jedno teme.', tacno: true },
  { tekst: 'Lopta ima ravnu stranu.', tacno: false },
  { tekst: 'Valjak je rogljasto telo.', tacno: false },
  { tekst: 'Valjak ima dve kružne (ravne) strane.', tacno: true },
  { tekst: 'Kupa ima jedno teme (vrh).', tacno: true },
  { tekst: 'Kupa ima dve zakrivljene strane.', tacno: false },
  { tekst: 'Kvadar, kocka i piramida su rogljasta tela.', tacno: true },
  { tekst: 'Lopta, valjak i kupa su obla tela.', tacno: true },
]

// Jednostruka činjenica koja jedinstveno identifikuje TAČNO jedno od 6 tela.
interface Cinjenica {
  tekst: string
  tacanNaziv: string
  objasnjenje: string
}

const SVOJSTVO_JEDNO: Cinjenica[] = [
  { tekst: 'Koje telo ima 5 temena?', tacanNaziv: 'piramida', objasnjenje: 'Piramida (sa kvadratnom osnovom) ima 5 temena: 4 u osnovi i 1 vrh.' },
  { tekst: 'Koje telo ima tačno jedno teme (vrh)?', tacanNaziv: 'kupa', objasnjenje: 'Kupa ima jedan vrh (teme), jednu kružnu ravnu stranu i jednu zakrivljenu stranu.' },
  { tekst: 'Koje telo nema ni jedno teme ni jednu ravnu stranu?', tacanNaziv: 'lopta', objasnjenje: 'Lopta je u celosti ograničena krivom površi — nema ravnih strana, ivica ni temena.' },
  { tekst: 'Koje telo ima dve kružne (ravne) strane?', tacanNaziv: 'valjak', objasnjenje: 'Valjak ima dve podudarne kružne osnove i jednu zakrivljenu bočnu stranu.' },
  { tekst: 'Koje telo ima sve strane oblika kvadrata?', tacanNaziv: 'kocka', objasnjenje: 'Kocka je ograničena sa 6 podudarnih strana oblika kvadrata.' },
  { tekst: 'Koje telo ima 12 ivica, a strane NISU sve kvadrati?', tacanNaziv: 'kvadar', objasnjenje: 'Kvadar ima 12 ivica kao kocka, ali njegove strane su pravougaonici — ne mora svaka biti kvadrat.' },
]

const CINJENICE: Cinjenica[] = [
  {
    tekst: 'Koje telo ima 8 temena, 12 ivica i SVE strane oblika kvadrata?',
    tacanNaziv: 'kocka',
    objasnjenje: 'Kocka ima 8 temena, 12 ivica, a svih 6 strana su podudarni kvadrati (kod kvadra strane su pravougaonici, ne mora svaka biti kvadrat).',
  },
  {
    tekst: 'Koje telo ima 5 temena i 5 strana?',
    tacanNaziv: 'piramida',
    objasnjenje: 'Piramida (sa kvadratnom osnovom) ima 5 temena (4 u osnovi + vrh), 8 ivica i 5 strana (1 osnova + 4 bočne).',
  },
  {
    tekst: 'Koje telo ima 8 temena, 12 ivica, a bar dve njegove strane NISU kvadrati?',
    tacanNaziv: 'kvadar',
    objasnjenje: 'Kvadar ima 8 temena i 12 ivica kao kocka, ali njegove strane su pravougaonici — ne mora svaka biti kvadrat.',
  },
  {
    tekst: 'Koje ROGLJASTO telo ima najmanje temena?',
    tacanNaziv: 'piramida',
    objasnjenje: 'Od rogljastih tela (kvadar, kocka, piramida), kvadar i kocka imaju po 8 temena, a piramida (sa kvadratnom osnovom) samo 5 — najmanje.',
  },
  {
    tekst: 'Koje OBLO telo ima i ravnu i zakrivljenu stranu, ali nema ni jedno teme?',
    tacanNaziv: 'valjak',
    objasnjenje: 'Valjak ima dve ravne (kružne) strane i jednu zakrivljenu, ali nema teme. Kupa ima teme, a lopta nema ravnu stranu.',
  },
]

function nazivneOpcije(rng: Rng, tacanNaziv: string, ostali: string[]): { options: Opcija[]; correctId: string } {
  const svi = promesaj(rng, [tacanNaziv, ...ostali])
  const options = svi.map((naziv, i) => ({ id: `o${i + 1}`, text: naziv }))
  const correctId = options[svi.indexOf(tacanNaziv)].id
  return { options, correctId }
}

// Izabere brojTacnih tačnih i brojNetacnih netačnih tvrdnji (bez ponavljanja),
// izmešano. Vraća i indekse (u odnosu na TVRDNJE) za stabilan potpis.
function izaberiTvrdnje(rng: Rng, brojTacnih: number, brojNetacnih: number): { stavke: Tvrdnja[]; indeksi: number[] } {
  const tacneIdx = TVRDNJE.map((t, i) => [t, i] as const).filter(([t]) => t.tacno)
  const netacneIdx = TVRDNJE.map((t, i) => [t, i] as const).filter(([t]) => !t.tacno)
  const izabraneT = promesaj(rng, tacneIdx).slice(0, brojTacnih)
  const izabraneN = promesaj(rng, netacneIdx).slice(0, brojNetacnih)
  const sve = promesaj(rng, [...izabraneT, ...izabraneN])
  return { stavke: sve.map(([t]) => t), indeksi: sve.map(([, i]) => i) }
}

function opcijeOdTvrdnji(stavke: Tvrdnja[], trazi: 'tacna' | 'netacna'): { options: Opcija[]; correctId: string } {
  const options = stavke.map((s, i) => ({ id: `o${i + 1}`, text: s.tekst }))
  const idx = stavke.findIndex((s) => (trazi === 'tacna' ? s.tacno : !s.tacno))
  return { options, correctId: options[idx].id }
}

export const tela4: TopicGenerator = {
  slug: 'geometrijska-tela-4',
  supportedTypes: ['single', 'numeric', 'truefalse'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty === 1) {
      // Brojanje: temena/ivice/strane kvadra, kocke ili piramide
      const svojstvo = izaberi(rng, ['temena', 'strane', 'ivice'] as const)
      const telo = izaberi(rng, ROGLJASTA)
      const tacan = telo[svojstvo]
      const signature = `tela4:${svojstvo}:${telo.naziv}`
      if (taken.has(signature)) return null
      const ostaliBrojevi = ROGLJASTA.filter((r) => r.naziv !== telo.naziv).map((r) => r[svojstvo])
      return upakujRacun(cfg, rng, {
        text: `Koliko ${svojstvo === 'temena' ? 'temena' : svojstvo === 'strane' ? 'strana' : 'ivica'} ima ${telo.naziv}?`,
        tacan,
        kandidati: [...new Set(ostaliBrojevi)].concat([tacan + 1, tacan - 1]),
        explanation: `${telo.naziv.charAt(0).toUpperCase() + telo.naziv.slice(1)} ima ${tacan} ${svojstvo}.`,
        hint: 'Kvadar i kocka imaju 8 temena, 12 ivica i 6 strana. Piramida (sa kvadratnom osnovom) ima 5 temena, 8 ivica i 5 strana.',
        signature,
        maxDistraktor: 12,
      })
    }

    if (cfg.difficulty === 2) {
      // Tačno/netačno IZ FONDA — ili, ako je zatražen 'single', "koja od 4 je TAČNA"
      const zeljeni = cfg.type === 'auto' ? (rng() < 0.5 ? 'single' : 'truefalse') : cfg.type
      if (zeljeni === 'truefalse') {
        const idx = izaberi(rng, TVRDNJE.map((_, i) => i))
        const tvrdnja = TVRDNJE[idx]
        const signature = `tela4:tvrdnja:${idx}`
        if (taken.has(signature)) return null
        return {
          type: 'truefalse',
          text: tvrdnja.tekst,
          options: null,
          correct: { value: tvrdnja.tacno },
          explanation: tvrdnja.tacno ? `Tačno: ${tvrdnja.tekst}` : `Netačno: ${tvrdnja.tekst}`,
          hint: 'Seti se osobina kvadra, kocke, piramide, lopte, valjka i kupe.',
          points: poeniZaTezinu(cfg.difficulty),
          topicSlug: cfg.topicSlug,
          difficulty: cfg.difficulty,
          signature,
        }
      }
      const { stavke, indeksi } = izaberiTvrdnje(rng, 1, 3)
      const signature = `tela4:izbor-tacna:${[...indeksi].sort((a, b) => a - b).join(',')}`
      if (taken.has(signature)) return null
      const { options, correctId } = opcijeOdTvrdnji(stavke, 'tacna')
      const tacnaStavka = stavke.find((s) => s.tacno)!
      return {
        type: 'single',
        text: 'Koja od navedenih tvrdnji je TAČNA?',
        options,
        correct: { optionId: correctId },
        explanation: `Tačna tvrdnja je: „${tacnaStavka.tekst}"`,
        hint: 'Provera svake tvrdnje jednu po jednu — samo jedna je tačna.',
        points: poeniZaTezinu(cfg.difficulty),
        topicSlug: cfg.topicSlug,
        difficulty: cfg.difficulty,
        signature,
      }
    }

    if (cfg.difficulty === 3) {
      // Teže: 3 tačne + 1 netačna — "koja NIJE tačna" (ne dovoljno samo prepoznati OČIGLEDNO tačnu)
      const { stavke, indeksi } = izaberiTvrdnje(rng, 3, 1)
      const signature = `tela4:izbor-netacna:${[...indeksi].sort((a, b) => a - b).join(',')}`
      if (taken.has(signature)) return null
      const { options, correctId } = opcijeOdTvrdnji(stavke, 'netacna')
      const netacnaStavka = stavke.find((s) => !s.tacno)!
      return {
        type: 'single',
        text: 'Koja od navedenih tvrdnji NIJE tačna?',
        options,
        correct: { optionId: correctId },
        explanation: `Netačna tvrdnja je: „${netacnaStavka.tekst}"`,
        hint: 'Sve ostale tvrdnje su tačne — provera svake, pažljivo, jedne po jedne.',
        points: poeniZaTezinu(cfg.difficulty),
        topicSlug: cfg.topicSlug,
        difficulty: cfg.difficulty,
        signature,
      }
    }

    if (cfg.difficulty === 4) {
      // 50/50: klasifikacija rogljasto/oblo, ili jednostruka činjenica (koje telo ima osobinu X)
      if (rng() < 0.5) {
        const oblo = rng() < 0.5
        const tacanNaziv = oblo ? izaberi(rng, OBLA) : izaberi(rng, ROGLJASTA).naziv
        const ostali = oblo ? ROGLJASTA.map((r) => r.naziv) : [...OBLA]
        const signature = `tela4:klasifikacija:${oblo ? 'oblo' : 'rogljasto'}:${tacanNaziv}`
        if (taken.has(signature)) return null
        const { options, correctId } = nazivneOpcije(rng, tacanNaziv, ostali)
        return {
          type: 'single',
          text: `Koje od navedenih tela je ${oblo ? 'OBLO' : 'ROGLJASTO'} telo?`,
          options,
          correct: { optionId: correctId },
          explanation: oblo
            ? `${tacanNaziv} je obla tela — ograničeno je krivom (ili krivom i ravnim) površima. Ostala navedena tela su rogljasta.`
            : `${tacanNaziv} je rogljasto telo — ograničeno je samo ravnim površima. Ostala navedena tela su obla.`,
          hint: 'Rogljasta tela (kvadar, kocka, piramida) ograničena su samo ravnim površima. Obla tela (lopta, valjak, kupa) imaju bar jednu zakrivljenu površ.',
          points: poeniZaTezinu(cfg.difficulty),
          topicSlug: cfg.topicSlug,
          difficulty: cfg.difficulty,
          signature,
        }
      }
      const cinjenica = izaberi(rng, SVOJSTVO_JEDNO)
      const signature = `tela4:svojstvo:${SVOJSTVO_JEDNO.indexOf(cinjenica)}`
      if (taken.has(signature)) return null
      const ostali = promesaj(rng, SVA_TELA.filter((n) => n !== cinjenica.tacanNaziv)).slice(0, 3)
      const { options, correctId } = nazivneOpcije(rng, cinjenica.tacanNaziv, ostali)
      return {
        type: 'single',
        text: cinjenica.tekst,
        options,
        correct: { optionId: correctId },
        explanation: cinjenica.objasnjenje,
        hint: 'Seti se osobina svih šest tela — samo jedno ispunjava dati uslov.',
        points: poeniZaTezinu(cfg.difficulty),
        topicSlug: cfg.topicSlug,
        difficulty: cfg.difficulty,
        signature,
      }
    }

    // Ekspert: kombinovana identifikacija preko VIŠE osobina odjednom
    const cinjenica = izaberi(rng, CINJENICE)
    const signature = `tela4:cinjenica:${CINJENICE.indexOf(cinjenica)}`
    if (taken.has(signature)) return null
    const ostali = promesaj(rng, SVA_TELA.filter((n) => n !== cinjenica.tacanNaziv)).slice(0, 3)
    const { options, correctId } = nazivneOpcije(rng, cinjenica.tacanNaziv, ostali)
    return {
      type: 'single',
      text: cinjenica.tekst,
      options,
      correct: { optionId: correctId },
      explanation: cinjenica.objasnjenje,
      hint: 'Kombinuj sve date osobine — samo jedno telo ih ispunjava sve odjednom.',
      points: poeniZaTezinu(cfg.difficulty),
      topicSlug: cfg.topicSlug,
      difficulty: cfg.difficulty,
      signature,
    }
  },
}
