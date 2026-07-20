// Početni skup od 30 primera pitanja za 3. razred, po dve po svakoj od 15 oblasti.
// Umeću se preko admin panela (dugme „Učitaj početna pitanja"), NE preko SQL migracije,
// jer questions.owner_id mora biti pravi prijavljeni administrator (RLS to zahteva).
import type { OpcijeJson, TacanOdgovor, Tezina, TipPitanja } from '../types/db'

export interface SeedPitanje {
  topicSlug: string
  type: TipPitanja
  difficulty: Tezina
  text: string
  options: OpcijeJson
  correct: TacanOdgovor
  explanation: string
  hint: string | null
  points: number
}

export const SEED_PITANJA: SeedPitanje[] = [
  // sabiranje
  {
    topicSlug: 'sabiranje', type: 'numeric', difficulty: 1, points: 1,
    text: 'Izračunaj: 234 + 152 = ?', options: null, correct: { value: 386 },
    explanation: '234 + 152 = 386.', hint: 'Saberi jedinice, pa desetice, pa stotine.',
  },
  {
    topicSlug: 'sabiranje', type: 'single', difficulty: 2, points: 2,
    text: 'Koliko je 367 + 258?',
    options: [{ id: 'a', text: '625' }, { id: 'b', text: '615' }, { id: 'c', text: '525' }, { id: 'd', text: '635' }],
    correct: { optionId: 'a' }, explanation: '367 + 258 = 625.', hint: 'Pazi na prenos preko desetice.',
  },
  // oduzimanje
  {
    topicSlug: 'oduzimanje', type: 'numeric', difficulty: 1, points: 1,
    text: 'Izračunaj: 480 − 250 = ?', options: null, correct: { value: 230 },
    explanation: '480 − 250 = 230.', hint: 'Oduzmi po mestima: stotine, desetice, jedinice.',
  },
  {
    topicSlug: 'oduzimanje', type: 'single', difficulty: 2, points: 2,
    text: 'Koliko je 512 − 275?',
    options: [{ id: 'a', text: '237' }, { id: 'b', text: '337' }, { id: 'c', text: '247' }, { id: 'd', text: '227' }],
    correct: { optionId: 'a' }, explanation: '512 − 275 = 237.', hint: 'Potrebna je pozajmica.',
  },
  // mnozenje
  {
    topicSlug: 'mnozenje', type: 'numeric', difficulty: 1, points: 1,
    text: 'Izračunaj: 7 · 8 = ?', options: null, correct: { value: 56 },
    explanation: '7 · 8 = 56.', hint: 'Seti se tablice množenja za broj 7.',
  },
  {
    topicSlug: 'mnozenje', type: 'single', difficulty: 3, points: 3,
    text: 'Koliko je 24 · 3?',
    options: [{ id: 'a', text: '72' }, { id: 'b', text: '62' }, { id: 'c', text: '82' }, { id: 'd', text: '68' }],
    correct: { optionId: 'a' }, explanation: '24 · 3 = 72 (20·3=60, 4·3=12, 60+12=72).', hint: 'Rastavi 24 na 20 i 4.',
  },
  // deljenje
  {
    topicSlug: 'deljenje', type: 'numeric', difficulty: 1, points: 1,
    text: 'Izračunaj: 36 : 4 = ?', options: null, correct: { value: 9 },
    explanation: '36 : 4 = 9, jer je 9 · 4 = 36.', hint: 'Koji broj pomnožen sa 4 daje 36?',
  },
  {
    topicSlug: 'deljenje', type: 'single', difficulty: 2, points: 2,
    text: 'Koliko je 63 : 7?',
    options: [{ id: 'a', text: '9' }, { id: 'b', text: '8' }, { id: 'c', text: '7' }, { id: 'd', text: '10' }],
    correct: { optionId: 'a' }, explanation: '63 : 7 = 9.', hint: 'Tablica množenja broja 7.',
  },
  // kombinovane-operacije
  {
    topicSlug: 'kombinovane-operacije', type: 'numeric', difficulty: 2, points: 2,
    text: 'Izračunaj: 5 · 6 + 12 = ?', options: null, correct: { value: 42 },
    explanation: 'Prvo množenje: 5 · 6 = 30, zatim 30 + 12 = 42.', hint: 'Množenje ide pre sabiranja.',
  },
  {
    topicSlug: 'kombinovane-operacije', type: 'single', difficulty: 3, points: 3,
    text: 'Koliko je (8 + 4) · 3?',
    options: [{ id: 'a', text: '36' }, { id: 'b', text: '28' }, { id: 'c', text: '32' }, { id: 'd', text: '24' }],
    correct: { optionId: 'a' }, explanation: '(8+4)=12, 12 · 3 = 36.', hint: 'Zagrada se rešava prva.',
  },
  // tekstualni-zadaci
  {
    topicSlug: 'tekstualni-zadaci', type: 'numeric', difficulty: 2, points: 2,
    text: 'Ana ima 145 dinara, a Marko ima 90 dinara više od nje. Koliko dinara ima Marko?',
    options: null, correct: { value: 235 },
    explanation: '145 + 90 = 235 dinara.', hint: 'Saberi Aninu sumu i razliku.',
  },
  {
    topicSlug: 'tekstualni-zadaci', type: 'text', difficulty: 1, points: 1,
    text: 'U razredu ima 18 dečaka i 14 devojčica. Koliko učenika ima u razredu?',
    options: null, correct: { accept: ['32'] },
    explanation: '18 + 14 = 32 učenika.', hint: 'Saberi dečake i devojčice.',
  },
  // poredjenje-brojeva
  {
    topicSlug: 'poredjenje-brojeva', type: 'single', difficulty: 1, points: 1,
    text: 'Koji znak treba da stoji: 458 __ 485?',
    options: [{ id: 'a', text: '<' }, { id: 'b', text: '=' }, { id: 'c', text: '>' }],
    correct: { optionId: 'a' }, explanation: '458 < 485.', hint: 'Uporedi cifru desetica.',
  },
  {
    topicSlug: 'poredjenje-brojeva', type: 'truefalse', difficulty: 2, points: 2,
    text: 'Da li je tačno: 6 · 7 > 40?',
    options: null, correct: { value: true },
    explanation: '6 · 7 = 42, a 42 > 40, pa je tvrdnja tačna.', hint: 'Prvo izračunaj proizvod.',
  },
  // nizovi-i-obrasci
  {
    topicSlug: 'nizovi-i-obrasci', type: 'numeric', difficulty: 1, points: 1,
    text: 'Nastavi niz: 5, 10, 15, 20, __', options: null, correct: { value: 25 },
    explanation: 'Svaki sledeći broj je veći za 5.', hint: 'Pogledaj razliku između brojeva.',
  },
  {
    topicSlug: 'nizovi-i-obrasci', type: 'single', difficulty: 2, points: 2,
    text: 'Koji broj nastavlja niz: 3, 6, 12, 24, __?',
    options: [{ id: 'a', text: '48' }, { id: 'b', text: '36' }, { id: 'c', text: '30' }, { id: 'd', text: '27' }],
    correct: { optionId: 'a' }, explanation: 'Svaki sledeći broj je dva puta veći: 24 · 2 = 48.', hint: 'Uporedi odnos suseda u nizu.',
  },
  // geometrija (ručno, van MVP generatora)
  {
    topicSlug: 'geometrija', type: 'single', difficulty: 1, points: 1,
    text: 'Koliko stranica ima trougao?',
    options: [{ id: 'a', text: '3' }, { id: 'b', text: '4' }, { id: 'c', text: '5' }, { id: 'd', text: '6' }],
    correct: { optionId: 'a' }, explanation: 'Trougao ima tri stranice.', hint: 'Već je u imenu — „tro"ugao.',
  },
  {
    topicSlug: 'geometrija', type: 'single', difficulty: 2, points: 2,
    text: 'Koja figura ima sve stranice jednake i četiri prava ugla?',
    options: [{ id: 'a', text: 'Kvadrat' }, { id: 'b', text: 'Pravougaonik' }, { id: 'c', text: 'Trougao' }, { id: 'd', text: 'Krug' }],
    correct: { optionId: 'a' }, explanation: 'Kvadrat ima 4 jednake stranice i 4 prava ugla.', hint: 'Pravougaonik ima parove jednakih stranica, ali ne mora sve četiri biti iste.',
  },
  // obim-i-merenje
  {
    topicSlug: 'obim-i-merenje', type: 'numeric', difficulty: 1, points: 1,
    text: 'Stranica kvadrata je 6 cm. Koliki je obim kvadrata u centimetrima?',
    options: null, correct: { value: 24 },
    explanation: 'O = 4 · 6 = 24 cm.', hint: 'Kvadrat ima četiri jednake stranice.',
  },
  {
    topicSlug: 'obim-i-merenje', type: 'numeric', difficulty: 2, points: 2,
    text: 'Pravougaonik ima stranice 15 cm i 9 cm. Koliki mu je obim u centimetrima?',
    options: null, correct: { value: 48 },
    explanation: 'O = 2 · (15 + 9) = 48 cm.', hint: 'Obim pravougaonika: 2 · (a + b).',
  },
  // vreme-i-sat (ručno)
  {
    topicSlug: 'vreme-i-sat', type: 'single', difficulty: 1, points: 1,
    text: 'Koliko ima minuta u jednom satu?',
    options: [{ id: 'a', text: '60' }, { id: 'b', text: '100' }, { id: 'c', text: '30' }, { id: 'd', text: '24' }],
    correct: { optionId: 'a' }, explanation: 'Jedan sat ima 60 minuta.', hint: 'Pogledaj brojčanik sata.',
  },
  {
    topicSlug: 'vreme-i-sat', type: 'single', difficulty: 2, points: 2,
    text: 'Čas počinje u 8:15 i traje 45 minuta. U koliko sati se čas završava?',
    options: [{ id: 'a', text: '9:00' }, { id: 'b', text: '8:45' }, { id: 'c', text: '9:15' }, { id: 'd', text: '8:60' }],
    correct: { optionId: 'a' }, explanation: '8:15 + 45 min = 9:00.', hint: 'Dodaj 45 minuta na 8:15.',
  },
  // novac
  {
    topicSlug: 'novac', type: 'numeric', difficulty: 1, points: 1,
    text: 'Sveska košta 120 dinara, a olovka 60 dinara. Koliko dinara treba za oboje?',
    options: null, correct: { value: 180 },
    explanation: '120 + 60 = 180 dinara.', hint: 'Saberi obe cene.',
  },
  {
    topicSlug: 'novac', type: 'numeric', difficulty: 2, points: 2,
    text: 'Plaćaš 350 dinara novčanicom od 500 dinara. Koliko dinara je kusur?',
    options: null, correct: { value: 150 },
    explanation: '500 − 350 = 150 dinara.', hint: 'Od 500 oduzmi cenu.',
  },
  // merne-jedinice
  {
    topicSlug: 'merne-jedinice', type: 'numeric', difficulty: 1, points: 1,
    text: 'Koliko je 3 m izraženo u centimetrima?', options: null, correct: { value: 300 },
    explanation: '1 m = 100 cm, pa je 3 m = 300 cm.', hint: '1 metar = 100 centimetara.',
  },
  {
    topicSlug: 'merne-jedinice', type: 'single', difficulty: 2, points: 2,
    text: 'Koliko je 2 kg izraženo u gramima?',
    options: [{ id: 'a', text: '2000 g' }, { id: 'b', text: '200 g' }, { id: 'c', text: '20 g' }, { id: 'd', text: '2200 g' }],
    correct: { optionId: 'a' }, explanation: '1 kg = 1000 g, pa je 2 kg = 2000 g.', hint: '1 kilogram = 1000 grama.',
  },
  // razlomci (ručno)
  {
    topicSlug: 'razlomci', type: 'single', difficulty: 1, points: 1,
    text: 'Koji razlomak predstavlja polovinu?',
    options: [{ id: 'a', text: '1/2' }, { id: 'b', text: '1/4' }, { id: 'c', text: '1/3' }, { id: 'd', text: '1/10' }],
    correct: { optionId: 'a' }, explanation: '1/2 znači jedan od dva jednaka dela — polovina.', hint: 'Broj ispod crte govori na koliko delova je nešto podeljeno.',
  },
  {
    topicSlug: 'razlomci', type: 'text', difficulty: 2, points: 2,
    text: 'Torta je isečena na 4 jednaka dela. Kojim razlomkom predstavljamo jedan deo? (upiši kao a/b)',
    options: null, correct: { accept: ['1/4'] },
    explanation: 'Jedan od 4 jednaka dela je 1/4.', hint: 'Broj delova ide ispod crte.',
  },
  // logicki-zadaci (ručno)
  {
    topicSlug: 'logicki-zadaci', type: 'numeric', difficulty: 2, points: 2,
    text: 'Zbir dva broja je 20, a njihova razlika je 4. Koji je veći broj?',
    options: null, correct: { value: 12 },
    explanation: 'Veći broj = (20 + 4) : 2 = 12, manji = 8. Provera: 12 + 8 = 20, 12 − 8 = 4.', hint: 'Saberi zbir i razliku, pa podeli sa 2.',
  },
  {
    topicSlug: 'logicki-zadaci', type: 'single', difficulty: 3, points: 3,
    text: 'Tri drugara imaju ukupno 28 sličica. Marko ima duplo više od Ane, a Ana ima isto koliko i Iva. Koliko sličica ima Marko?',
    options: [{ id: 'a', text: '14' }, { id: 'b', text: '7' }, { id: 'c', text: '10' }, { id: 'd', text: '21' }],
    correct: { optionId: 'a' }, explanation: 'Neka je Ana = Iva = x, Marko = 2x. Tada je x + x + 2x = 28, pa je 4x = 28, x = 7. Marko ima 2 · 7 = 14 sličica.', hint: 'Označi Aninu količinu sa x — Marko ima 2x, Iva takođe x.',
  },
]
