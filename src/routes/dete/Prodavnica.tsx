import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ObavestenjaZvonce } from '../../components/ObavestenjaZvonce'
import { Loader, Modal, TemaDugme } from '../../components/Zajednicke'
import { kupiStavku, listajObavestenjaDeteta, oznaciObavestenjaDetetaProcitanim, ucitajProdavnicu } from '../../lib/api'
import { formatDatum } from '../../lib/format'
import { oznaciInboxProcitanim } from '../../lib/obavestenja'
import type { InboxObavestenja } from '../../types/db'
import type { KupovinaPrikaz, ProdavnicaPayload, StavkaProdavnicePrikaz } from '../../types/kviz'
import './prodavnica.css'

const GRESKE_KUPOVINE: Record<string, (balance?: number, cost?: number) => string> = {
  already_purchased: () => 'Ovu nagradu si već kupio/la.',
  awaiting_consumption: () => 'Već si kupio/la ovu nagradu — sačekaj da bude isporučena pre novog kupovanja.',
  insufficient_balance: (b, c) => `Nemaš dovoljno zvezdica. Potrebno je ${c}⭐, a raspoloživo je ${b ?? 0}⭐.`,
  item_not_found: () => 'Ova nagrada više nije dostupna.',
  profile_not_found: () => 'Profil nije pronađen.',
}

function opisiStatusKupovine(status: KupovinaPrikaz['status']): { tekst: string, klasa: string } {
  switch (status) {
    case 'requested': return { tekst: 'Čeka isporuku', klasa: 'bedz--upozorenje' }
    case 'consumed': return { tekst: 'Isporučeno', klasa: 'bedz--uspeh' }
    case 'cancelled': return { tekst: 'Otkazano', klasa: 'bedz--neutral' }
  }
}

