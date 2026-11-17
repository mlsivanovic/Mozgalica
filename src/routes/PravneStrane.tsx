// Javne pravne stranice: politika privatnosti i uslovi korišćenja. Dostupne bez prijave.
// Sadržaj se oslanja na to šta aplikacija stvarno radi (šema baze, Edge funkcije, obaveštenja).
import { ArrowLeft, CheckCircle2, FileText, Lock, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DATUM_IZMENE, KONTAKT_EMAIL, POVERENIK_URL, RUKOVALAC } from '../lib/pravno'
import { useAuth } from '../lib/auth'

interface StavkaSadrzaja {
  id: string
  naslov: string
}

interface SazetakStavka {
  naslov: string
  opis: string
}

function skociNaSekciju(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function Okvir({
  aktivna,
  naslov,
  podnaslov,
  sadrzaj,
  sazetak,
  children,
}: {
  aktivna: 'privatnost' | 'uslovi'
  naslov: string
  podnaslov: string
  sadrzaj: StavkaSadrzaja[]
  sazetak: SazetakStavka[]
  children: React.ReactNode
}) {
  const { session } = useAuth()
  const nazadPutanja = session ? '/admin/podesavanja' : '/prijava'
  const nazadTekst = session ? 'Nazad na podešavanja' : 'Nazad na prijavu'

  return (
    <div className="sadrzaj pravna-strana">
      <div className="pravna-strana__traka">
        <Link to={nazadPutanja} className="dugme dugme--senka dugme--malo">
          <ArrowLeft size={16} aria-hidden="true" />
          {nazadTekst}
        </Link>
        <div className="pravna-strana__preklopnik" role="navigation" aria-label="Pravni dokumenti">
          <Link
            to="/privatnost"
            className={`pravna-strana__tab ${aktivna === 'privatnost' ? 'aktivna' : ''}`}
            aria-current={aktivna === 'privatnost' ? 'page' : undefined}
          >
            <ShieldCheck size={16} aria-hidden="true" />
            Politika privatnosti
          </Link>
          <Link
            to="/uslovi"
            className={`pravna-strana__tab ${aktivna === 'uslovi' ? 'aktivna' : ''}`}
            aria-current={aktivna === 'uslovi' ? 'page' : undefined}
          >
            <FileText size={16} aria-hidden="true" />
            Uslovi korišćenja
          </Link>
        </div>
      </div>

      <header className="kartica pravna-strana__hero">
        <div className="pravna-strana__meta">
          <span className="bedz">
            {aktivna === 'privatnost' ? 'Zaštita podataka' : 'Pravila platforme'}
          </span>
          <span className="pravna-strana__datum">Poslednja izmena: {DATUM_IZMENE}</span>
        </div>
        <h1>{naslov}</h1>
        <p className="pravna-strana__podnaslov">{podnaslov}</p>

        <div className="pravna-strana__sazetak">
          {sazetak.map((stavka) => (
            <div key={stavka.naslov} className="pravna-strana__sazetak-stavka">
              <CheckCircle2 size={18} aria-hidden="true" />
              <div>
                <strong>{stavka.naslov}</strong>
                <span>{stavka.opis}</span>
              </div>
            </div>
          ))}
        </div>
      </header>

      <div className="pravna-strana__mreza">
        <aside className="kartica pravna-strana__nav" aria-label="Sadržaj dokumenta">
          <p className="pravna-strana__nav-naslov">Sadržaj</p>
          <ol>
            {sadrzaj.map((st, idx) => (
              <li key={st.id}>
                <button type="button" onClick={() => skociNaSekciju(st.id)}>
                  <span className="pravna-strana__nav-broj">{idx + 1}.</span>
                  <span>{st.naslov}</span>
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <article className="kartica pravna-strana__clanak">
          {children}

          <footer className="pravna-strana__dno">
            <Link to={nazadPutanja} className="dugme dugme--senka dugme--malo">
              <ArrowLeft size={16} aria-hidden="true" />
              {nazadTekst}
            </Link>
            <Link
              to={aktivna === 'privatnost' ? '/uslovi' : '/privatnost'}
              className="dugme dugme--tekst dugme--malo"
            >
              {aktivna === 'privatnost' ? 'Pročitaj i Uslove korišćenja →' : 'Pročitaj i Politiku privatnosti →'}
            </Link>
          </footer>
        </article>
      </div>
    </div>
  )
}

const SADRZAJ_PRIVATNOST: StavkaSadrzaja[] = [
  { id: 'p-rukovalac', naslov: 'Ko obrađuje podatke' },
  { id: 'p-podaci', naslov: 'Koje podatke čuvamo' },
  { id: 'p-svrha', naslov: 'Svrha i pravni osnov obrade' },
  { id: 'p-obradjivaci', naslov: 'Gde se podaci čuvaju i ko ih obrađuje' },
  { id: 'p-cuvanje', naslov: 'Koliko dugo čuvamo podatke' },
  { id: 'p-prava', naslov: 'Tvoja prava' },
  { id: 'p-kontakt', naslov: 'Kontakt' },
]

const SAZETAK_PRIVATNOST: SazetakStavka[] = [
  { naslov: 'Bez reklama i praćenja', opis: 'Nema analitike, oglasa ni kolačića trećih strana.' },
  { naslov: 'Dete nema nalog', opis: 'Bez email adrese i lozinke za dete — ulaz je tajnim linkom.' },
  { naslov: 'Podaci u Evropi', opis: 'Baza je u Londonu (eu-west-2), pod kontrolom roditelja.' },
  { naslov: 'Potpuna kontrola', opis: 'Profil deteta ili ceo nalog brišeš sam/a u podešavanjima.' },
]

export function Privatnost() {
  return (
    <Okvir
      aktivna="privatnost"
      naslov="Politika privatnosti"
      podnaslov="Jasno i otvoreno objašnjavamo koje podatke Mozgalica čuva, zašto su potrebni i kako možeš da ih obrišeš u svakom trenutku."
      sadrzaj={SADRZAJ_PRIVATNOST}
      sazetak={SAZETAK_PRIVATNOST}
    >
      <section id="p-rukovalac">
        <h2><span className="pravna-strana__broj">1</span> Ko obrađuje podatke</h2>
        <p>
          Rukovalac podacima o ličnosti je <strong>{RUKOVALAC}</strong>. Za sva pitanja o privatnosti,
          pristupu podacima ili brisanju možeš pisati na{' '}
          <a href={`mailto:${KONTAKT_EMAIL}`}>{KONTAKT_EMAIL}</a>.
        </p>
      </section>

      <section id="p-podaci">
        <h2><span className="pravna-strana__broj">2</span> Koje podatke čuvamo</h2>
        <p><strong>Roditelj (administrator):</strong></p>
        <ul>
          <li>email adresa za prijavu, pozivnicu, reset lozinke i podešavanja obaveštenja;</li>
          <li>datum prihvatanja uslova korišćenja;</li>
          <li>pretplate na push obaveštenja za svaki uređaj (adresa pretplate i ključevi za šifrovanje poruka).</li>
        </ul>

        <p><strong>Dete (profil):</strong></p>
        <ul>
          <li>ime, izabrani avatar i, ako ga roditelj unese, datum rođenja;</li>
          <li>opciona email adresa deteta, ako je ranije uneta (trenutno se ne koristi: obaveštenja detetu stižu kao push i u aplikaciji);</li>
          <li>odgovori na kvizove, rezultati, zvezdice, nagrade iz prodavnice i istorija kupovina;</li>
          <li>šahovske partije, dnevni rasporedi vežbe i raspored časova koji roditelj unese;</li>
          <li>obaveštenja u aplikaciji i pretplate na push obaveštenja uređaja (uključujući identifikator za Android obaveštenja).</li>
        </ul>

        <div className="pravna-strana__poziv">
          <Lock size={18} aria-hidden="true" />
          <p>
            <strong>Dete nema svoj nalog i ne unosi lozinku.</strong> Profilu pristupa isključivo preko
            ličnog linka ili QR koda koji roditelj podeli.
          </p>
        </div>
      </section>

      <section id="p-svrha">
        <h2><span className="pravna-strana__broj">3</span> Svrha i pravni osnov obrade</h2>
        <p>
          Podaci se obrađuju isključivo da bi aplikacija radila: da dodeljuje kvizove i šahovske partije,
          ocenjuje odgovore na serveru, prikazuje napredak, šalje obaveštenja i priprema nedeljni
          izveštaj za roditelja.
        </p>
        <p>
          Pravni osnov obrade je pružanje usluge na zahtev roditelja (izvršenje ugovornog odnosa po
          prihvatanju uslova) i pristanak roditelja kao zakonskog zastupnika za unos podataka o detetu.
        </p>
        <p>
          Ne koristimo reklame, analitiku ni kolačiće za praćenje. U pregledaču i na uređaju čuvaju se
          samo tehnički podaci neophodni za rad: sesija prijave, izabrana tema, status kartice „Prvi koraci“
          i privremeni lokalni odgovori na kviz dok nema internet veze (kako se napredak ne bi izgubio).
        </p>
      </section>

      <section id="p-obradjivaci">
        <h2><span className="pravna-strana__broj">4</span> Gde se podaci čuvaju i ko ih obrađuje</h2>
        <p>Podaci se ne prodaju i ne šalju drugim licima osim sledećim tehničkim obrađivačima:</p>
        <div className="tabela-omot">
          <table className="tabela pravna-strana__tabela">
            <thead>
              <tr>
                <th>Servis</th>
                <th>Uloga</th>
                <th>Lokacija / napomena</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Supabase</strong></td>
                <td>Baza podataka, autentifikacija i Edge funkcije</td>
                <td>Region London (<code>eu-west-2</code>)</td>
              </tr>
              <tr>
                <td><strong>Brevo</strong></td>
                <td>Slanje mejlova roditelju (pozivnice, reset lozinke i nedeljni izveštaj)</td>
                <td>EU email infrastruktura</td>
              </tr>
              <tr>
                <td><strong>Google Firebase Cloud Messaging</strong></td>
                <td>Isporuka push obaveštenja na Android uređaje</td>
                <td>Samo token uređaja i tekst obaveštenja</td>
              </tr>
              <tr>
                <td><strong>Servisi pregledača i OS-a</strong></td>
                <td>Isporuka Web Push obaveštenja</td>
                <td>Apple / Google / Mozilla push kanali</td>
              </tr>
              <tr>
                <td><strong>GitHub Pages</strong></td>
                <td>Hosting statičkih fajlova sajta i aplikacije</td>
                <td>Bez podataka o deci i roditeljima</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="p-cuvanje">
        <h2><span className="pravna-strana__broj">5</span> Koliko dugo čuvamo podatke</h2>
        <p>
          Podaci se čuvaju dok postoji nalog roditelja ili profil deteta. Profil deteta roditelj može
          obrisati u podešavanjima, a ceo nalog u odeljku „Obriši nalog“.
        </p>
        <p>
          Brisanjem se trajno uklanjaju i svi podaci vezani za nalog, uključujući obaveštenja i
          pretplate na uređajima. Dnevnik pozadinskih poslova na serveru automatski se čuva najduže 7 dana.
        </p>
      </section>

      <section id="p-prava">
        <h2><span className="pravna-strana__broj">6</span> Tvoja prava</h2>
        <p>
          Po Zakonu o zaštiti podataka o ličnosti Republike Srbije imaš pravo da zatražiš pristup svojim
          podacima, ispravku, brisanje, ograničenje obrade, prenosivost i da podneseš prigovor.
        </p>
        <p>
          Takođe imaš pravo na pritužbu{' '}
          <a href={POVERENIK_URL} target="_blank" rel="noreferrer">
            Povereniku za informacije od javnog značaja i zaštitu podataka o ličnosti
          </a>.
        </p>
      </section>

      <section id="p-kontakt">
        <h2><span className="pravna-strana__broj">7</span> Kontakt</h2>
        <p>
          Za sva pitanja o zaštiti podataka piši na:{' '}
          <a href={`mailto:${KONTAKT_EMAIL}`}>{KONTAKT_EMAIL}</a>
        </p>
      </section>
    </Okvir>
  )
}

const SADRZAJ_USLOVI: StavkaSadrzaja[] = [
  { id: 'u-poziv', naslov: 'Pristup na poziv' },
  { id: 'u-odgovornost', naslov: 'Odgovornost roditelja' },
  { id: 'u-banka', naslov: 'Zajednička banka pitanja' },
  { id: 'u-obavestenja', naslov: 'Obaveštenja' },
  { id: 'u-brisanje', naslov: 'Brisanje naloga' },
  { id: 'u-dostupnost', naslov: 'Dostupnost usluge i otvoreni kod' },
  { id: 'u-izmene', naslov: 'Izmene uslova' },
  { id: 'u-pravo', naslov: 'Merodavno pravo' },
  { id: 'u-kontakt', naslov: 'Kontakt' },
]

const SAZETAK_USLOVI: SazetakStavka[] = [
  { naslov: 'Pristup na poziv', opis: 'Nalog otvara vlasnik platforme za pozvane roditelje.' },
  { naslov: 'Roditelj upravlja profilom', opis: 'Vi birate podatke deteta i kome delite link ili QR kod.' },
  { naslov: 'Sopstveni i zajednički zadaci', opis: 'Možete koristiti zajedničku banku ili praviti svoje kvizove.' },
  { naslov: 'Trajno brisanje u 1 korak', opis: 'Nalog se briše iz podešavanja uz potvrdu email adrese.' },
]

export function Uslovi() {
  return (
    <Okvir
      aktivna="uslovi"
      naslov="Uslovi korišćenja"
      podnaslov="Jednostavna i fer pravila korišćenja platforme Mozgalica za roditelje i decu."
      sadrzaj={SADRZAJ_USLOVI}
      sazetak={SAZETAK_USLOVI}
    >
      <section id="u-poziv">
        <h2><span className="pravna-strana__broj">1</span> Pristup na poziv</h2>
        <p>
          Mozgalica je dostupna isključivo po pozivu. Nalog kreira vlasnik platforme, a prijava je
          moguća samo sa email adrese koja je pozvana. Nalog nije moguće otvoriti samostalno.
        </p>
      </section>

      <section id="u-odgovornost">
        <h2><span className="pravna-strana__broj">2</span> Odgovornost roditelja</h2>
        <p>
          Roditelj odgovara za profile dece koje kreira, za tačnost podataka koje unosi i za to kome
          deli lični profilni link ili QR kod deteta.
        </p>
        <div className="pravna-strana__poziv">
          <ShieldCheck size={18} aria-hidden="true" />
          <p>
            Ako posumnjaš da je link ili QR kod deteta dospeo u tuđe ruke, odmah obriši ili zameni
            pristup u podešavanjima profila deteta ili kontaktiraj podršku.
          </p>
        </div>
      </section>

      <section id="u-banka">
        <h2><span className="pravna-strana__broj">3</span> Zajednička banka pitanja</h2>
        <p>
          Pitanja koja vlasnik platforme označi kao zajednička mogu da koriste svi roditelji u svojim
          kvizovima. Pitanja se koriste kakva jesu, bez garancije da su bez greške. Roditelj ne može da
          ih menja, ali uvek može da napravi sopstveni kviz ili sopstveno pitanje.
        </p>
      </section>

      <section id="u-obavestenja">
        <h2><span className="pravna-strana__broj">4</span> Obaveštenja</h2>
        <p>
          Obaveštenja stižu kao push poruke na uređaje koje roditelj uključi, kao i unutar same aplikacije.
          Push obaveštenja možeš isključiti u svakom trenutku u podešavanjima uređaja ili aplikacije.
        </p>
      </section>

      <section id="u-brisanje">
        <h2><span className="pravna-strana__broj">5</span> Brisanje naloga</h2>
        <p>
          Nalog možeš da obrišeš u podešavanjima, uz potvrdu svoje email adrese. Brisanje je trajno i
          podaci se ne mogu vratiti. Vlasnik platforme ne može da obriše svoj nalog dok su njegova
          pitanja deo zajedničke banke.
        </p>
      </section>

      <section id="u-dostupnost">
        <h2><span className="pravna-strana__broj">6</span> Dostupnost usluge i otvoreni kod</h2>
        <p>
          Usluga na domenu <code>mozgalica.rs</code> pruža se kakva jeste, bez garancije neprekidnog rada.
          U slučaju gašenja ili većih promena usluge, roditelji će biti obavešteni na email adresu sa naloga.
        </p>
        <p>
          Izvorni kod projekta je javno dostupan na GitHub-u pod licencom navedenom u repozitorijumu, što
          ne daje pravo neovlašćenog pristupa podacima drugih korisnika na hostovanoj platformi.
        </p>
      </section>

      <section id="u-izmene">
        <h2><span className="pravna-strana__broj">7</span> Izmene uslova</h2>
        <p>
          Izmene uslova objavljuju se na ovoj stranici uz jasno istaknut datum poslednje izmene.
        </p>
      </section>

      <section id="u-pravo">
        <h2><span className="pravna-strana__broj">8</span> Merodavno pravo</h2>
        <p>
          Na ove uslove korišćenja primenjuje se pravo Republike Srbije.
        </p>
      </section>

      <section id="u-kontakt">
        <h2><span className="pravna-strana__broj">9</span> Kontakt</h2>
        <p>
          Za sva pitanja i predloge piši na:{' '}
          <a href={`mailto:${KONTAKT_EMAIL}`}>{KONTAKT_EMAIL}</a>
        </p>
      </section>
    </Okvir>
  )
}
