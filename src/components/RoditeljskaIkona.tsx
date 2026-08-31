import { Ikona, type ImeIkone } from './Ikona'

const MAPA: Record<string, ImeIkone> = {
  danas: 'danas', vezbanje: 'zadaci', napredak: 'napredak', nagrade: 'nagrade',
  podesavanja: 'podesavanja',
}

export function RoditeljskaIkona({ ime }: { ime: string }) {
  return <Ikona ime={MAPA[ime] ?? 'desno'} />
}
