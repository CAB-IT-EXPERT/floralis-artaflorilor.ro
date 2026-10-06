# Floralis — plan de implementare locală

Data: 6 octombrie 2026. Director: proiectul curent. Fără deploy, DNS sau modificări ale magazinelor live.

## Audit
- Catalogul principal este JSON-ul furnizat ulterior de utilizator: `floralis_export_complet_fara_campuri_null.json`, copiat independent în `data/source-catalog.json`: 83 produse, 12 categorii cu părinți. CSV-ul inițial rămâne doar material de referință.
- Toate produsele sunt `instock`, dar gestiunea cantitativă este dezactivată și stocul numeric lipsește. Se păstrează `stock = null`, fără cantități inventate.
- Exportul media conține branding, fotografii reale, decoruri și video. Utilizatorul a adăugat `produse-media-din-csv-2026-10-06-0828`, cu imagini organizate și manifest URL → fișier. Importul folosește exclusiv aceste fișiere locale. Runtime-ul nu descarcă imagini externe.
- Textele reale provin din `floralis-texte-site.txt`. Despre noi, decor și termeni sunt utilizabile. Blogul exportat conține două articole Lorem Ipsum: se păstrează doar în admin ca draft. Nu se publică texte placeholder.
- Referința admin a fost inspectată doar prin template-uri, CSS și lista rutelor. Module identificate: dashboard cu perioade și grafic, produse, categorii, comenzi cu status/istoric/export, clienți, recenzii, newsletter, media, articole, SEO, livrare, plăți și email. Sidebar grupat, topbar cu acțiuni, cards, tabele, filtre, formulare și confirmări.
- Nu au fost citite configurații, secrete, baza de date sau date comerciale SmileBaby. Nu se modifică acel director.

## Arhitectură independentă
- React + Vite pentru storefront și admin; React Router, Lucide, fonturi locale Cormorant Garamond și Inter.
- PHP 8.2+ pentru API, autentificare și punctul de intrare Apache. SQLite nouă `data/floralis_local.sqlite`, suport PDO MySQL, SQL parametrizat și migrations proprii. Node este folosit exclusiv pentru pregătirea imaginilor și compilarea interfeței; runtime-ul final este PHP.
- Sesiuni opace HttpOnly/SameSite, parole `password_hash`, CSRF, verificare server-side rol admin, validare PHP, rate limits. Register/login/logout/reset, profil, adrese, comenzi și favorite. La cererea ulterioară se adaugă Google OAuth cu credentialele proprii Floralis; callback-ul local necesită înregistrare în Google Cloud.
- Coș persistent în DB pentru sesiunea locală. Checkout calculează prețurile server-side, validează disponibilitatea, cupoanele și livrarea; tranzacție atomică, idempotency și mișcări de stoc.
- Ramburs funcțional local; Stripe test integrat independent cu cheile Floralis primite ulterior. Catalogul, prețurile și transportul se sincronizează la modificare. Checkout, webhook, anulare și rambursare verificate în sandbox. Emailurile și resetările sunt în outbox; modul SMTP propriu este configurabil în admin.
- Upload-uri locale validate și re-encodate ca imagini, fără SVG executabil. Originalele exportate rămân intacte.

## Rute
Storefront: `/`, `/magazin`, `/categorie/:slug`, `/produs/:slug`, `/decor-floral`, `/galerie`, `/despre-noi`, `/contact`, `/blog`, `/faq`, `/favorite`, `/cos`, `/checkout`, `/cont`, `/cont/resetare`, pagini legale.

Admin: `/admin/login`, `/admin`, `/admin/produse`, `/admin/categorii`, `/admin/comenzi`, `/admin/clienti`, `/admin/stoc`, `/admin/cupoane`, `/admin/media`, `/admin/pagini`, `/admin/articole`, `/admin/recenzii`, `/admin/newsletter`, `/admin/mesaje`, `/admin/setari`, `/admin/email`.

API: `/api/bootstrap`, `/api/products`, `/api/categories`, `/api/cart`, `/api/checkout/quote`, `/api/orders`, `/api/auth/*`, `/api/account/*`, `/api/admin/*`.

## Admin / design
La cererea ulterioară explicită a utilizatorului, CSS-ul admin SmileBaby este copiat local în `src/admin-reference`, cu adaptor pentru markup-ul propriu și logo Floralis. Funcții CRUD, duplicate, arhivare/ștergere, vizibilitate categorii, stoc/istoric, comenzi/istoric/export, conturi, cupoane, SEO, media, pagini, homepage, livrare, plăți, email și setări. Fără copiere de cod backend sau dependență runtime de proiectul vecin.

Storefront urmează referința: header aerisit cu logo centrat, hero editorial cu fotografie reală, serif amplu, accente aurii, colecții, decor, produse, ocazii, poveste, galerie, recenzii reale și newsletter. Carousel mobil, bottom nav, animații discrete și reduced motion.

## Import și conținut
Import idempotent cu source IDs. Nu suprascrie editările admin la o reseedare. Prețuri în bani, descrieri și taxe din sursă. Ierarhie categorii, galerii locale, alt text, mapare URL → asset local. Raport pentru imagini lipsă. Pagini legale lipsă primesc note locale explicite, editabile; nu se inventează condiții comerciale sau recenzii.

## Excluderi
Personalizare produse și orice date, API, storage, SMTP, credentials sau dependență runtime din SmileBaby. Stripe test și Google OAuth sunt construite separat numai cu credentialele Floralis furnizate ulterior. Datele de hosting sunt păstrate privat pentru configurarea viitoare; nu reprezintă o instrucțiune de deploy. Utilitarele de crawling și fișierele de backup/secrete nu intră în aplicație.

## Verificări
13 teste API cu DB SQLite izolată și aceleași 13 teste cu MariaDB/PDO MySQL: import idempotent, sesiuni/CSRF/roluri, CRUD produse/categorii, checkout, cupoane, stoc, comenzi, clienți, setări, upload și Stripe. Apache 2.4 + PHP 8.4 + MariaDB verificate local pentru rute, autentificare, assets, SEO, video și protecția surselor. Stripe sandbox: catalog sincronizat, plată test 300 − 30 + 25 = 295 RON, confirmare server și rambursare. Build, audit de independență și credentiale. QA desktop/tablet/mobil/admin la 320/390/820/1440 px, două runde de polish, capturi și raport final. Bundle compilat în Git și arhivă Apache fără credentiale.
