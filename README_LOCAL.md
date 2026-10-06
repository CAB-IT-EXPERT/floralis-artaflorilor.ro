# Floralis — rulare locală și Apache

Ecommerce independent: PHP 8.2+ / PDO, React compilat, SQLite local sau MySQL. `dist` conține interfața compilată; **Node nu este necesar pentru rularea pe Apache**.

## Mediul local pregătit

- Magazin: http://localhost:5173/
- Admin: http://localhost:5173/admin
- Email: `admin@floralis-artaflorilor.ro`; parola cerută este configurată și păstrată privat în `data/local-admin.txt`, hash-uită în DB.
- DB proprie: `data/floralis_local.sqlite`. `.env` este deja configurat în acest workspace și ignorat de Git.

Pornire fără Node, din PowerShell în directorul proiectului:

```powershell
.\tools\start-local.ps1 -Action Serve
```

Alternativ: `npm start`, care lansează PHP, nu un backend Node. Portul 5173 este folosit de PHP.

## Instalare nouă

1. Copiază `.env.example` în `.env`; completează `APP_URL`, email/parolă admin și setările DB.
2. Activează PDO SQLite sau PDO MySQL, mbstring, GD, cURL și OpenSSL. Exemplu: `tools/php.ini.example`.
3. Rulează `php tools/seed.php`. Pe Windows fără php.ini configurat: `.\tools\start-local.ps1 -Action Seed`.

Seed-ul aplică migrations și importă datele, păstrând editările admin și parola existentă la rerulare. Pentru aplicarea deliberată a credentialelor admin din `.env`: `php tools/admin.php` sau `-Action Admin`; aceasta dezactivează ceilalți administratori locali și le revocă sesiunile.

Pentru un clone cu toolchain Node: `npm ci`, `npm run setup`, `npm run build`, `npm run db:seed`. Setup generează o parolă aleatorie numai când `.env` lipsește.

## Apache

DocumentRoot este rădăcina aplicației, cu `index.php` și `.htaccess`. Activează PHP, `mod_rewrite`, `mod_alias`, autorizarea Apache 2.4 și `AllowOverride All`. Exemplu: `tools/apache-vhost.conf.example`. În cPanel handlerul PHP este de obicei deja configurat.

Runtime-ul nu cere Vite, npm, proxy Node sau Composer. Sunt necesare `dist`, `public/assets`, `app`, `migrations`, datele de seed, `index.php`, `.htaccess`, configurația privată și DB inițializată. Utilizatorul PHP trebuie să poată scrie în `data` și `public/uploads`; nu folosi permisiuni 777.

Verificat local cu Apache 2.4.69, PHP 8.4.25 CGI și MariaDB 11.4.9: autentificare, API, rewrite, assets, SEO, video cu range și protecția surselor. Raport: `qa/apache-mysql-report.json`.

## MySQL pentru hosting

MySQL 8.0.16+ sau MariaDB 10.6+, InnoDB și utf8mb4. Folosește o bază Floralis dedicată și goală:

```dotenv
DB_DRIVER=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
APP_URL=https://floralis-artaflorilor.ro
```

Rulează `php tools/seed.php` cu acel `.env`. Migrations sunt în `migrations/mysql`; fișierul SQLite nu este un dump MySQL. Datele de hosting primite sunt în `data/production.env`, privat; hostul `localhost` este o presupunere de verificat în cPanel. DB publică nu a fost testată și ecommerce-ul nu a fost încărcat prin FTP în această implementare.

## Stripe test

Cheile Floralis sunt numai în `.env`; integrarea acceptă în prezent chei **test**. Admin → Plăți arată starea și permite resincronizarea catalogului. Salvarea produselor/tarifelor declanșează sincronizarea, iar erorile rămân în coadă. Editarea unui preț creează un Price nou și dezactivează vechiul preț. Arhivarea/ștergerea retrage produsul Stripe; produsele folosite în comenzi nu pot fi șterse definitiv.

```powershell
npm run stripe:listen
npm run stripe:sync
```

Listener-ul trimite evenimente la `/api/payments/stripe/webhook` și salvează privat signing secret-ul. Pentru teste locale, acesta trebuie să ruleze. Confirmarea verifică și sesiunea prin API Stripe. La schimbarea domeniului configurează webhook-ul și secretul propriu în Stripe.

Test sandbox efectuat: produs 300 RON − cupon 30 RON + transport 25 RON = 295 RON; card test confirmat pe server, apoi rambursat. Comenzile QA sunt izolate de magazinul local. Raport: `qa/stripe-test-report.json`.

## Google și email

Credentialele proprii sunt în `data/google-client.json`. Adaugă exact `http://localhost:5173/api/auth/google/callback` în clientul OAuth Google, apoi setează `GOOGLE_LOCAL_CALLBACK_ENABLED=1`. Fișierul primit are callback public; loginul Google real rămâne neverificat local până la înregistrarea URI-ului. Google este pentru clienți; adminul are autentificare proprie.

Admin → Email configurează SMTP/TLS și expeditorul. Fără SMTP, comenzile și resetările generează mesaje în outbox local. După configurare rulează `php tools/send-outbox.php`; pe hosting programează comanda prin cron. Testul SMTP trimite doar către adresa completată explicit. Nu există credentiale SMTP SmileBaby.

## Date comerciale și CMS

Adminul și storefront-ul folosesc aceeași DB. Checkout-ul calculează prețurile, transportul și cuponul în bani pe server; comanda păstrează snapshot-ul prețurilor. Anularea restabilește stocul o singură dată. Rambursările cardului se verifică în Stripe.

Exportul celor 83 produse nu are cantități numerice: `stock=null`, deci stoc nelimitat. În editorul produsului, stoc gol sau `0` înseamnă nelimitat, iar o valoare pozitivă activează automat gestiunea cantitativă. Livrarea locală este dezactivată până la completarea tarifului/zonelor reale; ridicarea gratuită este activă. Completează în CMS paginile legale fără text integral în sursă. Articolele Lorem Ipsum rămân draft.

## Dezvoltare, verificare și pachet

```powershell
npm run build
npm test
npm run audit:independence
npm audit
```

Recompilează după schimbarea fișierelor `src`. `npm run prepare:data` pregătește fotografiile și textele din exporturile originale; exporturile nu sunt necesare la runtime. `npm run db:seed` păstrează editările.

Testele folosesc DB, cookie, rate limits și config email izolate. QA Apache/MySQL opțional: `node scripts/runtime-qa.mjs`, cu binarele locale menționate în script în `tools/qa-runtime`, ignorate de Git.

`node scripts/package-apache.mjs` creează în `delivery` arhiva Apache fără credentiale. DB existentă, upload-urile utilizatorului, crawling-ul și exporturile brute sunt excluse. La o migrare reală, DB, upload-urile și configurațiile private se mută separat.
