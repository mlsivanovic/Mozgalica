// Generator: pravopis — veliko slovo, rečce ne/li, interpunkcija i glasovi č/ć/dž/đ.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujSrpskiIzbor } from './srpskiZajednicko.ts'

interface PravopisniPrimer {
  id: string
  nivo: 1 | 2 | 3 | 4 | 5
  tacno: string
  pogresno: string[]
  pravilo: string
}

const PRIMERI: PravopisniPrimer[] = [
  { id: 'pocetak-ana', nivo: 1, tacno: 'Ana čita knjigu.', pogresno: ['ana čita knjigu.', 'Ana čita knjigu', 'ana čita knjigu'], pravilo: 'Rečenica počinje velikim slovom i završava se tačkom.' },
  { id: 'pocetak-pas', nivo: 1, tacno: 'Pas spava u dvorištu.', pogresno: ['pas spava u dvorištu.', 'Pas spava u dvorištu', 'pas spava u dvorištu'], pravilo: 'Rečenica počinje velikim slovom i završava se tačkom.' },
  { id: 'upitna-gde', nivo: 1, tacno: 'Gde je moja sveska?', pogresno: ['gde je moja sveska?', 'Gde je moja sveska.', 'Gde je moja sveska!'], pravilo: 'Upitna rečenica počinje velikim slovom i završava se upitnikom.' },
  { id: 'upitna-kada', nivo: 1, tacno: 'Kada počinje film?', pogresno: ['Kada počinje film.', 'kada počinje film?', 'Kada počinje film!'], pravilo: 'Na kraju pitanja piše se upitnik.' },
  { id: 'uzvicna-pazi', nivo: 1, tacno: 'Pazi, lopta!', pogresno: ['Pazi, lopta.', 'pazi, lopta!', 'Pazi lopta?'], pravilo: 'Uzvik i upozorenje završavaju se uzvičnikom.' },
  { id: 'ime-milos', nivo: 1, tacno: 'Miloš vozi bicikl.', pogresno: ['miloš vozi bicikl.', 'Miloš vozi Bicikl.', 'miloš vozi Bicikl.'], pravilo: 'Lična imena pišu se velikim početnim slovom.' },
  { id: 'ime-jelena', nivo: 1, tacno: 'Jelena zaliva cveće.', pogresno: ['jelena zaliva cveće.', 'Jelena zaliva Cveće.', 'jelena zaliva Cveće.'], pravilo: 'Lična imena pišu se velikim početnim slovom.' },
  { id: 'grad-beograd', nivo: 1, tacno: 'Beograd leži na dve reke.', pogresno: ['beograd leži na dve reke.', 'Beograd leži na dve Reke.', 'beograd leži na dve Reke.'], pravilo: 'Ime grada piše se velikim početnim slovom.' },
  { id: 'reka-dunav', nivo: 2, tacno: 'Dunav protiče kroz Srbiju.', pogresno: ['dunav protiče kroz Srbiju.', 'Dunav protiče kroz srbiju.', 'dunav protiče kroz srbiju.'], pravilo: 'Imena reka i država pišu se velikim početnim slovom.' },
  { id: 'grad-novi-sad', nivo: 2, tacno: 'Novi Sad je grad na Dunavu.', pogresno: ['Novi sad je grad na Dunavu.', 'novi Sad je grad na dunavu.', 'Novi Sad je grad na dunavu.'], pravilo: 'Obe reči u imenu Novi Sad pišu se velikim početnim slovom, kao i ime Dunav.' },
  { id: 'planina-fruska', nivo: 2, tacno: 'Fruška gora je nacionalni park.', pogresno: ['Fruška Gora je nacionalni park.', 'fruška gora je nacionalni park.', 'fruška Gora je nacionalni park.'], pravilo: 'U imenu Fruška gora velikim slovom piše se prva reč.' },
  { id: 'ne-trci', nivo: 2, tacno: 'Ne trči po mokrom podu.', pogresno: ['Netrči po mokrom podu.', 'ne trči po mokrom podu.', 'Ne trči po mokrom podu'], pravilo: 'Rečca ne piše se odvojeno od glagola.' },
  { id: 'ne-zaboravi', nivo: 2, tacno: 'Ne zaboravi domaći zadatak.', pogresno: ['Nezaboravi domaći zadatak.', 'ne zaboravi domaći zadatak.', 'Ne zaboravi domaći zadatak'], pravilo: 'Rečca ne piše se odvojeno od glagola.' },
  { id: 'li-znas', nivo: 2, tacno: 'Znaš li odgovor?', pogresno: ['Znašli odgovor?', 'Znaš li odgovor.', 'znaš li odgovor?'], pravilo: 'Rečca li piše se odvojeno, a pitanje se završava upitnikom.' },
  { id: 'da-li', nivo: 2, tacno: 'Da li dolaziš sutra?', pogresno: ['Dali dolaziš sutra?', 'Da li dolaziš sutra.', 'da li dolaziš sutra?'], pravilo: 'U pitanju se da li piše kao dve reči.' },
  { id: 'zarez-nabrajanje', nivo: 3, tacno: 'Kupili smo hleb, mleko, sir i jabuke.', pogresno: ['Kupili smo hleb mleko sir i jabuke.', 'Kupili smo hleb, mleko sir, i jabuke.', 'Kupili smo, hleb, mleko, sir i jabuke.'], pravilo: 'Članovi nabrajanja odvajaju se zapetama, bez zapete ispred završnog i.' },
  { id: 'obracanje-ana', nivo: 3, tacno: 'Ana, dodaj mi olovku.', pogresno: ['Ana dodaj mi olovku.', 'Ana dodaj, mi olovku.', 'ana, dodaj mi olovku.'], pravilo: 'Ime osobe kojoj se obraćamo odvaja se zapetom.' },
  { id: 'navodnici', nivo: 3, tacno: 'Pročitali smo priču „Ježeva kućica“.', pogresno: ['Pročitali smo priču Ježeva kućica.', 'Pročitali smo Priču „ježeva kućica“.', 'pročitali smo priču „Ježeva kućica“.'], pravilo: 'Naslov se izdvaja navodnicima, a rečenica počinje velikim slovom.' },
  { id: 'c-c-kuca', nivo: 3, tacno: 'Kuća ima crveni crep.', pogresno: ['Kuča ima crveni crep.', 'Kuća ima crveni ćrep.', 'Kuča ima crveni ćrep.'], pravilo: 'Reči kuća i crep pišu se slovima ć i c.' },
  { id: 'c-c-sreca', nivo: 3, tacno: 'Dečak je imao sreće.', pogresno: ['Dećak je imao sreće.', 'Dečak je imao sreče.', 'Dećak je imao sreče.'], pravilo: 'Pravilno se piše dečak i sreća.' },
  { id: 'dz-dj', nivo: 4, tacno: 'Džemper je ostao između stolica.', pogresno: ['Đemper je ostao između stolica.', 'Džemper je ostao izmedžu stolica.', 'Đemper je ostao izmedžu stolica.'], pravilo: 'Pravilno se piše džemper i između.' },
  { id: 'najlepsi', nivo: 4, tacno: 'Ovo je najlepši crtež.', pogresno: ['Ovo je naj lepši crtež.', 'Ovo je najljepši crtež.', 'ovo je najlepši crtež.'], pravilo: 'Superlativ prideva piše se spojeno: najlepši.' },
  { id: 'necu', nivo: 4, tacno: 'Neću zakasniti na čas.', pogresno: ['Ne ću zakasniti na čas.', 'neću zakasniti na čas.', 'Neću zakasniti na Čas.'], pravilo: 'Odrični oblik neću piše se sastavljeno.' },
  { id: 'vise-pravila', nivo: 5, tacno: 'Petre, da li ćeš posetiti Novi Sad?', pogresno: ['Petre da li ćeš posetiti Novi Sad?', 'Petre, dali ćeš posetiti Novi sad?', 'petre, da li ćeš posetiti novi Sad?'], pravilo: 'Obraćanje se odvaja zapetom, da li se piše odvojeno, a vlastita imena velikim slovom.' },
  { id: 'vise-pravila-2', nivo: 5, tacno: 'Ne zaboravi, Milice, da poneseš knjigu „Čarobna šuma“.', pogresno: ['Nezaboravi, Milice, da poneseš knjigu „Čarobna Šuma“.', 'Ne zaboravi Milice da poneseš knjigu „Čarobna šuma“.', 'ne zaboravi, milice, da poneseš knjigu „čarobna šuma“.'], pravilo: 'Ne uz glagol piše se odvojeno, obraćanje se izdvaja zapetama, a prva reč naslova piše velikim slovom.' },
]

export const srpskiPravopis: TopicGenerator = {
  slug: 'srpski-pravopis',
  supportedTypes: ['single', 'truefalse'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const najniziNivo = cfg.difficulty <= 2 ? 1 : cfg.difficulty === 3 ? 2 : 3
    const dostupni = PRIMERI.filter((primer) => primer.nivo >= najniziNivo && primer.nivo <= cfg.difficulty)
    const primer = izaberi(rng, dostupni)
    const signature = `srpski-pravopis:${primer.id}`
    if (taken.has(signature)) return null
    return upakujSrpskiIzbor(cfg, rng, {
      pitanje: 'Koja rečenica je pravilno napisana?',
      tacan: primer.tacno,
      netacni: primer.pogresno,
      tvrdnja: (odgovor) => `Rečenica „${odgovor}“ pravilno je napisana.`,
      explanation: `${primer.tacno} ${primer.pravilo}`,
      hint: 'Proveri veliko slovo, razmake, znak na kraju i zapis svake reči.',
      signature,
    })
  },
}
