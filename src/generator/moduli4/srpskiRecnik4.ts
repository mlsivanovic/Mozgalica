// Generator: homonimi, sinonimi i ustaljeni izrazi za 4. razred.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujSrpskiTekst, upakujSrpskiTvrdnju } from '../moduli/srpskiZajednicko.ts'

const SINONIMI: Array<[string, string, ...string[]]> = [
  ['otadžbina', 'domovina'], ['zavičaj', 'rodni kraj'], ['odvažan', 'hrabar'], ['ćutati', 'mučati'],
  ['žuriti', 'hitati'], ['dar', 'poklon'], ['veselje', 'radost'], ['galama', 'buka'],
  ['sićušan', 'malen', 'mali'], ['ogroman', 'velik'], ['drevan', 'star'], ['staza', 'put'],
  ['lekar', 'doktor'], ['učenik', 'đak'], ['pripovedati', 'pričati'], ['čuvati', 'paziti'],
]

const HOMONIMI = [
  { rec: 'kosa', znacenja: [
    { kontekst: 'Njena kosa je duga i plava.', znacenje: 'dlake na glavi' },
    { kontekst: 'Kosa je spremna za košenje trave.', znacenje: 'alatka za košenje' },
    { kontekst: 'Planinska kosa spušta se prema reci.', znacenje: 'nagnuta strana brda' },
  ] },
  { rec: 'luk', znacenja: [
    { kontekst: 'Za ručak smo jeli crni luk.', znacenje: 'vrsta povrća' },
    { kontekst: 'Strelac je zategao luk.', znacenje: 'oružje za izbacivanje strele' },
  ] },
  { rec: 'grad', znacenja: [
    { kontekst: 'Ovaj grad je veliko naseljeno mesto.', znacenje: 'veliko naseljeno mesto' },
    { kontekst: 'Grad je oštetio voćnjake.', znacenje: 'padavina u obliku ledenih zrna' },
  ] },
  { rec: 'vila', znacenja: [
    { kontekst: 'U bajci dobra vila pomaže junaku.', znacenje: 'čudesno biće iz bajke' },
    { kontekst: 'Na obali mora nalazi se velika vila.', znacenje: 'raskošna kuća' },
  ] },
  { rec: 'para', znacenja: [
    { kontekst: 'Iz lonca se podigla para.', znacenje: 'vodena para' },
    { kontekst: 'U kasici nije ostala ni para.', znacenje: 'novac male vrednosti' },
  ] },
  { rec: 'sto', znacenja: [
    { kontekst: 'Sto se nalazi kraj prozora.', znacenje: 'komad nameštaja' },
    { kontekst: 'Broj klikera u kutiji je sto.', znacenje: 'broj 100' },
  ] },
]

const IZRAZI = [
  { izraz: 'pao mu je kamen sa srca', znacenje: 'osetio je veliko olakšanje', netacno: 'veoma se naljutio' },
  { izraz: 'srce mu je sišlo u pete', znacenje: 'veoma se uplašio', netacno: 'postao je veseo' },
  { izraz: 'mlatiti praznu slamu', znacenje: 'govoriti bez koristi i smisla', netacno: 'vredno raditi na njivi' },
  { izraz: 'soliti pamet', znacenje: 'nametljivo davati neželjene savete', netacno: 'pažljivo spremati ručak' },
  { izraz: 'pokazati zube', znacenje: 'odlučno se suprotstaviti', netacno: 'nasmejati se za fotografiju' },
  { izraz: 'imati zlatne ruke', znacenje: 'biti veoma vešt', netacno: 'nositi zlatan nakit' },
  { izraz: 'dati vetar u leđa', znacenje: 'pružiti podršku i podstrek', netacno: 'oterati nekoga' },
  { izraz: 'hvatati zjale', znacenje: 'gubiti vreme', netacno: 'pažljivo nešto tražiti' },
  { izraz: 'izvući deblji kraj', znacenje: 'proći najgore', netacno: 'dobiti najbolju nagradu' },
  { izraz: 'progledati kroz prste', znacenje: 'svesno zanemariti nečiju grešku', netacno: 'loše videti' },
  { izraz: 'obećavati kule i gradove', znacenje: 'davati velika i nerealna obećanja', netacno: 'planirati gradnju kuće' },
  { izraz: 'bogu iza leđa', znacenje: 'veoma daleko i zabačeno', netacno: 'odmah pored kuće' },
]

export const srpskiRecnik4: TopicGenerator = {
  slug: 'srpski-recnik-4', supportedTypes: ['text', 'truefalse'], supportsWordProblems: false,
  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const vrsta = cfg.type === 'text' ? 'sinonim' : cfg.type === 'truefalse' ? izaberi(rng, ['homonim', 'ustaljeni-izraz'] as const) : izaberi(rng, ['sinonim', 'homonim', 'ustaljeni-izraz'] as const)
    if (vrsta === 'sinonim') {
      const [rec, ...odgovori] = izaberi(rng, SINONIMI); const signature = `srpski-recnik-4:sinonim:${rec}`
      if (taken.has(signature)) return null
      return upakujSrpskiTekst(cfg, { pitanje: `Napiši reč istog ili sličnog značenja kao „${rec}“.`, tacan: odgovori[0], prihvaceni: odgovori.slice(1),
        explanation: `„${rec}“ i „${odgovori[0]}“ imaju isto ili slično značenje.`, hint: 'Traži sinonim.', signature })
    }
    if (vrsta === 'ustaljeni-izraz') {
      const p = izaberi(rng, IZRAZI); const signature = `srpski-recnik-4:ustaljeni-izraz:${p.izraz}`
      if (taken.has(signature)) return null
      return upakujSrpskiTvrdnju(cfg, rng, { tvrdnjaTacna: `Ustaljeni izraz „${p.izraz}“ znači: ${p.znacenje}.`,
        tvrdnjaNetacna: `Ustaljeni izraz „${p.izraz}“ znači: ${p.netacno}.`, explanation: `Izraz „${p.izraz}“ znači: ${p.znacenje}.`,
        hint: 'Posmatraj značenje celog izraza, a ne svake reči posebno.', signature })
    }
    const homonim = izaberi(rng, HOMONIMI); const znacenje = izaberi(rng, homonim.znacenja)
    const signature = `srpski-recnik-4:homonim:${homonim.rec}:${znacenje.kontekst}`
    if (taken.has(signature)) return null
    const pogresno = izaberi(rng, homonim.znacenja.filter((z) => z !== znacenje))
    return upakujSrpskiTvrdnju(cfg, rng, { tvrdnjaTacna: `U rečenici „${znacenje.kontekst}“ reč „${homonim.rec}“ znači: ${znacenje.znacenje}.`,
      tvrdnjaNetacna: `U rečenici „${znacenje.kontekst}“ reč „${homonim.rec}“ znači: ${pogresno.znacenje}.`,
      explanation: `U ovom kontekstu „${homonim.rec}“ znači: ${znacenje.znacenje}.`, hint: 'Značenje odredi prema celoj rečenici.', signature })
  },
}
