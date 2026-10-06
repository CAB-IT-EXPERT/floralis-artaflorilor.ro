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
- PHP 8.2+ pentru API, autentificare și punctul de intrare Apache. SQLite nouă `data/floralis_local.sqlite`, PDO, SQL parametrizat și migrations proprii. Node este folosit exclusiv pentru pregătirea imaginilor și compilarea interfeței; runtime-ul final este PHP.
- Sesiuni opace HttpOnly/SameSite, parole `password_hash`, CSRF, verificare server-side rol admin, validare PHP, rate limits. Register/login/logout/reset, profil, adrese, comenzi și favorite. La cererea ulterioară se adaugă Google OAuth cu credentialele proprii Floralis; callback-ul local necesită înregistrare în Google Cloud.
- Coș persistent în DB pentru sesiunea locală. Checkout calculează prețurile server-side, validează disponibilitatea, cupoanele și livrarea; tranzacție atomică, idempotency și mișcări de stoc.
- Ramburs funcțional local; card dezactivat până la integrare separată. Emailurile și resetările sunt în outbox local, fără SMTP.
- Upload-uri locale validate și re-encodate ca imagini, fără SVG executabil. Originalele exportate rămân intacte.

## Rute
Storefront: `/`, `/magazin`, `/categorie/:slug`, `/produs/:slug`, `/decor-floral`, `/galerie`, `/despre-noi`, `/contact`, `/blog`, `/faq`, `/favorite`, `/cos`, `/checkout`, `/cont`, `/cont/resetare`, pagini legale.

Admin: `/admin/login`, `/admin`, `/admin/produse`, `/admin/categorii`, `/admin/comenzi`, `/admin/clienti`, `/admin/stoc`, `/admin/cupoane`, `/admin/media`, `/admin/pagini`, `/admin/articole`, `/admin/recenzii`, `/admin/newsletter`, `/admin/mesaje`, `/admin/setari`, `/admin/email`.

API: `/api/bootstrap`, `/api/products`, `/api/categories`, `/api/cart`, `/api/checkout/quote`, `/api/orders`, `/api/auth/*`, `/api/account/*`, `/api/admin/*`.

## Admin / design
Reimplementare conceptuală a UX-ului inspectat, cu logo real Floralis, ivory, champagne, gold și charcoal. Funcții CRUD, duplicate, stoc/istoric, comenzi/istoric/export, conturi, cupoane, SEO, media, pagini, homepage și setări. Fără copiere de cod backend.

Storefront urmează referința: header aerisit cu logo centrat, hero editorial cu fotografie reală, serif amplu, accente aurii, colecții, decor, produse, ocazii, poveste, galerie, recenzii reale și newsletter. Carousel mobil, bottom nav, animații discrete și reduced motion.

## Import și conținut
Import idempotent cu source IDs. Nu suprascrie editările admin la o reseedare. Prețuri în bani, descrieri și taxe din sursă. Ierarhie categorii, galerii locale, alt text, mapare URL → asset local. Raport pentru imagini lipsă. Pagini legale lipsă primesc note locale explicite, editabile; nu se inventează condiții comerciale sau recenzii.

## Excluderi
Personalizare produse, Stripe, date, API, storage, SMTP, credentials sau orice dependență runtime din SmileBaby. Google OAuth se construiește separat numai cu fișierul Floralis furnizat ulterior. Utilitarele de crawling și fișierele de backup/secrete nu intră în aplicație.

## Verificări
Test API cu DB izolată: import idempotent, sesiuni/CSRF/roluri, CRUD produse/categorii, checkout, cupoane, stoc, comenzi, clienți, setări și upload. Build. Audit de independență. QA desktop/tablet/mobil/admin, două runde de polish, capturi salvate și raport final.
