// Generator: pravopis 4. razred — upravni govor, prisvojni pridevi na -ski/-ški/-čki, višečlana geografska imena.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujSrpskiIzbor } from '../moduli/srpskiZajednicko.ts'

interface PravopisniPrimer {
  id: string
  nivo: 1 | 2 | 3 | 4 | 5
  tacno: string
  pogresno: string[]
  pravilo: string
  // Ime od kog se izvodi pridev (samo nivo 2) — navodi se u tekstu pitanja.
  ime?: string
}

const PRIMERI: PravopisniPrimer[] = [
  // Nivo 1: Upravni govor (Model 1)
  { id: 'ug-m1-ana', nivo: 1, tacno: 'Ana kaže: „Danas je lep dan.“', pogresno: ['Ana kaže „Danas je lep dan.“', 'Ana kaže: Danas je lep dan.', 'Ana kaže: „Danas je lep dan“.'], pravilo: 'Pisčeva reč se odvaja dvotačkom, a upravni govor se stavlja pod navodnike.' },
  { id: 'ug-m1-uciteljica', nivo: 1, tacno: 'Učiteljica pita: „Ko je uradio domaći?“', pogresno: ['Učiteljica pita: Ko je uradio domaći?', 'Učiteljica pita „Ko je uradio domaći?“', 'Učiteljica pita: „Ko je uradio domaći“?'], pravilo: 'Pisčeva reč se odvaja dvotačkom, a upravni govor se stavlja pod navodnike i počinje velikim slovom.' },
  { id: 'ug-m1-tata', nivo: 1, tacno: 'Tata viče: „Pazi na loptu!“', pogresno: ['Tata viče „Pazi na loptu!“', 'Tata viče: Pazi na loptu!', 'Tata viče: „Pazi na loptu“!'], pravilo: 'Pisčeva reč se odvaja dvotačkom, a uzvičnik ide pre zatvorenih navodnika.' },
  { id: 'ug-m1-deda', nivo: 1, tacno: 'Deda kaže: „Donosim poklone.“', pogresno: ['Deda kaže: Donosim poklone.', 'Deda kaže „Donosim poklone.“', 'Deda kaže: „donosim poklone.“'], pravilo: 'Upravni govor počinje velikim slovom i stavlja se pod navodnike.' },
  { id: 'ug-m1-mika', nivo: 1, tacno: 'Mika pita: „Hoćemo li u park?“', pogresno: ['Mika pita „Hoćemo li u park?“', 'Mika pita: Hoćemo li u park?', 'Mika pita: „hoćemo li u park?“'], pravilo: 'Upravni govor počinje velikim slovom.' },
  { id: 'ug-m1-marko', nivo: 1, tacno: 'Marko kaže: „Volim zimu.“', pogresno: ['Marko kaže „Volim zimu.“', 'Marko kaže: Volim zimu.', 'Marko kaže: „volim zimu.“'], pravilo: 'Pisčeva reč se odvaja dvotačkom.' },
  { id: 'ug-m1-baka', nivo: 1, tacno: 'Baka zove: „Ručak je gotov!“', pogresno: ['Baka zove „Ručak je gotov!“', 'Baka zove: Ručak je gotov!', 'Baka zove: „ručak je gotov!“'], pravilo: 'Uzvičnik ostaje unutar upravnog govora.' },
  { id: 'ug-m1-sestra', nivo: 1, tacno: 'Sestra pita: „Gde mi je lutka?“', pogresno: ['Sestra pita „Gde mi je lutka?“', 'Sestra pita: Gde mi je lutka?', 'Sestra pita: „gde mi je lutka?“'], pravilo: 'Pitanje unutar upravnog govora čuva svoj upitnik.' },
  
  // Nivo 2: Prisvojni pridevi (-ski, -ški, -čki)
  { id: 'pridev-beograd', nivo: 2, ime: 'Beograd', tacno: 'beogradski', pogresno: ['Beogradski', 'beo gradski', 'beogradovski'], pravilo: 'Prisvojni pridevi nastali od vlastitih imena koji se završavaju na -ski, -ški, -čki pišu se malim slovom.' },
  { id: 'pridev-srbija', nivo: 2, ime: 'Srbija', tacno: 'srpski', pogresno: ['Srpski', 'Srbijanski', 'srbijanski'], pravilo: 'Prisvojni pridevi na -ski pišu se malim početnim slovom.' },
  { id: 'pridev-kragujevac', nivo: 2, ime: 'Kragujevac', tacno: 'kragujevački', pogresno: ['Kragujevački', 'kragujevacski', 'kragujevač ki'], pravilo: 'Prisvojni pridevi na -čki pišu se malim slovom.' },
  { id: 'pridev-novi-sad', nivo: 2, ime: 'Novi Sad', tacno: 'novosadski', pogresno: ['Novosadski', 'novi sadski', 'Novi sadski'], pravilo: 'Prisvojni pridevi od višečlanih imena pišu se spojeno i malim slovom.' },
  { id: 'pridev-vranje', nivo: 2, ime: 'Vranje', tacno: 'vranjski', pogresno: ['Vranjski', 'vranjeski', 'vranje ski'], pravilo: 'Prisvojni pridevi nastali od imena gradova pišu se malim slovom.' },
  { id: 'pridev-pirot', nivo: 2, ime: 'Pirot', tacno: 'piroćanski', pogresno: ['Piroćanski', 'piroćaski', 'pirot ki'], pravilo: 'Pridevi na -ski i -ški uvek idu malim slovom.' },
  { id: 'pridev-nis', nivo: 2, ime: 'Niš', tacno: 'niški', pogresno: ['Niški', 'nišavski', 'niš ki'], pravilo: 'Prisvojni pridevi na -ški pišu se malim slovom.' },
  { id: 'pridev-zlatibor', nivo: 2, ime: 'Zlatibor', tacno: 'zlatiborski', pogresno: ['Zlatiborski', 'zlatiborovski', 'zlati borski'], pravilo: 'Prisvojni pridevi od imena planina pišu se malim slovom.' },
  { id: 'pridev-subotica', nivo: 2, ime: 'Subotica', tacno: 'subotički', pogresno: ['Subotički', 'suboticki', 'subotič ki'], pravilo: 'Prisvojni pridevi na -čki pišu se malim slovom, bez obraćanja pažnje na veliko slovo u imenu grada.' },
  { id: 'pridev-valjevo', nivo: 2, ime: 'Valjevo', tacno: 'valjevski', pogresno: ['Valjevski', 'valjevovski', 'valjevo ski'], pravilo: 'Prisvojni pridevi od imena gradova pišu se malim slovom.' },
  { id: 'pridev-pancevo', nivo: 2, ime: 'Pančevo', tacno: 'pančevački', pogresno: ['Pančevački', 'pančevski', 'pančevač ki'], pravilo: 'Prisvojni pridevi na -čki pišu se malim slovom.' },
  { id: 'pridev-sabac', nivo: 2, ime: 'Šabac', tacno: 'šabački', pogresno: ['Šabački', 'šabacski', 'šabač ki'], pravilo: 'Prisvojni pridevi na -čki pišu se malim slovom.' },

  // Nivo 3: Upravni govor (Model 2)
  { id: 'ug-m2-ana', nivo: 3, tacno: '„Danas je lep dan“, kaže Ana.', pogresno: ['„Danas je lep dan“ kaže Ana.', 'Danas je lep dan, kaže Ana.', '„Danas je lep dan,“ kaže Ana.'], pravilo: 'Kada je upravni govor na prvom mestu, posle navodnika ide zapeta, a pisčeva reč počinje malim slovom.' },
  { id: 'ug-m2-uciteljica', nivo: 3, tacno: '„Ko je uradio domaći?“, pita učiteljica.', pogresno: ['„Ko je uradio domaći?“ pita učiteljica.', '„Ko je uradio domaći?“ Pita učiteljica.', 'Ko je uradio domaći?, pita učiteljica.'], pravilo: 'Upitnik ostaje unutar navodnika, a pisčeva reč se odvaja zapetom.' },
  { id: 'ug-m2-tata', nivo: 3, tacno: '„Pazi na loptu!“, viče tata.', pogresno: ['„Pazi na loptu!“ viče tata.', '„Pazi na loptu!“, Viče tata.', 'Pazi na loptu!, viče tata.'], pravilo: 'Zapeta se stavlja posle zatvorenika.' },
  { id: 'ug-m2-deda', nivo: 3, tacno: '„Donosim poklone“, kaže deda.', pogresno: ['„Donosim poklone“ kaže deda.', 'Donosim poklone, kaže deda.', '„Donosim poklone,“ kaže deda.'], pravilo: 'Zapeta se piše iza zatvorenog navodnika.' },
  { id: 'ug-m2-mika', nivo: 3, tacno: '„Hoćemo li u park?“, pita Mika.', pogresno: ['„Hoćemo li u park?“ pita Mika.', '„Hoćemo li u park?“, Pita Mika.', 'Hoćemo li u park?, pita Mika.'], pravilo: 'Upitnik i uzvičnik ostaju unutar navodnika, dok zapeta ide posle navodnika.' },
  { id: 'ug-m2-marko', nivo: 3, tacno: '„Volim zimu“, kaže Marko.', pogresno: ['„Volim zimu“ kaže Marko.', 'Volim zimu, kaže Marko.', '„Volim zimu,“ kaže Marko.'], pravilo: 'Pisčeva reč odvaja se zapetom posle navodnika.' },
  { id: 'ug-m2-baka', nivo: 3, tacno: '„Ručak je gotov!“, zove baka.', pogresno: ['„Ručak je gotov!“ zove baka.', '„Ručak je gotov!“, Zove baka.', 'Ručak je gotov!, zove baka.'], pravilo: 'Pisčeva reč mora da počne malim slovom.' },
  { id: 'ug-m2-sestra', nivo: 3, tacno: '„Gde mi je lutka?“, pita sestra.', pogresno: ['„Gde mi je lutka?“ pita sestra.', '„Gde mi je lutka?“, Pita sestra.', 'Gde mi je lutka?, pita sestra.'], pravilo: 'Upitnik pripada upravnom govoru.' },

  // Nivo 4: Višečlana geografska imena
  { id: 'geografija-fruska', nivo: 4, tacno: 'Fruška gora', pogresno: ['Fruška Gora', 'fruška gora', 'fruška Gora'], pravilo: 'Kod višečlanih geografskih imena, samo se prva reč piše velikim slovom, osim ako druga reč nije vlastito ime.' },
  { id: 'geografija-beli-drim', nivo: 4, tacno: 'Beli Drim', pogresno: ['Beli drim', 'beli Drim', 'beli drim'], pravilo: 'Drim je vlastito ime (ime reke), pa se obe reči pišu velikim slovom.' },
  { id: 'geografija-stara', nivo: 4, tacno: 'Stara planina', pogresno: ['Stara Planina', 'stara planina', 'stara Planina'], pravilo: 'Reč „planina“ nije vlastito ime, pa se piše malim slovom.' },
  { id: 'geografija-novi', nivo: 4, tacno: 'Novi Pazar', pogresno: ['Novi pazar', 'novi pazar', 'novi Pazar'], pravilo: 'Sva naseljena mesta (gradovi, sela) pišu se tako da sve reči počinju velikim slovom.' },
  { id: 'geografija-zapadna', nivo: 4, tacno: 'Zapadna Morava', pogresno: ['Zapadna morava', 'zapadna Morava', 'zapadna morava'], pravilo: 'Reč Morava je vlastito ime reke, pa se piše velikim slovom.' },
  { id: 'geografija-suva', nivo: 4, tacno: 'Suva planina', pogresno: ['Suva Planina', 'suva planina', 'suva Planina'], pravilo: 'Reč planina nije vlastito ime.' },
  { id: 'geografija-sremski', nivo: 4, tacno: 'Sremski Karlovci', pogresno: ['Sremski karlovci', 'sremski Karlovci', 'sremski karlovci'], pravilo: 'Imena naseljenih mesta uvek imaju sve reči napisane velikim slovom.' },
  { id: 'geografija-juzna', nivo: 4, tacno: 'Južna Amerika', pogresno: ['Južna amerika', 'južna Amerika', 'južna amerika'], pravilo: 'Imena kontinenata se pišu tako da sve reči počinju velikim slovom.' },

  // Nivo 5: Upravni govor (Model 3) ili kombinacija
  { id: 'ug-m3-marko', nivo: 5, tacno: '„Kupio sam“, reče Marko, „novu loptu.“', pogresno: ['„Kupio sam“ reče Marko „novu loptu.“', '„Kupio sam,“ reče Marko, „novu loptu.“', '„Kupio sam“, reče Marko „novu loptu.“'], pravilo: 'Ubacivanje piščeve reči u upravni govor odvaja se zapetama, a drugi deo upravnog govora počinje malim slovom ako se nastavlja rečenica.' },
  { id: 'ug-m3-mama', nivo: 5, tacno: '„Operi ruke“, podseti me mama, „i dođi na ručak.“', pogresno: ['„Operi ruke“ podseti me mama, „i dođi na ručak.“', '„Operi ruke,“ podseti me mama, „i dođi na ručak.“', '„Operi ruke“, podseti me mama „i dođi na ručak.“'], pravilo: 'Piščeve reči usred upravnog govora odvajaju se zapetama sa obe strane.' },
  { id: 'kombinacija-1', nivo: 5, tacno: 'Novosadski kej se nalazi pored reke Dunav.', pogresno: ['Novosadski Kej se nalazi pored reke dunav.', 'Novosadski kej se nalazi pored reke dunav.', 'Novosadski kej se nalazi pored Reke Dunav.'], pravilo: 'Prisvojni pridev na početku rečenice piše se velikim slovom, kej i reka malim, a Dunav velikim.' },
  { id: 'ug-m3-tata', nivo: 5, tacno: '„Požuri“, reče tata, „zakasnićemo na voz.“', pogresno: ['„Požuri“ reče tata, „zakasnićemo na voz.“', '„Požuri,“ reče tata, „zakasnićemo na voz.“', '„Požuri“, reče tata „zakasnićemo na voz.“'], pravilo: 'Zarez ide posle zatvorenika i posle piščeve reči.' },
  { id: 'ug-m3-bata', nivo: 5, tacno: '„Dodaj mi“, zamoli me brat, „plavu olovku.“', pogresno: ['„Dodaj mi“ zamoli me brat „plavu olovku.“', '„Dodaj mi,“ zamoli me brat, „plavu olovku.“', '„Dodaj mi“, zamoli me brat „plavu olovku.“'], pravilo: 'Drugi deo upravnog govora počinje malim slovom kada se nastavlja.' },
  { id: 'kombinacija-2', nivo: 5, tacno: 'Moja omiljena planina je Fruška gora.', pogresno: ['Moja omiljena Planina je Fruška gora.', 'Moja omiljena planina je Fruška Gora.', 'Moja Omiljena planina je Fruška gora.'], pravilo: 'Planina ide malim slovom, a gora u Fruška gora ide malim slovom.' },
  { id: 'kombinacija-3', nivo: 5, tacno: '„Pročitao sam“, reče Uroš, „zanimljivu bajku.“', pogresno: ['„Pročitao sam“ reče Uroš „zanimljivu bajku.“', '„Pročitao sam,“ reče Uroš, „zanimljivu bajku.“', '„Pročitao sam“, reče uroš, „zanimljivu bajku.“'], pravilo: 'Uroš mora biti velikim slovom (ime), a zapete idu pravilno.' },
  { id: 'kombinacija-4', nivo: 5, tacno: 'Zlatiborski sir je jako ukusan.', pogresno: ['Zlatiborski Sir je jako ukusan.', 'zlatiborski sir je jako ukusan.', 'Zlatiborski sir je Jako ukusan.'], pravilo: 'Prva reč u rečenici velikim, sve ostalo malim slovom jer sir nije vlastita imenica.' },
]