export function Prodavnica() {
  const { profilToken = '' } = useParams<{ profilToken: string }>()
  const [prodavnica, setProdavnica] = useState<ProdavnicaPayload | null>(null)
  const [ucitava, setUcitava] = useState(true)
  const [greska, setGreska] = useState<string | null>(null)
  const [poruka, setPoruka] = useState<string | null>(null)
  const [potvrda, setPotvrda] = useState<StavkaProdavnicePrikaz | null>(null)
  const [kupuje, setKupuje] = useState(false)
  const [inbox, setInbox] = useState<InboxObavestenja>({ obavestenja: [], neprocitano: 0 })

  const osvezi = useCallback(async () => {
    if (!profilToken) return
    try {
      const podaci = await ucitajProdavnicu(profilToken)
      setProdavnica(podaci)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    }
  }, [profilToken])

  const osveziObavestenja = useCallback(async () => {
    if (!profilToken) return
    try {
      setInbox(await listajObavestenjaDeteta(profilToken))
    } catch {
      // Katalog i dalje radi i bez obaveštenja.
    }
  }, [profilToken])

  useEffect(() => {
    setUcitava(true)
    osvezi().finally(() => setUcitava(false))
  }, [osvezi])

  useEffect(() => {
    void osveziObavestenja()
    return () => { /* nema intervala — kratak boravak na ekranu */ }
  }, [osveziObavestenja])

  async function oznaciProcitanim(ids?: string[]) {
    await oznaciObavestenjaDetetaProcitanim(profilToken, ids)
    setInbox((prethodni) => oznaciInboxProcitanim(prethodni, ids))
  }

  async function potvrdiKupovinu() {
    if (!potvrda) return
    setKupuje(true)
    setGreska(null)
    setPoruka(null)
    try {
      const ishod = await kupiStavku(profilToken, potvrda.id)
      if (!ishod.ok) {
        const porukaGreske = ishod.error ? GRESKE_KUPOVINE[ishod.error]?.(ishod.balance, ishod.cost) : undefined
        setGreska(porukaGreske ?? ishod.error ?? 'Kupovina nije uspela.')
        return
      }
      setPotvrda(null)
      setPoruka(`Hura! Kupio/la si „${potvrda.title}”. Čeka isporuku.`)
      await osvezi()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setKupuje(false)
    }
  }

  if (ucitava) return <Loader tekst="Učitavanje prodavnice…" />
  if (!prodavnica?.ok) {
    return (
      <div className="sadrzaj sadrzaj--usko centar prodavnica-greska">
        <div className="profil-avatar profil-avatar--mali" aria-hidden="true">😕</div>
        <h1>Prodavnica nije dostupna</h1>
        <p className="poruka poruka--greska razmak-gore">
          {prodavnica?.error === 'not_found'
            ? 'Profilni link nije ispravan.'
            : (prodavnica?.error ?? 'Pokušaj ponovo kasnije.')}
        </p>
        <Link className="dugme dugme--senka razmak-gore" to={`/dete/${profilToken}`}>Nazad na profil</Link>
      </div>
    )
  }

  const balans = prodavnica.balance ?? 0
  const ukupno = prodavnica.totalStars ?? 0
  const stavke = prodavnica.items ?? []
  const kupovine = prodavnica.purchases ?? []

  function stanjeStavke(stavka: StavkaProdavnicePrikaz): {
    sadrzajDugmeta: string
    onemoguceno: boolean
    klasaKartice: string
  } {
    if (stavka.purchased && !stavka.repeatable) {
      return { sadrzajDugmeta: '✓ Kupljeno', onemoguceno: true, klasaKartice: 'prodavnica-stavka--kupljeno' }
    }
    if (stavka.awaitingConsumption) {
      return { sadrzajDugmeta: 'Čeka isporuku', onemoguceno: true, klasaKartice: 'prodavnica-stavka--zakljucano' }
    }
    if (balans < stavka.cost) {
      return { sadrzajDugmeta: `Potrebno ${stavka.cost}⭐`, onemoguceno: true, klasaKartice: 'prodavnica-stavka--zakljucano' }
    }
    return { sadrzajDugmeta: `Kupi · ${stavka.cost}⭐`, onemoguceno: false, klasaKartice: '' }
  }

  return (
    <main className="prodavnica-strana">
      <div className="prodavnica-omot">
        <div className="red red--kraj">
          <ObavestenjaZvonce
            inbox={inbox}
            onOznaciProcitanim={oznaciProcitanim}
            nazivPrimaoca={prodavnica.name ?? 'deteta'}
          />
          <TemaDugme />
        </div>

        <Link className="dugme dugme--senka dugme--malo razmak-gore" to={`/dete/${profilToken}`}>
          ← Nazad na profil
        </Link>

        <section className="prodavnica-zaglavlje">
          <div className="profil-avatar" aria-hidden="true">{prodavnica.avatar}</div>
          <div>
            <p className="prodavnica-nadnaslov">Prodavnica</p>
            <h1>{prodavnica.name}</h1>
            <div className="prodavnica-balans">
              <span className="bedz bedz--raspolozivo" title="Zvezdice raspoložive za trošenje">
                🛒 Raspoloživo: <strong>{balans}</strong>⭐
              </span>
              <span className="bedz" title="Ukupno zvezdica osvojenih ikada">
                ⭐ Ukupno osvojeno: <strong>{ukupno}</strong>
              </span>
            </div>
          </div>
        </section>

        {poruka && <p className="poruka poruka--uspeh razmak-gore">{poruka}</p>}
        {greska && <p className="poruka poruka--greska razmak-gore" role="alert">{greska}</p>}

        <section className="prodavnica-sekcija">
          <div className="prodavnica-sekcija-naslov">
            <div>
              <p className="prodavnica-nadnaslov">Zameni zvezdice</p>
              <h2>Katalog nagrada</h2>
            </div>
            <span className="bedz">{stavke.length}</span>
          </div>

          {stavke.length === 0 ? (
            <div className="kartica prodavnica-prazno">
              <span aria-hidden="true">🏪</span>
              <div>
                <h3>Prodavnica je trenutno prazna</h3>
                <p className="blago">Nove nagrade će se pojaviti ovde uskoro.</p>
              </div>
            </div>
          ) : (
            <div className="prodavnica-mreza">
              {stavke.map((stavka) => {
                const stanje = stanjeStavke(stavka)
                return (
                  <article key={stavka.id} className={`kartica prodavnica-stavka ${stanje.klasaKartice}`}>
                    <div className="prodavnica-stavka-glava">
                      <span className="prodavnica-stavka-emoji" aria-hidden="true">{stavka.emoji}</span>
                      <span className="prodavnica-stavka-cena">{stavka.cost}⭐</span>
                    </div>
                    <h3>{stavka.title}</h3>
                    {stavka.description && <p className="prodavnica-stavka-opis">{stavka.description}</p>}
                    <div className="prodavnica-stavka-info">
                      {stavka.repeatable && <span className="bedz bedz--neutral">🔁 Može više puta</span>}
                      {stavka.repeatable && stavka.previousCount > 0 && !stavka.awaitingConsumption && (
                        <span className="bedz bedz--neutral">Ranije isporučeno: {stavka.previousCount}×</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="dugme dugme--akcenat"
                      disabled={stanje.onemoguceno}
                      onClick={() => { setGreska(null); setPoruka(null); setPotvrda(stavka) }}
                    >
                      {stanje.sadrzajDugmeta}
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="prodavnica-sekcija">
          <div className="prodavnica-sekcija-naslov">
            <div>
              <p className="prodavnica-nadnaslov">Tvoje nagrade</p>
              <h2>Moje kupovine</h2>
            </div>
            <span className="bedz">{kupovine.length}</span>
          </div>

          {kupovine.length === 0 ? (
            <div className="kartica prodavnica-prazno">
              <span aria-hidden="true">🎁</span>
              <div>
                <h3>Još uvek nema kupovina</h3>
                <p className="blago">Kupi nešto iz kataloga gore da bi se nagrada pojavila ovde.</p>
              </div>
            </div>
          ) : (
            <div className="kartica">
              {kupovine.map((kupovina) => {
                const status = opisiStatusKupovine(kupovina.status)
                return (
                  <div className="prodavnica-nagrada" key={kupovina.id}>
                    <div className="prodavnica-nagrada-glava">
                      <span className="prodavnica-nagrada-emoji" aria-hidden="true">{kupovina.emoji}</span>
                      <div>
                        <strong>{kupovina.title}</strong>
                        <p className="malo blago">
                          {kupovina.cost}⭐ · {formatDatum(kupovina.requestedAt)}
                          {kupovina.status === 'consumed' && kupovina.consumedAt && ` · isporučeno ${formatDatum(kupovina.consumedAt)}`}
                        </p>
                      </div>
                    </div>
                    <div className="prodavnica-nagrada-status">
                      <span className={`bedz ${status.klasa}`}>{status.tekst}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {potvrda && (
        <Modal naslov="Potvrda kupovine" onZatvori={kupuje ? () => {} : () => setPotvrda(null)}>
          <div className="prodavnica-potvrda-telo">
            <div className="prodavnica-potvrda-stavka">
              <span className="prodavnica-stavka-emoji" aria-hidden="true">{potvrda.emoji}</span>
              <div>
                <strong>{potvrda.title}</strong>
                {potvrda.description && <p className="malo blago">{potvrda.description}</p>}
              </div>
            </div>
            <p className="blago">
              Biće potrošeno <strong>{potvrda.cost}⭐</strong> od raspoloživih <strong>{balans}⭐</strong>.
              Nakon kupovine, raspoloživo će biti <strong>{Math.max(0, balans - potvrda.cost)}⭐</strong>.
            </p>
            {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}
            <div className="red red--kraj">
              <button type="button" className="dugme dugme--senka" disabled={kupuje} onClick={() => setPotvrda(null)}>
                Otkaži
              </button>
              <button type="button" className="dugme dugme--akcenat" disabled={kupuje} onClick={potvrdiKupovinu}>
                {kupuje ? 'Kupujem…' : `Kupi za ${potvrda.cost}⭐`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  )
}
