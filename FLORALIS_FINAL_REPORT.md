# Floralis — raport final local

6 octombrie 2026. Ecommerce independent în proiectul local, cu runtime PHP pentru Apache, SQLite și suport PDO MySQL. Node este folosit numai pentru media, build și unelte de dezvoltare.

## Implementat

- Storefront responsive după referința Floralis: logo real, hero editorial, cinci colecții, decor, produse, ocazii, poveste, galerie, recenzii și newsletter; fotografii/video reale, fonturi locale și navigație mobilă.
- Catalog, căutare/filtre/sortare/paginare, categorii ierarhice, produs/galerie, favorite/coș persistent, checkout și confirmare. Conturi, login/logout/resetare single-use, profil, adrese, istoric și recenzii moderate.
- Admin cu **CSS-ul efectiv SmileBaby copiat local**, conform cererii: sidebar/topbar, dashboard/perioade/grafic, produse cu editoare complete/duplicare/arhivare/ștergere, categorii/vizibilitate, comenzi/detalii/status/istoric/print/export, clienți/conturi, stoc/istoric, cupoane, media/upload/alt, CMS/articole/SEO, newsletter/mesaje/recenzii, setări/livrare/plăți și SMTP/outbox.
- Modificările admin folosesc aceeași DB ca storefront-ul. Fără backend, API, DB, autentificare sau chei SmileBaby în runtime. Fără personalizarea produselor.
- Stripe test propriu: sincronizare catalog/prețuri/transport, Checkout cu snapshot server, cupon, rezervare stoc, webhook semnat/deduplicat, reconciliere, anulare și rambursare verificată.
- Google OAuth propriu implementat; fișierul și flagul sunt private. Sesiuni HttpOnly/SameSite, CSRF, roluri, SQL parametrizat, rate limits, upload re-encodat și protecția surselor.
- Meta/canonical/OpenGraph/JSON-LD, sitemap, robots, pagini pentru crawlere și conținut HTML public înainte de încărcarea React.

## Import

| Element | Rezultat |
|---|---:|
| Produse | 83 |
| Categorii ierarhice | 12 |
| Fotografii de produs mapate | 91 |
| Înregistrări media | 117 |
| Imagini lipsă | 0 |
| Produse fără cantitate numerică în sursă | 83 |

Catalogul provine din JSON-ul furnizat, textele din `floralis-texte-site.txt`, media editorială din `floralis-media-export`, fotografiile produselor din directorul local organizat. Source IDs/prețurile sunt păstrate; importul este idempotent. Originalele rămân intacte. Raport: `data/import-report.json`.

## Verificat

| Verificare | Rezultat |
|---|---|
| Build Vite | Reușit, bundle compilat în `dist` |
| Integrare SQLite | 13/13 teste trecute |
| Integrare MariaDB/PDO MySQL | Aceleași 13/13 teste trecute |
| Apache 2.4.69 + PHP 8.4.25 + MariaDB 11.4.9 | API, login admin, rewrite, assets, SEO și video verificate |
| Fișiere private prin Apache | `.env`, date, surse și credentiale: 403/404 |
| Stripe catalog | 83 produse + 2 metode transport, 85 sincronizări, fără erori în coadă la verificare |
| Stripe checkout real sandbox | 300 − 30 + 25 = **295 RON**; total verificat |
| Plată și rambursare | Confirmate în Stripe test; comanda QA anulată |
| Audit independență/credentiale | Trecut |
| npm audit | 0 vulnerabilități la verificare |
| QA responsive | 320/390/820/1440 px, fără overflow al paginii sau imagini eșuate pe rutele testate |

Testele acoperă import, sesiuni/CSRF/roluri, conturi/coș/favorite/adrese, CRUD produse/categorii, checkout/cupoane/transport/stoc/idempotency, comenzi/anulare/istoric, CMS/SEO, review/newsletter/contact, CSV/upload și validarea evenimentelor Stripe pentru sumă, monedă și replay.

Două runde de polish: tipografie/spațiere/hero, apoi CSS-ul admin cerut, editoare complete, responsive, fotografii colecții și texte alt. Capturi în `qa/screenshots`: `admin-desktop-final.jpg`, `admin-stripe-final.jpg`, `home-mobile-final.jpg` și dovezile Stripe. Rapoarte: `qa/responsive-checks.json`, `qa/apache-mysql-report.json`, `qa/stripe-test-report.json`, `qa/independence-audit.json`.

## Configurații rămase pentru datele reale

- Google: înregistrarea callback-ului local, apoi activarea flagului; fluxul Google real este încă neverificat.
- SMTP: credentialele expeditorului și cron pentru outbox; emailuri reale nu au fost trimise.
- Livrare: tariful și zonele reale. Metoda rămâne dezactivată până la configurare; ridicarea gratuită este activă.
- Stocuri: cantitățile lipsesc din export; se completează dacă se activează gestiunea.
- Texte legale: completarea paginilor fără text integral în export. Articolele placeholder rămân draft.
- Hosting: verificarea hostului/versiunii DB publice și configurarea `.env`. Ecommerce-ul nu a fost publicat în această implementare. Raportul FTP preexistent pentru `under-construction` este separat de această livrare.
- Stripe este limitat la test, conform cheilor primite.

## Livrare

Magazin: http://localhost:5173/ — Admin: http://localhost:5173/admin. Emailul și parola admin cerute sunt configurate; parola nu este în documentele urmărite de Git.

Instrucțiuni în `README_LOCAL.md`. Bundle compilat în Git, commit-uri separate pe etape și arhivă Apache în `delivery`, fără parole/chei, DB de utilizator sau exporturi brute. Configurațiile private rămân locale și ignorate de Git.

Directorul temporar QA rămas este ignorat de Git și exclus din pachet; ștergerea a fost blocată de revizuirea automată, fără un motiv detaliat. Procesele Apache/MariaDB temporare au fost oprite.
