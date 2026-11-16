// Javne pravne stranice: politika privatnosti i uslovi korišćenja. Dostupne bez prijave.
// Sadržaj se oslanja na to šta aplikacija stvarno radi (šema baze, Edge funkcije, obaveštenja).
import { Link } from 'react-router-dom'
import { DATUM_IZMENE, KONTAKT_EMAIL, RUKOVALAC } from '../lib/pravno'
import { useAuth } from '../lib/auth'

function Okvir({ naslov, children }: { naslov: string; children: React.ReactNode }) {
  const { session } = useAuth()
  return (
    <div className="sadrzaj sadrzaj--usko pravna-strana">
      <div className="kartica">
        <h1>{naslov}</h1>
        <p className="malo blago razmak-dole">Poslednja izmena: {DATUM_IZMENE}</p>
        {children}
        <p className="razmak-gore">{session
          ? <Link to="/admin/podesavanja">Nazad na podešavanja</Link>
          : <Link to="/prijava">Nazad na prijavu</Link>}</p>
      </div>
    </div>
  )
}

export function Privatnost() {
  return (
    <Okvir naslov="Politika privatnosti">
      <h2>1. Ko obrađuje podatke</h2>
      <p>
        Rukovalac podacima je {RUKOVALAC}. Za sva pitanja o podacima piši na{' '}
        <a href={`mailto:${KONTAKT_EMAIL}`}>{KONTAKT_EMAIL}</a>.
      </p>

      <h2>2. Koje podatke čuvamo</h2>
      <p><strong>Roditelj (administrator):</strong></p>
      <ul>
        <li>email adresa za prijavu i podešavanja obaveštenja;</li>
        <li>datum prihvatanja uslova korišćenja;</li>
        <li>pretplate na push obaveštenja za svaki uređaj (adresa pretplate i ključevi za šifrovanje poruka).</li>
      </ul>
      <p><strong>Dete (profil):</strong></p>
      <ul>
        <li>ime, izabrani avatar i, ako ga roditelj unese, datum rođenja;</li>
        <li>opciona email adresa deteta (koristi se za mejl o šahovskoj partiji, ako ga roditelj uključi);</li>
        <li>odgovori na kvizove, rezultati, zvezdice, nagrade iz prodavnice i istorija kupovina;</li>
        <li>šahovske partije, dnevni rasporedi vežbe i raspored časova koji roditelj unese;</li>
        <li>obaveštenja u aplikaciji i pretplate na push obaveštenja uređaja (uključujući identifikator za Android obaveštenja).</li>
      </ul>
      <p>Dete nema svoj nalog i ne unosi lozinku. Pristupa profilu preko linka ili QR koda koji roditelj podeli.</p>

      <h2>3. Svrha obrade</h2>
      <p>
        Podaci se koriste samo da bi aplikacija radila: da dodeljuje kvizove i partije, ocenjuje odgovore, prikazuje
        napredak, šalje obaveštenja i pravi nedeljni izveštaj za roditelja. Odgovori se ocenjuju na serveru.
      </p>
      <p>
        Ne koristimo reklame, analitiku ni kolačiće za praćenje. U pregledaču se čuvaju samo tehnička podešavanja:
        prijava, izabrana tema i to da li je kartica „Prvi koraci“ sakrivena.
      </p>

      <h2>4. Gde se podaci čuvaju i ko ih obrađuje</h2>
      <ul>
        <li><strong>Supabase</strong> — baza podataka, prijava i Edge funkcije. Region: London (eu-west-2).</li>
        <li><strong>Brevo</strong> — slanje mejlova obaveštenja aplikacije.</li>
        <li><strong>Google Firebase Cloud Messaging</strong> — push obaveštenja na Android uređajima.</li>
        <li><strong>Servisi pregledača i operativnog sistema</strong> — isporuka Web Push obaveštenja na uređaj.</li>
        <li><strong>GitHub Pages</strong> — hosting statičkih fajlova aplikacije (bez podataka o deci).</li>
      </ul>
      <p>Podaci se ne šalju drugim licima osim navedenim obrađivačima.</p>

      <h2>5. Koliko dugo čuvamo podatke</h2>
      <p>
        Podaci se čuvaju dok postoji nalog ili profil deteta. Profil deteta roditelj može obrisati u
        podešavanjima, a ceo nalog u odeljku „Obriši nalog“. Brisanjem se uklanjaju i podaci koji su
        vezani za nalog, uključujući obaveštenja i pretplate na uređajima. Dnevnik pozadinskih poslova na
        serveru čuva se 7 dana.
      </p>

      <h2>6. Tvoja prava</h2>
      <p>
        Po Zakonu o zaštiti podataka o ličnosti imaš pravo da zatražiš pristup svojim podacima, ispravku,
        brisanje, ograničenje obrade, prenosivost i da podneseš prigovor. Pravo na pritužbu imaš kod
        Poverenika za informacije od javnog značaja i zaštitu podataka o ličnosti.
      </p>

      <h2>7. Kontakt</h2>
      <p>
        <a href={`mailto:${KONTAKT_EMAIL}`}>{KONTAKT_EMAIL}</a>
      </p>
    </Okvir>
  )
}

export function Uslovi() {
  return (
    <Okvir naslov="Uslovi korišćenja">
      <h2>1. Pristup na poziv</h2>
      <p>
        Mozgalica je dostupna samo po pozivu. Nalog pravi vlasnik platforme, a prijava je moguća samo sa
        adrese koja je pozvana. Nalog ne možeš sam da otvoriš.
      </p>

      <h2>2. Odgovornost roditelja</h2>
      <p>
        Roditelj odgovara za profile dece koje unese, za tačnost podataka koje unosi i za to kome deli
        profilni link ili QR kod.
      </p>

      <h2>3. Zajednička banka pitanja</h2>
      <p>
        Pitanja koja vlasnik platforme označi kao zajednička mogu da koriste svi roditelji u svojim kvizovima.
        Pitanja se koriste kakva jesu, bez garancije da su potpuno tačna. Roditelj ne može da ih menja, ali može
        da napravi sopstveni kviz ili sopstveno pitanje.
      </p>

      <h2>4. Obaveštenja</h2>
      <p>
        Obaveštenja stižu kao push na uređaje koje roditelj uključi i u samoj aplikaciji. Push
        obaveštenje roditelj može da isključi u podešavanjima uređaja ili u aplikaciji.
      </p>

      <h2>5. Brisanje naloga</h2>
      <p>
        Nalog može da se obriše u podešavanjima, uz potvrdu email adrese. Brisanje je trajno i podaci se
        ne mogu vratiti. Vlasnik platforme ne može da obriše nalog dok su njegova pitanja deo zajedničke banke.
      </p>

      <h2>6. Dostupnost usluge</h2>
      <p>
        Usluga se pruža bez garancije da će uvek raditi bez prekida. Usluga može da se prekine, a o tome
        se roditelji obaveštavaju na adresu koju su naveli.
      </p>

      <h2>7. Izmene uslova</h2>
      <p>Izmene se objavljuju na ovoj stranici uz datum poslednje izmene.</p>

      <h2>8. Merodavno pravo</h2>
      <p>Na ove uslove primenjuje se pravo Republike Srbije.</p>

      <h2>9. Kontakt</h2>
      <p>
        <a href={`mailto:${KONTAKT_EMAIL}`}>{KONTAKT_EMAIL}</a>
      </p>
    </Okvir>
  )
}
