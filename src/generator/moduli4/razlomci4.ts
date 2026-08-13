// Generator: razlomci (4. razred) — jednaki razlomci, poređenje (isti imenilac/
// isti brojilac), sabiranje/oduzimanje istog imenioca (rezultat MOŽE preći 1),
// razlomak broja, i višekoračni zadaci (razlika dva "dela", "do celog", zbir tri).
// Da ostane kompatibilno sa celobrojnim upakujRacun pipeline-om, rezultati
// sabiranja/oduzimanja se izražavaju kroz BROJILAC (imenilac je dat u tekstu).
import type { Opcija } from '../../types/db.ts'
import { ceoBroj, izaberi, promesaj, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { poeniZaTezinu, upakujRacun } from '../moduli/zajednicko.ts'

export const razlomci4: TopicGenerator = {
  slug: 'razlomci-4',
  supportedTypes: ['numeric', 'single', 'truefalse'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty === 1) {
      // Jednaki razlomci — tačno/netačno ILI ponuđeni odgovori, zavisno od cfg.type
      // (kao poredjenje-brojeva: 'auto' nasumično bira, 'numeric' se degradira na single).
      const d = ceoBroj(rng, 2, 9)
      const n = ceoBroj(rng, 1, d - 1)
      const k = ceoBroj(rng, 2, 6)
      const d2 = d * k
      const tacnoN2 = n * k
      const zeljeni = cfg.type === 'auto' ? (rng() < 0.5 ? 'single' : 'truefalse') : cfg.type

      if (zeljeni === 'truefalse') {
        const tacno = rng() < 0.5
        const n2 = tacno ? tacnoN2 : tacnoN2 + (rng() < 0.5 ? 1 : -1)
        if (n2 <= 0 || n2 >= d2) return null // ostani u okviru pravog razlomka
        const signature = `razlomci4:ekvivalentno-tf:${n},${d},${n2},${d2}`
        if (taken.has(signature)) return null
        const jesuJednaki = n * d2 === n2 * d
        return {
          type: 'truefalse',
          text: `Da li su razlomci ${n}/${d} i ${n2}/${d2} jednaki?`,
          options: null,
          correct: { value: jesuJednaki },
          explanation: jesuJednaki
            ? `${n}/${d} = ${n2}/${d2}, jer je ${n} · ${d2} = ${n2} · ${d} (= ${n * d2}).`
            : `${n}/${d} ≠ ${n2}/${d2}, jer je ${n} · ${d2} = ${n * d2}, a ${n2} · ${d} = ${n2 * d} — nisu jednaki.`,
          hint: 'Razlomci su jednaki ako predstavljaju jednake delove celine — pomnoži unakrsno pa uporedi.',
          points: poeniZaTezinu(cfg.difficulty),
          topicSlug: cfg.topicSlug,
          difficulty: cfg.difficulty,
          signature,
        }
      }

      // single: "Koji je razlomak jednak ...?" — 1 tačan + 3 razlomka "skoro jednaka"
      const signature = `razlomci4:ekvivalentno-mc:${n},${d},${k}`
      if (taken.has(signature)) return null
      const tacnaOznaka = `${tacnoN2}/${d2}`
      const blizuNetacne = [...new Set([
        `${tacnoN2 + 1}/${d2}`,
        `${tacnoN2}/${d2 + 1}`,
        `${tacnoN2 > 1 ? tacnoN2 - 1 : tacnoN2 + 2}/${d2}`,
        `${tacnoN2}/${Math.max(1, d2 - 1)}`,
      ])].filter((o) => o !== tacnaOznaka).slice(0, 3)
      const svi = promesaj(rng, [tacnaOznaka, ...blizuNetacne])
      const options: Opcija[] = svi.map((tekst, i) => ({ id: `o${i + 1}`, text: tekst }))
      const correctId = options[svi.indexOf(tacnaOznaka)].id
      return {
        type: 'single',
        text: `Koji je razlomak jednak razlomku ${n}/${d}?`,
        options,
        correct: { optionId: correctId },
        explanation: `${n}/${d} = ${tacnaOznaka}, jer smo brojilac i imenilac pomnožili istim brojem (${k}).`,
        hint: 'Jednak razlomak dobijaš kad brojilac i imenilac pomnožiš (ili podeliš) istim brojem.',
        points: poeniZaTezinu(cfg.difficulty),
        topicSlug: cfg.topicSlug,
        difficulty: cfg.difficulty,
        signature,
      }
    }

    if (cfg.difficulty === 2) {
      // Poređenje — isti imenilac ILI isti brojilac (mešano, "lako" ostaje ovde)
      const istiImenilac = rng() < 0.5
      let n1: number, n2: number, d1: number, d2: number
      if (istiImenilac) {
        d1 = ceoBroj(rng, 3, 12)
        d2 = d1
        n1 = ceoBroj(rng, 1, d1 - 1)
        n2 = ceoBroj(rng, 1, d1 - 1)
        if (n1 === n2) return null
      } else {
        n1 = ceoBroj(rng, 1, 9)
        n2 = n1
        d1 = ceoBroj(rng, n1 + 1, 15)
        d2 = ceoBroj(rng, n1 + 1, 15)
        if (d1 === d2) return null
      }
      const signature = `razlomci4:${istiImenilac ? 'poredi-imenilac' : 'poredi-brojilac'}:${n1}/${d1}?${n2}/${d2}`
      if (taken.has(signature)) return null

      const v1 = n1 / d1
      const v2 = n2 / d2
      const znak = v1 < v2 ? '<' : v1 > v2 ? '>' : '='
      const options: Opcija[] = [
        { id: 'o1', text: '<' },
        { id: 'o2', text: '=' },
        { id: 'o3', text: '>' },
      ]
      const correctId = znak === '<' ? 'o1' : znak === '=' ? 'o2' : 'o3'
      const objasnjenje = istiImenilac
        ? `Kada su imenioci jednaki, veći je razlomak sa većim brojiocem: ${n1}/${d1} ${znak} ${n2}/${d2}.`
        : `Kada su brojioci jednaki, veći je razlomak sa MANJIM imeniocem: ${n1}/${d1} ${znak} ${n2}/${d2}.`
      return {
        type: 'single',
        text: `Koji znak treba da stoji: ${n1}/${d1} __ ${n2}/${d2}?`,
        options,
        correct: { optionId: correctId },
        explanation: objasnjenje,
        hint: istiImenilac
          ? 'Isti imenilac — upoređuješ samo brojioce.'
          : 'Isti brojilac — pažljivo, ovde veći imenilac znači MANJI razlomak.',
        points: poeniZaTezinu(cfg.difficulty),
        topicSlug: cfg.topicSlug,
        difficulty: cfg.difficulty,
        signature,
      }
    }

    if (cfg.difficulty === 3) {
      // 50/50: isti imenilac (kao ranije) ILI različiti imenioci (jedan imenilac
      // deljiv drugim) — pravi skok u težini, traži svođenje na zajednički imenilac.
      const razliciti = rng() < 0.5
      if (!razliciti) {
        // Sabiranje/oduzimanje razlomaka istog imenioca — odgovor je BROJILAC.
        // Zbir SME preći imenilac (rezultat > 1 ceo) — to je namerno, ne izuzetak.
        const d = ceoBroj(rng, 4, 15)
        const saberi = rng() < 0.5
        let n1: number, n2: number, tacan: number
        if (saberi) {
          n1 = ceoBroj(rng, 1, d - 1)
          n2 = ceoBroj(rng, 1, d - 1)
          tacan = n1 + n2
        } else {
          n1 = ceoBroj(rng, 2, d - 1)
          n2 = ceoBroj(rng, 1, n1)
          tacan = n1 - n2
        }
        const signature = `razlomci4:${saberi ? 'sabiranje' : 'oduzimanje'}:${n1},${n2},${d}`
        if (taken.has(signature)) return null
        const napomenaPreko1 = saberi && tacan > d
          ? ` Pošto je ${tacan} veće od imenioca ${d}, rezultat je veći od 1 celog (to je normalno i tačno).`
          : ''
        return upakujRacun(cfg, rng, {
          text: `Izračunaj brojilac rezultata: ${n1}/${d} ${saberi ? '+' : '−'} ${n2}/${d} = ?/${d}`,
          tacan,
          kandidati: [n1, n2, saberi ? Math.abs(n1 - n2) : n1 + n2, tacan + 1, tacan - 1],
          explanation: (saberi
            ? `Imenilac ostaje isti, brojioce sabiramo: ${n1} + ${n2} = ${tacan}, pa je zbir ${tacan}/${d}.`
            : `Imenilac ostaje isti, brojioce oduzimamo: ${n1} − ${n2} = ${tacan}, pa je razlika ${tacan}/${d}.`) + napomenaPreko1,
          hint: 'Razlomke istog imenioca sabiraš/oduzimaš tako što sabereš/oduzmeš samo brojioce — imenilac se ne dira.',
          signature,
          maxDistraktor: 40,
        })
      }
      // Različiti imenioci — imenilac db je umnožak imenioca ds (ds · k = db), pa se
      // n1/ds prvo svodi na db (množenjem brojioca i imenioca sa k), pa se tek onda
      // sabira/oduzima sa n2/db. Odgovor je i dalje BROJILAC nad zajedničkim imeniocem db.
      const ds = ceoBroj(rng, 2, 8)
      const k = ceoBroj(rng, 2, 5)
      const db = ds * k
      const n1 = ceoBroj(rng, 1, ds - 1)
      const n1Svedeno = n1 * k
      const saberiN = rng() < 0.5
      let n2: number, tacanN: number
      if (saberiN) {
        n2 = ceoBroj(rng, 1, db - 1)
        tacanN = n1Svedeno + n2
      } else {
        // n1Svedeno = n1·k ≥ 2 (jer je k ≥ 2), pa opseg [1, n1Svedeno-1] nikad nije prazan.
        n2 = ceoBroj(rng, 1, n1Svedeno - 1)
        tacanN = n1Svedeno - n2
      }
      const signatureN = `razlomci4:${saberiN ? 'nejednaki-sab' : 'nejednaki-odu'}:${n1},${ds},${n2},${db}`
      if (taken.has(signatureN)) return null
      return upakujRacun(cfg, rng, {
        text: `Izračunaj brojilac rezultata: ${n1}/${ds} ${saberiN ? '+' : '−'} ${n2}/${db} = ?/${db}`,
        tacan: tacanN,
        kandidati: [n1 + n2, n1Svedeno, n2, tacanN + 1, tacanN - 1],
        explanation: `${n1}/${ds} = ${n1Svedeno}/${db} (brojilac i imenilac smo pomnožili sa ${k}, jer je ${db} : ${ds} = ${k}). Sad ${saberiN ? 'sabiramo' : 'oduzimamo'} brojioce: ${n1Svedeno} ${saberiN ? '+' : '−'} ${n2} = ${tacanN}, pa je rezultat ${tacanN}/${db}.`,
        hint: `Razlomci imaju različite imenioce — prvo svedi ${n1}/${ds} na imenilac ${db} (umnožak ${ds}-a), pa tek onda sabiraj/oduzimaj brojioce.`,
        signature: signatureN,
        maxDistraktor: 150,
      })
    }

    if (cfg.difficulty === 4) {
      // 50/50: razlomak broja (kao ranije) ILI teže sabiranje/oduzimanje različitih
      // imenilaca (veći brojevi nego na nivou 3 — dodatno otežanje).
      if (rng() < 0.5) {
        // Razlomak broja, konstruisan unazad (uvek se tačno deli)
        const d = ceoBroj(rng, 2, 15)
        const n = ceoBroj(rng, 1, d - 1)
        const q = ceoBroj(rng, 2, 80)
        const celina = q * d
        const tacan = n * q
        const signature = `razlomci4:deo:${n},${d},${q}`
        if (taken.has(signature)) return null
        return upakujRacun(cfg, rng, {
          text: `Koliko je ${n}/${d} broja ${celina}?`,
          tacan,
          kandidati: [celina, q, tacan + d, tacan - d],
          explanation: `${celina} : ${d} = ${q}, pa je ${n}/${d} od ${celina} jednako ${q} · ${n} = ${tacan}.`,
          hint: 'Prvo podeli broj imeniocem, pa rezultat pomnoži brojiocem.',
          signature,
          maxDistraktor: 5_000,
        })
      }
      // Isti princip kao na nivou 3 (imenilac db je umnožak imenioca ds), ali sa
      // većim brojevima — pravi teže svođenje na zajednički imenilac.
      const ds = ceoBroj(rng, 2, 12)
      const k = ceoBroj(rng, 2, 8)
      const db = ds * k
      const n1 = ceoBroj(rng, 1, ds - 1)
      const n1Svedeno = n1 * k
      const saberiN = rng() < 0.5
      let n2: number, tacanN: number
      if (saberiN) {
        n2 = ceoBroj(rng, 1, db - 1)
        tacanN = n1Svedeno + n2
      } else {
        n2 = ceoBroj(rng, 1, n1Svedeno - 1)
        tacanN = n1Svedeno - n2
      }
      const signatureN = `razlomci4:${saberiN ? 'nejednaki-veci-sab' : 'nejednaki-veci-odu'}:${n1},${ds},${n2},${db}`
      if (taken.has(signatureN)) return null
      return upakujRacun(cfg, rng, {
        text: `Izračunaj brojilac rezultata: ${n1}/${ds} ${saberiN ? '+' : '−'} ${n2}/${db} = ?/${db}`,
        tacan: tacanN,
        kandidati: [n1 + n2, n1Svedeno, n2, tacanN + 1, tacanN - 1],
        explanation: `${n1}/${ds} = ${n1Svedeno}/${db} (brojilac i imenilac smo pomnožili sa ${k}, jer je ${db} : ${ds} = ${k}). Sad ${saberiN ? 'sabiramo' : 'oduzimamo'} brojioce: ${n1Svedeno} ${saberiN ? '+' : '−'} ${n2} = ${tacanN}, pa je rezultat ${tacanN}/${db}.`,
        hint: `Razlomci imaju različite imenioce — prvo svedi ${n1}/${ds} na imenilac ${db} (umnožak ${ds}-a), pa tek onda sabiraj/oduzimaj brojioce.`,
        signature: signatureN,
        maxDistraktor: 400,
      })
    }

    // Ekspert: višekoračni zadaci — razlika dva "dela", "koliko do celog", zbir tri
    // razlomka, ili oduzimanje DVA razlomka različitih imenilaca (najveći brojevi u
    // celoj oblasti — najteži oblik svođenja na zajednički imenilac).
    const grana = ceoBroj(rng, 0, 3)
    if (grana === 3) {
      const ds = ceoBroj(rng, 2, 20)
      const k = ceoBroj(rng, 2, 10)
      const db = ds * k
      const n1 = ceoBroj(rng, 1, ds - 1)
      const n1Svedeno = n1 * k
      // n1Svedeno = n1·k ≥ 2 (jer je k ≥ 2), pa opseg [1, n1Svedeno-1] nikad nije prazan.
      const n2 = ceoBroj(rng, 1, n1Svedeno - 1)
      const tacan = n1Svedeno - n2
      const signature = `razlomci4:nejednaki-ekspert:${n1},${ds},${n2},${db}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Izračunaj brojilac rezultata: ${n1}/${ds} − ${n2}/${db} = ?/${db}`,
        tacan,
        kandidati: [n1 - n2, n1Svedeno, n2, tacan + 1, tacan - 1],
        explanation: `${n1}/${ds} = ${n1Svedeno}/${db} (brojilac i imenilac smo pomnožili sa ${k}, jer je ${db} : ${ds} = ${k}). Sad oduzimamo brojioce: ${n1Svedeno} − ${n2} = ${tacan}, pa je razlika ${tacan}/${db}.`,
        hint: `Razlomci imaju različite imenioce — prvo svedi ${n1}/${ds} na imenilac ${db} (umnožak ${ds}-a), pa tek onda oduzmi brojioce.`,
        signature,
        maxDistraktor: 400,
      })
    }
    if (grana === 0) {
      const d1 = ceoBroj(rng, 2, 12)
      const q1 = ceoBroj(rng, 5, 50)
      const n1 = ceoBroj(rng, 1, d1 - 1)
      const celina1 = q1 * d1
      const deo1 = n1 * q1
      const d2 = ceoBroj(rng, 2, 12)
      const q2 = ceoBroj(rng, 5, 50)
      const n2 = ceoBroj(rng, 1, d2 - 1)
      const celina2 = q2 * d2
      const deo2 = n2 * q2
      if (deo1 === deo2) return null
      const tacan = Math.abs(deo1 - deo2)
      const [veci, manji] = deo1 > deo2 ? [deo1, deo2] : [deo2, deo1]
      const signature = `razlomci4:dvalika:${n1},${d1},${q1},${n2},${d2},${q2}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Ana ima ${n1}/${d1} od ${celina1} dinara, a Marko ima ${n2}/${d2} od ${celina2} dinara. Za koliko dinara se njihove uštede razlikuju?`,
        tacan,
        kandidati: [deo1 + deo2, deo1, deo2, tacan + 10],
        explanation: `Ana ima ${n1}/${d1} · ${celina1} = ${deo1} dinara, a Marko ${n2}/${d2} · ${celina2} = ${deo2} dinara. Razlika je ${veci} − ${manji} = ${tacan} dinara.`,
        hint: 'Prvo izračunaj koliko dinara ima svako od njih, pa oduzmi manji iznos od većeg.',
        signature,
        maxDistraktor: 5_000,
      })
    }
    if (grana === 1) {
      const d = ceoBroj(rng, 3, 15)
      const n = ceoBroj(rng, 1, d - 1)
      const tacan = d - n
      const signature = `razlomci4:docelog:${n},${d}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Koliko još ${d}-tih delova treba dodati razlomku ${n}/${d} da bi se dobio jedan ceo?`,
        tacan,
        kandidati: [n, d, tacan + 1, tacan - 1],
        explanation: `Jedan ceo je ${d}/${d}. Nedostaje ${d}/${d} − ${n}/${d} = ${d - n}/${d}, dakle ${tacan} delova.`,
        hint: 'Jedan ceo ima onoliko delova koliko iznosi imenilac — koliko još nedostaje do tog broja?',
        signature,
        maxDistraktor: 20,
      })
    }
    const d = ceoBroj(rng, 4, 15)
    const n1 = ceoBroj(rng, 1, d - 1)
    const n2 = ceoBroj(rng, 1, d - 1)
    const n3 = ceoBroj(rng, 1, d - 1)
    const tacan = n1 + n2 + n3
    const signature = `razlomci4:zbirtri:${n1},${n2},${n3},${d}`
    if (taken.has(signature)) return null
    return upakujRacun(cfg, rng, {
      text: `Izračunaj brojilac rezultata: ${n1}/${d} + ${n2}/${d} + ${n3}/${d} = ?/${d}`,
      tacan,
      kandidati: [izaberi(rng, [n1, n2, n3]), n1 + n2, tacan + 1, tacan - 1],
      explanation: `Imenilac ostaje isti, brojioce sabiramo: ${n1} + ${n2} + ${n3} = ${tacan}, pa je zbir ${tacan}/${d}.`,
      hint: 'Sve brojioce sabereš odjednom — imenilac se ne dira.',
      signature,
      maxDistraktor: 60,
    })
  },
}
