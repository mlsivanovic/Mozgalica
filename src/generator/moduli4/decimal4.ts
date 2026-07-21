// Generator: decimalni brojevi (4. razred) — decimalni zapis (1-2 decimale),
// mešovito čitanje dužina, sabiranje/oduzimanje decimala istog broja decimala
// (uklj. prelazak preko zapete), višekorak, i tekstualni zadatak.
// Koristi decimals? ekstenziju upakujRacun/napraviDistraktore (podrazumevano 0
// za sve ostale module — ovde je jedini modul koji je koristi).
import { ceoBroj, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { upakujRacun } from '../moduli/zajednicko'

function fmt(n: number, decimals: number): string {
  return n.toFixed(decimals).replace('.', ',')
}

export const decimal4: TopicGenerator = {
  slug: 'decimalni-brojevi-4',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty === 1) {
      // Mešano: dm → m (1 decimala), ili cm → m (2 decimale)
      if (rng() < 0.5) {
        const dm = ceoBroj(rng, 1, 99)
        const tacan = dm / 10
        const signature = `decimal4:dm-m:${dm}`
        if (taken.has(signature)) return null
        return upakujRacun(cfg, rng, {
          text: `Izrazi u metrima: ${dm} dm = ? m`,
          tacan,
          kandidati: [dm, dm / 100, tacan + 0.1, tacan - 0.1],
          explanation: `1 dm = 0,1 m, pa je ${dm} dm = ${dm} · 0,1 = ${fmt(tacan, 1)} m.`,
          hint: 'Jedan decimetar je desetina metra: 1 dm = 0,1 m.',
          signature,
          decimals: 1,
          maxDistraktor: 100,
        })
      }
      const cm = ceoBroj(rng, 1, 99)
      const tacan = cm / 100
      const signature = `decimal4:cm-m:${cm}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Izrazi u metrima: ${cm} cm = ? m`,
        tacan,
        kandidati: [cm, cm / 10, tacan + 0.01, tacan - 0.01],
        explanation: `1 cm = 0,01 m, pa je ${cm} cm = ${cm} · 0,01 = ${fmt(tacan, 2)} m.`,
        hint: 'Jedan centimetar je stoti deo metra: 1 cm = 0,01 m.',
        signature,
        decimals: 2,
        maxDistraktor: 100,
      })
    }

    if (cfg.difficulty === 2) {
      // Mešovito čitanje: n m i k cm = ? m
      const m = ceoBroj(rng, 1, 9)
      const cm = ceoBroj(rng, 1, 99)
      const tacan = m + cm / 100
      const signature = `decimal4:mesovito:${m}m${cm}cm`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Izrazi u metrima: ${m} m ${cm} cm = ? m`,
        tacan,
        kandidati: [m + cm / 10, m * 100 + cm, tacan + 1, tacan - 0.01],
        explanation: `${m} m ${cm} cm sadrži ${m} celih metara i ${cm} stotih delova metra, pa je to ${fmt(tacan, 2)} m.`,
        hint: 'Metri su ceo deo broja, a santimetri (podeljeni sa 100) su decimalni deo.',
        signature,
        decimals: 2,
        maxDistraktor: 100,
      })
    }

    if (cfg.difficulty === 3) {
      // Sabiranje ILI oduzimanje decimala sa jednom decimalom, veći opseg
      const aT = ceoBroj(rng, 10, 4_999)
      if (rng() < 0.5) {
        const bT = ceoBroj(rng, 10, 4_999)
        const a = aT / 10
        const b = bT / 10
        const tacan = (aT + bT) / 10
        const signature = `decimal4:sabiranje:${aT},${bT}`
        if (taken.has(signature)) return null
        return upakujRacun(cfg, rng, {
          text: `Izračunaj: ${fmt(a, 1)} + ${fmt(b, 1)} = ?`,
          tacan,
          kandidati: [a + b + 1, Math.abs(a - b), tacan + 1, tacan - 1],
          explanation: `Sabiraš cifre istih mesnih vrednosti: ${fmt(a, 1)} + ${fmt(b, 1)} = ${fmt(tacan, 1)}.`,
          hint: 'Poređaj decimalne zapete jednu ispod druge, pa saberi kao cele brojeve.',
          signature,
          decimals: 1,
          maxDistraktor: 1_000,
        })
      }
      const bT = ceoBroj(rng, 10, aT)
      const a = aT / 10
      const b = bT / 10
      const tacan = (aT - bT) / 10
      const signature = `decimal4:oduzimanje1dec:${aT},${bT}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Izračunaj: ${fmt(a, 1)} − ${fmt(b, 1)} = ?`,
        tacan,
        kandidati: [a + b, tacan + 1, tacan - 1, tacan + 10],
        explanation: `Oduzimaš cifre istih mesnih vrednosti: ${fmt(a, 1)} − ${fmt(b, 1)} = ${fmt(tacan, 1)}.`,
        hint: 'Poređaj decimalne zapete jednu ispod druge, pa oduzmi kao cele brojeve.',
        signature,
        decimals: 1,
        maxDistraktor: 1_000,
      })
    }

    if (cfg.difficulty === 4) {
      // Sabiranje decimala sa dve decimale
      const aH = ceoBroj(rng, 10, 9_999)
      const bH = ceoBroj(rng, 10, 9_999)
      const a = aH / 100
      const b = bH / 100
      const tacan = (aH + bH) / 100
      const signature = `decimal4:sabiranje2dec:${aH},${bH}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Izračunaj: ${fmt(a, 2)} + ${fmt(b, 2)} = ?`,
        tacan,
        kandidati: [Math.abs(a - b), tacan + 1, tacan - 0.01, tacan + 0.1],
        explanation: `Sabiraš cifre istih mesnih vrednosti: ${fmt(a, 2)} + ${fmt(b, 2)} = ${fmt(tacan, 2)}.`,
        hint: 'Poređaj decimalne zapete jednu ispod druge, pa saberi kao cele brojeve.',
        signature,
        decimals: 2,
        maxDistraktor: 200,
      })
    }

    // Ekspert: 3 grane — oduzimanje 2 decimale sa pozajmicom, višekorak (a+b−c), ili tekstualni zadatak
    const grana = ceoBroj(rng, 0, 2)
    if (grana === 0) {
      // Namerno biramo hundredths-cifru veću u umanjiocu da forsiramo pozajmicu preko zapete.
      const aH = ceoBroj(rng, 100, 9_999)
      const bH = ceoBroj(rng, 1, aH)
      const a = aH / 100
      const b = bH / 100
      const tacan = (aH - bH) / 100
      const signature = `decimal4:oduzimanje:${aH},${bH}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Izračunaj: ${fmt(a, 2)} − ${fmt(b, 2)} = ?`,
        tacan,
        kandidati: [a + b, tacan + 1, tacan - 0.01, tacan + 0.1],
        explanation: `Oduzimaš cifre istih mesnih vrednosti: ${fmt(a, 2)} − ${fmt(b, 2)} = ${fmt(tacan, 2)}.`,
        hint: 'Poređaj decimalne zapete jednu ispod druge. Ako treba, "pozajmi" preko zapete kao kod celih brojeva.',
        signature,
        decimals: 2,
        maxDistraktor: 100,
      })
    }
    if (grana === 1) {
      // Višekorak: a + b − c, jedna decimala, rezultat nenegativan po konstrukciji
      const aT = ceoBroj(rng, 10, 999)
      const bT = ceoBroj(rng, 10, 999)
      const cT = ceoBroj(rng, 10, aT + bT)
      const a = aT / 10
      const b = bT / 10
      const c = cT / 10
      const tacan = (aT + bT - cT) / 10
      const signature = `decimal4:visekorak:${aT},${bT},${cT}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Izračunaj: ${fmt(a, 1)} + ${fmt(b, 1)} − ${fmt(c, 1)} = ?`,
        tacan,
        kandidati: [(aT + bT + cT) / 10, tacan + 1, tacan - 1, (aT - bT + cT) / 10],
        explanation: `Prvo sabiranje: ${fmt(a, 1)} + ${fmt(b, 1)} = ${fmt((aT + bT) / 10, 1)}, zatim oduzimanje: ${fmt((aT + bT) / 10, 1)} − ${fmt(c, 1)} = ${fmt(tacan, 1)}.`,
        hint: 'Radi redom, sleva na desno: prvo sabiranje, pa oduzimanje.',
        signature,
        decimals: 1,
        maxDistraktor: 1_000,
      })
    }
    // Tekstualni zadatak, dve decimale (npr. Luka: 1,75 km, drugi dan manje)
    const aH = ceoBroj(rng, 100, 999)
    const manjeH = ceoBroj(rng, 1, aH - 1)
    const a = aH / 100
    const manje = manjeH / 100
    const tacan = (aH - manjeH) / 100
    const signature = `decimal4:tekstualni:${aH},${manjeH}`
    if (taken.has(signature)) return null
    return upakujRacun(cfg, rng, {
      text: `Luka je prvog dana pretrčao ${fmt(a, 2)} km, a drugog dana ${fmt(manje, 2)} km manje nego prvog dana. Koliko kilometara je Luka pretrčao drugog dana?`,
      tacan,
      kandidati: [a + manje, tacan + 1, tacan - 0.01, tacan + 0.1],
      explanation: `Drugog dana je pretrčao ${fmt(a, 2)} − ${fmt(manje, 2)} = ${fmt(tacan, 2)} km.`,
      hint: '"Manje nego prvog dana" znači oduzimanje od prvog dana.',
      signature,
      decimals: 2,
      maxDistraktor: 100,
    })
  },
}
