// Brisanje roditeljskog naloga sa svim podacima. Potvrda je ukucana email adresa naloga.
// Vlasnik platforme ne može da obriše nalog (zajednička banka pitanja).
import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { obrisiMojNalog } from '../lib/api'
import { KLJUC_PORUKE_POSLE_BRISANJA, potvrdaBrisanjaJeIspravna } from '../lib/nalog'

export function BrisanjeNaloga() {
  const { session, odjavi, jeVlasnikPlatforme } = useAuth()
  const [potvrda, setPotvrda] = useState('')
  const [radi, setRadi] = useState(false)
  const [greska, setGreska] = useState<string | null>(null)
  const emailNaloga = session?.user.email ?? null

  if (jeVlasnikPlatforme) {
    return (
      <div className="roditelj-sekcija">
        <h2>Obriši nalog</h2>
        <p className="blago">
          Vlasnik platforme ne može da obriše nalog, jer su njegova pitanja zajednička banka za sve roditelje.
        </p>
      </div>
    )
  }

  const mozeDaSeBrise = !radi && potvrdaBrisanjaJeIspravna(potvrda, emailNaloga)

  async function obrisi(e: FormEvent) {
    e.preventDefault()
    if (!mozeDaSeBrise) return
    setRadi(true)
    setGreska(null)
    try {
      await obrisiMojNalog(potvrda.trim())
      sessionStorage.setItem(KLJUC_PORUKE_POSLE_BRISANJA, 'Nalog i svi podaci su obrisani.')
      await odjavi()
    } catch (err) {
      setGreska(String((err as Error).message ?? err))
      setRadi(false)
    }
  }

  return (
    <div className="roditelj-sekcija podesavanja-brisanje">
      <h2>Obriši nalog</h2>
      <p className="blago razmak-dole">
        Brišu se svi tvoji podaci: deca i njihovi profili, kvizovi, sopstvena pitanja, odgovori i rezultati,
        šahovske partije, rasporedi, obaveštenja i pretplate na uređajima. Ovo se ne može poništiti.
      </p>
      <form onSubmit={obrisi}>
        <div className="polje">
          <label htmlFor="brisanje-potvrda">
            Ukucaj svoju email adresu{emailNaloga ? ` (${emailNaloga})` : ''} da potvrdiš
          </label>
          <input
            id="brisanje-potvrda" type="email" inputMode="email" autoCapitalize="none"
            autoCorrect="off" autoComplete="off" value={potvrda}
            onChange={(e) => setPotvrda(e.target.value)}
          />
        </div>
        {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}
        <button type="submit" className="dugme dugme--opasno razmak-gore" disabled={!mozeDaSeBrise}>
          {radi ? 'Brišem…' : 'Obriši nalog i sve podatke'}
        </button>
      </form>
    </div>
  )
}