export const srpskiPravopis4: TopicGenerator = {
  slug: 'srpski-pravopis-4',
  supportedTypes: ['single', 'truefalse'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const dostupni = PRIMERI.filter((primer) => primer.nivo === cfg.difficulty || (cfg.difficulty === 1 && primer.nivo <= 2))
    const primer = izaberi(rng, dostupni)

    const signature = `srpski-pravopis-4:${primer.id}`
    if (taken.has(signature)) return null

    return upakujSrpskiIzbor(cfg, rng, {
      pitanje: primer.nivo === 2
        ? `Kako se pravilno piše prisvojni pridev izveden od imena „${primer.ime}“?`
        : 'Koja rečenica (ili reč) je pravilno napisana?',
      tacan: primer.tacno,
      netacni: primer.pogresno,
      tvrdnja: (odgovor) => `Pravilno je napisano: „${odgovor}“.`,
      explanation: `${primer.tacno} — ${primer.pravilo}`,
      hint: primer.id.startsWith('ug') ? 'Pazi na znakove interpunkcije: dvotačku, navodnike i zapete kod upravnog govora.' : 
            primer.id.startsWith('pridev') ? 'Prisvojni pridevi na -ski, -ški, -čki pišu se malim slovom.' : 
            'Pazi na veliko i malo slovo kod višečlanih geografskih imena.',
      signature,
    })
  },
}
