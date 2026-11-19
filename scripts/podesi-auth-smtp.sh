#!/usr/bin/env bash
# Uključuje Brevo SMTP za Supabase Auth (pozivnice, magic link, nova lozinka) i
# postavlja srpski šablon za mejl „nova lozinka“. Tajne se unose pri pokretanju i
# ne upisuju se nigde na disk.
#
# Potrebno:
#   SUPABASE_ACCESS_TOKEN  lični token sa https://supabase.com/dashboard/account/tokens
#                          (ako nije postavljen, skripta ga traži)
#   Brevo SMTP login i SMTP ključ: Brevo → SMTP & API → SMTP (ključ počinje sa xsmtpsib-,
#                          to NIJE isti ključ kao API ključ za Edge funkcije)
#   Adresa pošiljaoca potvrđena u Brevo-u (ista kao BREVO_SENDER_EMAIL)
set -euo pipefail

koren="$(cd "$(dirname "$0")/.." && pwd)"
ref="$(cat "$koren/supabase/.temp/project-ref")"
api="https://api.supabase.com/v1/projects/$ref/config/auth"

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  read -rsp "Supabase access token: " SUPABASE_ACCESS_TOKEN; echo
fi
read -rp "Brevo SMTP login (npr. 1234ab001@smtp-brevo.com): " smtp_login
read -rsp "Brevo SMTP ključ: " smtp_kljuc; echo
read -rp "Adresa pošiljaoca: " posiljalac
read -rp "Ime pošiljaoca [Mozgalica]: " ime; ime="${ime:-Mozgalica}"

echo "Trenutno stanje:"
curl -fsS "$api" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" | python3 -c '
import json, sys
d = json.load(sys.stdin)
for k in ("site_url", "uri_allow_list", "smtp_host", "smtp_admin_email", "rate_limit_email_sent", "password_min_length"):
    print(f"  {k} = {d.get(k)!r}")'

telo="$(SMTP_LOGIN="$smtp_login" SMTP_KLJUC="$smtp_kljuc" POSILJALAC="$posiljalac" IME="$ime" python3 -c '
import json, os
osnova = "{{ if .RedirectTo }}{{ .RedirectTo }}{{ else }}{{ .SiteURL }}{{ end }}"
print(json.dumps({
    "smtp_host": "smtp-relay.brevo.com",
    "smtp_port": "587",
    "smtp_user": os.environ["SMTP_LOGIN"].strip(),
    "smtp_pass": os.environ["SMTP_KLJUC"].strip(),
    "smtp_admin_email": os.environ["POSILJALAC"].strip(),
    "smtp_sender_name": os.environ["IME"].strip(),
    "smtp_max_frequency": 60,
    "rate_limit_email_sent": 30,
    "password_min_length": 8,
    "mailer_subjects_invite": "Pozivnica za Mozgalicu",
    "mailer_templates_invite_content": (
        "<h2>Pozvan/a si u Mozgalicu</h2>"
        "<p>Pozvan/a si da otvoriš roditeljski nalog u Mozgalici, aplikaciji za dečje vežbanje i šah.</p>"
        f"<p><a href=\"{osnova}?token_hash={{{{ .TokenHash }}}}&type=invite\">Prihvati pozivnicu</a></p>"
        "<p>Posle klika potvrđuješ ulazak i biraš lozinku za sledeće prijave. Link može da se iskoristi samo jednom.</p>"
    ),
    "mailer_subjects_recovery": "Mozgalica — nova lozinka",
    "mailer_templates_recovery_content": (
        "<h2>Nova lozinka za Mozgalicu</h2>"
        "<p>Zatražena je nova lozinka za tvoj roditeljski nalog.</p>"
        f"<p><a href=\"{osnova}?token_hash={{{{ .TokenHash }}}}&type=recovery\">Izaberi novu lozinku</a></p>"
        "<p>Ako nisi ti tražio/la novu lozinku, slobodno zanemari ovaj mejl.</p>"
    ),
    "mailer_subjects_magic_link": "Mozgalica — link za prijavu",
    "mailer_templates_magic_link_content": (
        "<h2>Prijava u Mozgalicu</h2>"
        "<p>Klikni na link ispod da se prijaviš u roditeljski deo Mozgalice. Link važi kratko i može da se iskoristi samo jednom.</p>"
        f"<p><a href=\"{osnova}?token_hash={{{{ .TokenHash }}}}&type=email\">Prijavi se</a></p>"
        "<p>Ako nisi ti tražio/la prijavu, slobodno zanemari ovaj mejl.</p>"
    ),
}))')"

read -rp "Primeniti izmene? [d/N] " potvrda
[ "$potvrda" = "d" ] || { echo "Prekinuto."; exit 1; }

curl -fsS -X PATCH "$api" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" --data-binary @- <<<"$telo" >/dev/null
echo "Gotovo: Supabase Auth šalje mejlove preko Brevo SMTP-a."
