import { PID_OBLASTI_3 } from './treci.ts'
import { PID_OBLASTI_4 } from './cetvrti.ts'
import { beograd3 } from './beograd.ts'

export const MODULI_PRIRODE_I_DRUSTVA = [...PID_OBLASTI_3, beograd3, ...PID_OBLASTI_4]

// Manifest povezuje svaku programsku celinu sa stabilnom porodicom potpisa generatora.
export const PID_PROGRAMSKA_POKRIVENOST: Record<string, readonly string[]> = {
  'pid-priroda-covek-drustvo-3': [
    'reljef', 'povrsinske-vode', 'delatnosti', 'naselja', 'saobracaj', 'bezbednost-saobracaj',
    'stanja-vode', 'kruzenje-vode', 'vazduh-temperatura', 'merenje-temperature',
    'zivotne-zajednice', 'lanci-ishrane', 'zastita-prirode', 'zdravlje',
  ],
  'pid-orijentacija-3': [
    'strane-sveta', 'orijentacija', 'plan-naselja', 'geografska-karta', 'vremenske-odrednice',
  ],
  'pid-proslost-3': [
    'istorijski-izvori', 'porodicna-proslost', 'vremenske-odrednice', 'redosled-dogadjaja',
    'zivot-nekad-i-sad',
  ],
  'pid-kretanje-3': [
    'putanja', 'sila-i-rastojanje', 'zemljina-teza', 'padanje-tela', 'izvori-svetlosti',
    'senka', 'nastanak-zvuka', 'jacina-zvuka', 'zastita-od-buke',
  ],
  'pid-materijali-3': [
    'povratne-promene', 'nepovratne-promene', 'promene-stanja', 'svojstva-tecnosti',
    'rastvaranje', 'toplotna-provodljivost', 'toplotna-izolacija', 'reciklaza', 'odrzivi-razvoj',
  ],
  'pid-beograd-3': [
    'polozaj-i-vode', 'reljef-i-izletista', 'znamenitosti', 'proslost-grada',
    'kultura', 'orijentacija-u-gradu', 'saobracaj', 'zastita-prirode',
  ],
  'pid-odlike-srbije-4': [
    'polozaj-srbije', 'simboli-i-valuta', 'reljef-srbije', 'vode-srbije', 'sume-srbije',
    'nacionalni-parkovi', 'zastita-vrsta', 'stanovnistvo-i-naselja', 'privreda-srbije',
    'gradjani-srbije', 'prirodni-resursi',
    'odrziva-upotreba',
  ],
  'pid-covek-4': [
    'covek-kao-bice', 'odrastanje', 'dnevne-aktivnosti', 'digitalna-ravnoteza',
    'digitalna-bezbednost',
  ],
  'pid-materijali-4': [
    'smese', 'razdvajanje-smesa', 'elektricitet', 'elektricna-provodljivost',
    'racionalna-potrosnja', 'magneti', 'sagorevanje', 'zastita-od-pozara',
  ],
  'pid-proslost-srbije-4': [
    'dolazak-slovena', 'nemanjici', 'zivot-pod-turskom-vlascu', 'srpski-ustanci',
    'savremeno-doba', 'hronologija',
  ],
}
