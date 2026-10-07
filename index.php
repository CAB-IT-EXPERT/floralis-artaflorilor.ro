<?php
declare(strict_types=1);

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

$path=rawurldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH)??'/');
if(str_contains($path,'..')||str_contains($path,"\0")||str_contains($path,'\\')){http_response_code(404);exit;}

if(preg_match('~^/(assets/floralis/|uploads/|assets/)[a-zA-Z0-9_.\/-]+$~',$path)){
 $candidate=str_starts_with($path,'/assets/floralis/')||str_starts_with($path,'/uploads/')?__DIR__.'/public'.$path:__DIR__.'/dist'.$path;
 $ext=strtolower(pathinfo($candidate,PATHINFO_EXTENSION));
 $types=['js'=>'text/javascript','css'=>'text/css','woff2'=>'font/woff2','woff'=>'font/woff','png'=>'image/png','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','webp'=>'image/webp','svg'=>'image/svg+xml','mp4'=>'video/mp4'];
 if(!is_file($candidate)||!isset($types[$ext])){http_response_code(404);exit;}
 header('Content-Type: '.$types[$ext]);header('Cache-Control: public, max-age=3600');$size=filesize($candidate);$start=0;$end=$size-1;
 if($ext==='mp4'){header('Accept-Ranges: bytes');if(isset($_SERVER['HTTP_RANGE'])&&preg_match('/bytes=(\d+)-(\d*)/',$_SERVER['HTTP_RANGE'],$range)){$start=(int)$range[1];$end=$range[2]!==''?min((int)$range[2],$end):$end;if($start>$end){http_response_code(416);exit;}http_response_code(206);header("Content-Range: bytes $start-$end/$size");}}
 header('Content-Length: '.($end-$start+1));$file=fopen($candidate,'rb');fseek($file,$start);$left=$end-$start+1;while($left>0&&!feof($file)){$buffer=fread($file,min(65536,$left));echo $buffer;$left-=strlen($buffer);}fclose($file);exit;
}

require __DIR__.'/app/bootstrap.php';
if(str_starts_with($path,'/api/')){
 header('X-Robots-Tag: noindex, nofollow, noarchive',true);
 if((int)($_SERVER['CONTENT_LENGTH']??0)>9*1024*1024)respond(['error'=>'Cerere prea mare.'],413);
 require __DIR__.'/app/api.php';exit;
}

function escape(string $value): string {return htmlspecialchars($value,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
function xmlEscape(string $value): string {return htmlspecialchars($value,ENT_QUOTES|ENT_XML1|ENT_SUBSTITUTE,'UTF-8');}
function absoluteUrl(string $base,string $url): string {return preg_match('~^https?://~i',$url)?$url:$base.'/'.ltrim($url,'/');}
function staticPageMeta(string $path): ?array {
 return [
  '/'=>['Florărie online Tunari & București | Floralis','Flori, buchete și aranjamente florale create în atelierul Floralis din Tunari, cu livrare în Ilfov și București. Comandă online cu grijă.','Mai mult decât flori, emoții în dar.'],
  '/magazin'=>['Flori și aranjamente florale online | Floralis','Descoperă buchete, aranjamente florale și cadouri create în atelierul Floralis. Comandă online cu livrare în Tunari, Ilfov și București.','Magazin de flori și aranjamente Floralis'],
  '/decor-floral'=>['Decor floral pentru nunți și evenimente | Floralis','Decoruri florale personalizate pentru nunți, botezuri și evenimente în București și Ilfov, create atent de atelierul Floralis.','Decor floral pentru evenimente memorabile'],
  '/despre-noi'=>['Despre Floralis | Florărie și atelier floral Tunari','Descoperă povestea Floralis, atelierul floral din Tunari unde transformăm florile în gesturi memorabile, din 2017.','Povestea atelierului Floralis'],
  '/contact'=>['Contact Floralis | Florărie în Tunari, Ilfov','Contactează florăria Floralis din Tunari pentru comenzi, livrare de flori și decoruri florale. Telefon, email, program și adresă.','Contactează florăria Floralis'],
  '/galerie'=>['Galerie aranjamente și decoruri florale | Floralis','Vezi creații Floralis: buchete, aranjamente și decoruri florale pregătite în atelierul nostru din Tunari.','Galeria Floralis'],
  '/blog'=>['Sfaturi și povești despre flori | Blog Floralis','Idei, inspirație și sfaturi despre flori, aranjamente și decoruri de eveniment, direct din atelierul Floralis.','Din atelierul Floralis'],
  '/faq'=>['Întrebări frecvente despre comenzi și flori | Floralis','Răspunsuri despre comenzi, livrare, plată, ridicare, îngrijirea florilor și decorurile pentru evenimente Floralis.','Întrebări frecvente Floralis']
 ][$path]??null;
}

$base=rtrim(env('APP_URL','http://localhost:5173'),'/');
$settings=settingAll();
$storeName=(string)(($settings['store_name']??'')?:'Floralis — arta florilor');
$phone=(string)(($settings['phone']??'')?:'0720823194');
$email=(string)(($settings['email']??'')?:'floralis.artaflorilor@yahoo.com');
$address=(string)(($settings['address']??'')?:'Calea București Nr. 9, Tunari, Ilfov');

if($path==='/robots.txt'){
 header('Content-Type: text/plain; charset=utf-8');
 $rules="Allow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /cont/\nDisallow: /cos\nDisallow: /checkout\nDisallow: /comanda/\nDisallow: /favorite\n";
 $agents=['*','Googlebot','Google-Extended','bingbot','OAI-SearchBot','ChatGPT-User','GPTBot','ClaudeBot','PerplexityBot','Applebot-Extended','CCBot'];
 foreach($agents as $agent)echo "User-agent: $agent\n$rules\n";
 echo "Sitemap: $base/sitemap.xml\n";exit;
}

if(in_array($path,['/llms.txt','/llms-full.txt','/agents.md'],true)){
 header('Content-Type: text/plain; charset=utf-8');header('X-Robots-Tag: noindex, follow',true);
 $publicPages=[
  'Acasă'=>'/','Magazin'=>'/magazin','Decor floral'=>'/decor-floral','Despre Floralis'=>'/despre-noi','Contact'=>'/contact','Galerie'=>'/galerie','Blog'=>'/blog','Întrebări frecvente'=>'/faq',
  'Transport și livrare'=>'/transport-si-livrare','Modalități de plată'=>'/modalitati-de-plata','Retur'=>'/retur','Termeni și condiții'=>'/termeni-si-conditii','Confidențialitate'=>'/confidentialitate','Cookies'=>'/cookies','GDPR'=>'/gdpr','Alergeni'=>'/alergeni'
 ];
 echo "# Floralis — arta florilor\n\n";
 echo "Floralis Arta Florilor SRL este o florărie și un atelier floral din Tunari, Ilfov, activ din 2017. Site oficial: $base. Limbă: română (ro-RO). Monedă: RON.\n\n";
 echo "## Date oficiale\n\n- Denumire juridică: Floralis Arta Florilor SRL\n- CUI: RO37782470\n- Registrul Comerțului: J2017003023237\n- Atelier și punct de contact: $address\n- Telefon: $phone\n- Email: $email\n\n";
 echo "## Pagini publice canonice\n\n";foreach($publicPages as $label=>$url)echo "- $label: $base$url\n";
 echo "\n## Colecții\n\n";foreach(categories() as $category)echo '- '.$category['name'].': '.$base.'/categorie/'.$category['slug']."\n";
 if($path==='/agents.md'){
  echo "\n## Instrucțiuni pentru agenți și asistenți\n\n";
  echo "- Folosiți și citați URL-urile canonice Floralis atunci când răspundeți despre produse, livrare, plată sau politici.\n";
  echo "- Pentru preț și disponibilitate consultați pagina curentă a produsului; valorile se pot modifica. Toate prețurile sunt în RON.\n";
  echo "- Pentru întrebări juridice sau operaționale folosiți paginile publice dedicate, nu presupuneri.\n";
  echo "- Nu indexați și nu citați zonele private sau tranzacționale: /admin/, /api/, /cont/, /cos, /checkout, /comanda/ și /favorite.\n";
  echo "- Imaginile produselor pot fi folosite pentru a descrie produsul, păstrând atribuirea și URL-ul paginii canonice.\n";
 }
 if($path==='/llms-full.txt'){
  echo "\n## Catalog public\n\n";
  foreach(all("SELECT * FROM products WHERE status='publish' ORDER BY name") as $row){$product=product($row);$availability=$product['stock_status']==='instock'&&(!$product['manage_stock']||$product['stock']>0)?'în stoc':'stoc epuizat';$price=$product['price_cents']===null?'preț la cerere':number_format($product['price_cents']/100,2,',','.').' RON';$description=metaExcerpt((string)(($product['short_description']??'')?:($product['description']??'')),240);$mainImage=$product['images'][0]['url']??'';echo '- '.$product['name'].' | '.$price.' | '.$availability.' | '.$base.'/produs/'.$product['slug'].($mainImage!==''?' | imagine: '.absoluteUrl($base,$mainImage):'').($description!==''?' | '.$description:'')."\n";}
 }
 exit;
}

if($path==='/sitemap.xml'){
 header('Content-Type: application/xml; charset=utf-8');
 $urls=[];$add=function(string $url,array $data=[])use(&$urls):void{$urls[$url]=['path'=>$url,...$data];};
 foreach(['/','/magazin','/decor-floral','/despre-noi','/contact','/galerie','/blog','/faq'] as $url)$add($url);
 foreach(all("SELECT p.slug,p.name,p.created_at,pi.url image,pi.alt image_alt FROM products p LEFT JOIN product_images pi ON pi.id=(SELECT i.id FROM product_images i WHERE i.product_id=p.id ORDER BY i.sort_order,i.id LIMIT 1) WHERE p.status='publish' ORDER BY p.id") as $product)$add('/produs/'.$product['slug'],['lastmod'=>substr((string)$product['created_at'],0,10),'image'=>$product['image']??'','image_alt'=>($product['image_alt']??'')?:$product['name']]);
 foreach(categories() as $category)if(empty($category['seo']['noindex']))$add('/categorie/'.$category['slug'],['image'=>$category['image']??'','image_alt'=>$category['name']]);
 foreach(all("SELECT * FROM pages WHERE status='publish'") as $row){$page=contentPage($row);if(empty($page['seo']['noindex']))$add(($page['type']==='post'?'/blog/':'/').$page['slug'],['image'=>$page['image']??'','image_alt'=>$page['title']]);}
 echo '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">';
 foreach($urls as $entry){echo '<url><loc>'.xmlEscape($base.$entry['path']).'</loc>';if(!empty($entry['lastmod']))echo '<lastmod>'.xmlEscape($entry['lastmod']).'</lastmod>';if(!empty($entry['image']))echo '<image:image><image:loc>'.xmlEscape(absoluteUrl($base,$entry['image'])).'</image:loc><image:title>'.xmlEscape($entry['image_alt']).'</image:title></image:image>';echo '</url>';}
 echo '</urlset>';exit;
}

if(!is_file(__DIR__.'/dist/index.html')){http_response_code(503);echo '<!doctype html><html lang="ro"><meta charset="utf-8"><h1>Floralis — pregătire locală</h1><p>Compilează interfața cu npm run build, apoi reîncarcă pagina.</p></html>';exit;}

$defaultImage='/assets/floralis/hero-desktop.webp';
$title=(string)(($settings['seo_title']??'')?:'Florărie online Tunari & București | Floralis');
$description=(string)(($settings['seo_description']??'')?:'Flori, buchete și aranjamente florale create în atelierul Floralis din Tunari, cu livrare în Ilfov și București.');
$canonical=$base.($path==='/'?'/':$path);
$image=(string)(($settings['seo_og_image']??'')?:$defaultImage);
$imageAlt='Floralis — arta florilor';
$private=(bool)preg_match('~^/(admin|api|cont|cos|checkout|comanda|favorite)(?:/|$)~',$path)||!empty($_GET);
$structured=[];$snapshot='';$seo=[];$productPage=false;$productData=null;$categoryData=null;$contentData=null;$pageType='website';
$staticMeta=staticPageMeta($path);
if($staticMeta){[$title,$description,$heading]=$staticMeta;}

if(preg_match('~^/produs/([^/]+)$~',$path,$matches)){
 $row=one("SELECT * FROM products WHERE slug=? AND status='publish'",[$matches[1]]);
 if(!$row){http_response_code(404);$title='Produsul nu a fost găsit | Floralis';$private=true;}
 else{$productData=product($row);$productPage=true;$pageType='product';$seo=$productData['seo'];$title=$productData['name'].' | Floralis';$description=(string)(($productData['short_description']??'')?:($productData['description']??''));$image=$productData['images'][0]['url']??$image;$imageAlt=(string)(($productData['images'][0]['alt']??'')?:$productData['name']);$snapshot='<article><h1>'.escape($productData['name']).'</h1><img src="'.escape($image).'" alt="'.escape($imageAlt).'"><p>'.escape(metaText($description)).'</p><p>'.($productData['price_cents']===null?'Preț la cerere':escape(number_format($productData['price_cents']/100,2,',','.')).' RON').'</p></article>';}
}elseif(preg_match('~^/categorie/([^/]+)$~',$path,$matches)){
 $row=one('SELECT * FROM categories WHERE slug=? AND visible=1',[$matches[1]]);$visibleIds=array_map('intval',array_column(categories(),'id'));
 if(!$row||!in_array((int)$row['id'],$visibleIds,true)){http_response_code(404);$private=true;$title='Colecția nu a fost găsită | Floralis';}
 else{$categoryData=$row;$categoryData['seo']=categorySeoDefaults($row,decoded($row['seo']));$seo=$categoryData['seo'];$title=$categoryData['name'].' | Colecții Floralis';$description=(string)$categoryData['description'];if(!empty($categoryData['image'])){$image=$categoryData['image'];$imageAlt=$categoryData['name'];}$pageType='collection';}
}else{
 $pageSlug=str_starts_with($path,'/blog/')?substr($path,6):trim($path,'/');$expectedType=str_starts_with($path,'/blog/')?'post':'page';
 if($pageSlug!==''){$row=one("SELECT * FROM pages WHERE slug=? AND type=? AND status='publish'",[$pageSlug,$expectedType]);if($row){$contentData=contentPage($row);$seo=$contentData['seo'];$title=$contentData['title'].' | Floralis';$description=(string)$contentData['body'];if(!empty($contentData['image'])){$image=$contentData['image'];$imageAlt=$contentData['title'];}$pageType=$contentData['type']==='post'?'article':'webpage';$snapshot='<article><h1>'.escape($contentData['title']).'</h1><div>'.nl2br(escape($contentData['body'])).'</div></article>';}}
 $knownPrivate=(bool)preg_match('~^/(admin|cont|cos|checkout|comanda|favorite)(?:/|$)~',$path);
 if(!$contentData&&!$staticMeta&&!$knownPrivate&&$path!=='/'){http_response_code(404);$private=true;$title='Pagina nu a fost găsită | Floralis';}
}

if(!empty($seo['title']))$title=(string)$seo['title'];
if(!empty($seo['description']))$description=(string)$seo['description'];
if(!empty($seo['canonical']))$canonical=(string)$seo['canonical'];
if(!empty($seo['og_image'])&&!$productPage){$image=(string)$seo['og_image'];$imageAlt=$contentData['title']??$categoryData['name']??$imageAlt;}
$private=$private||(!$productPage&&!empty($seo['noindex']));
if($productPage&&$productData){$canonical=$base.'/produs/'.$productData['slug'];$private=false;}
if($private)header('X-Robots-Tag: noindex, nofollow, noarchive',true);

if(!$snapshot&&!$private&&(in_array($path,['/','/magazin'],true)||$categoryData)){
 $heading=$staticMeta[2]??($categoryData['name']??'Flori și aranjamente Floralis');$snapshot='<main><h1>'.escape($heading).'</h1><p>'.escape(metaText($description)).'</p><nav>';
 foreach(categories() as $category)$snapshot.='<a href="/categorie/'.escape($category['slug']).'">'.escape($category['name']).'</a> ';
 $snapshot.='</nav><section>';
 $rows=$categoryData?all("SELECT p.* FROM products p JOIN product_categories pc ON pc.product_id=p.id WHERE p.status='publish' AND pc.category_id=? ORDER BY p.featured DESC,p.id DESC LIMIT 24",[$categoryData['id']]):all("SELECT * FROM products WHERE status='publish' ORDER BY featured DESC,id DESC LIMIT 24");
 foreach($rows as $row)$snapshot.='<article><a href="/produs/'.escape($row['slug']).'"><h2>'.escape($row['name']).'</h2></a><p>'.($row['price_cents']===null?'Preț la cerere':escape(number_format($row['price_cents']/100,2,',','.')).' RON').'</p></article>';
 $snapshot.='</section></main>';
}
if(!$snapshot&&!$private&&$path==='/blog'){$snapshot='<main><h1>Din atelierul Floralis</h1><p>'.escape(metaText($description)).'</p>';foreach(all("SELECT * FROM pages WHERE type='post' AND status='publish' ORDER BY id DESC") as $post)$snapshot.='<article><a href="/blog/'.escape($post['slug']).'"><h2>'.escape($post['title']).'</h2></a><p>'.escape(metaExcerpt($post['body'],180)).'</p></article>';$snapshot.='</main>';}

$organizationId=$base.'/#organization';$websiteId=$base.'/#website';
$primaryNavigation=[['name'=>'Acasă','url'=>$base.'/'],['name'=>'Magazin','url'=>$base.'/magazin'],['name'=>'Decoruri florale','url'=>$base.'/decor-floral'],['name'=>'Despre noi','url'=>$base.'/despre-noi'],['name'=>'Contact','url'=>$base.'/contact'],['name'=>'Livrare','url'=>$base.'/transport-si-livrare'],['name'=>'Modalități de plată','url'=>$base.'/modalitati-de-plata']];
$social=[];foreach(($settings['social']??[]) as $profile)if(is_array($profile)&&filter_var($profile['url']??'',FILTER_VALIDATE_URL))$social[]=$profile['url'];
$tiktok='https://www.tiktok.com/@floralis.artaflorilor?_r=1&_t=ZN-9AM6Bf57Dk6';if(!in_array($tiktok,$social,true))$social[]=$tiktok;
$organization=[
 '@context'=>'https://schema.org','@type'=>['Florist','OnlineStore'],'@id'=>$organizationId,'name'=>$storeName,'legalName'=>'Floralis Arta Florilor SRL','url'=>$base.'/','logo'=>absoluteUrl($base,'/assets/floralis/logo.png'),'image'=>absoluteUrl($base,$image),'description'=>'Atelier floral și florărie online din Tunari, Ilfov, cu flori, aranjamente și decoruri pentru evenimente.','foundingDate'=>'2017','taxID'=>'RO37782470','vatID'=>'RO37782470',
 'identifier'=>[['@type'=>'PropertyValue','propertyID'=>'Registrul Comerțului','value'=>'J2017003023237'],['@type'=>'PropertyValue','propertyID'=>'Sediu social','value'=>'Jud. Ilfov, Oraș Voluntari, Bld. Pipera Nr. 48C, Clădire C1, Parter, Camera 2']],'telephone'=>$phone,'email'=>$email,'address'=>['@type'=>'PostalAddress','streetAddress'=>'Calea București Nr. 9','addressLocality'=>'Tunari','addressRegion'=>'Ilfov','postalCode'=>'077180','addressCountry'=>'RO'],'geo'=>['@type'=>'GeoCoordinates','latitude'=>44.547202494152565,'longitude'=>26.13912747656769],'hasMap'=>'https://www.google.com/maps/search/?api=1&query=44.547202494152565,26.13912747656769','areaServed'=>[['@type'=>'City','name'=>'Tunari'],['@type'=>'AdministrativeArea','name'=>'Ilfov'],['@type'=>'City','name'=>'București']],'currenciesAccepted'=>'RON','paymentAccepted'=>'Card, numerar la livrare sau ridicare','priceRange'=>'$$','openingHoursSpecification'=>[['@type'=>'OpeningHoursSpecification','dayOfWeek'=>['Monday','Tuesday','Wednesday','Thursday','Friday'],'opens'=>'09:00','closes'=>'19:00'],['@type'=>'OpeningHoursSpecification','dayOfWeek'=>'Saturday','opens'=>'09:00','closes'=>'16:00']],'contactPoint'=>['@type'=>'ContactPoint','telephone'=>$phone,'email'=>$email,'contactType'=>'customer service','availableLanguage'=>'Romanian','areaServed'=>'RO'],'hasMerchantReturnPolicy'=>['@type'=>'MerchantReturnPolicy','applicableCountry'=>'RO','merchantReturnLink'=>$base.'/retur']
];
if($social)$organization['sameAs']=$social;
if(in_array($path,['/','/despre-noi','/contact'],true))$structured[]=$organization;
if($path==='/'){
 $structured[]=['@context'=>'https://schema.org','@type'=>'WebSite','@id'=>$websiteId,'url'=>$base.'/','name'=>'Floralis','alternateName'=>['Floralis — arta florilor','Floralis Arta Florilor'],'inLanguage'=>'ro-RO','publisher'=>['@id'=>$organizationId],'hasPart'=>array_map(fn($item)=>['@type'=>'WebPage','@id'=>$item['url'].'#webpage','url'=>$item['url'],'name'=>$item['name']],$primaryNavigation)];
 $structured[]=['@context'=>'https://schema.org','@graph'=>array_map(fn($item,$index)=>['@type'=>'SiteNavigationElement','@id'=>$base.'/#navigation-'.($index+1),'name'=>$item['name'],'url'=>$item['url']],$primaryNavigation,array_keys($primaryNavigation))];
}

if(!$private){
 $webType=$path==='/despre-noi'?'AboutPage':($path==='/contact'?'ContactPage':($path==='/magazin'||$categoryData?'CollectionPage':($contentData&&$contentData['type']==='post'?'Article':'WebPage')));
 $webPage=['@context'=>'https://schema.org','@type'=>$webType,'@id'=>$canonical.'#webpage','url'=>$canonical,'name'=>metaText($title),'description'=>metaExcerpt($description,160),'inLanguage'=>'ro-RO','isPartOf'=>['@id'=>$websiteId],'about'=>['@id'=>$organizationId]];
 if($contentData&&$contentData['type']==='post'){$webPage['headline']=$contentData['title'];$webPage['publisher']=['@id'=>$organizationId];if(!empty($contentData['image']))$webPage['image']=absoluteUrl($base,$contentData['image']);}
 if($productPage&&$productData)$webPage['mainEntity']=['@id'=>$canonical.'#product'];
 $structured[]=$webPage;
}

if($productPage&&$productData){
 $productImages=array_values(array_map(fn(array $item):string=>absoluteUrl($base,$item['url']),$productData['images']));$productCategories=$productData['categories'];$lastCategory=$productCategories?end($productCategories):null;
 $productSchema=['@context'=>'https://schema.org','@type'=>'Product','@id'=>$canonical.'#product','name'=>$productData['name'],'url'=>$canonical,'sku'=>(string)$productData['sku'],'brand'=>['@type'=>'Brand','name'=>'Floralis'],'image'=>$productImages,'description'=>metaText($description)];
 if($lastCategory)$productSchema['category']=$lastCategory['name'];
 if($productData['price_cents']!==null)$productSchema['offers']=['@type'=>'Offer','url'=>$canonical,'priceCurrency'=>'RON','price'=>number_format($productData['price_cents']/100,2,'.',''),'itemCondition'=>'https://schema.org/NewCondition','availability'=>'https://schema.org/'.($productData['stock_status']==='instock'&&(!$productData['manage_stock']||$productData['stock']>0)?'InStock':'OutOfStock'),'seller'=>['@type'=>'Organization','@id'=>$organizationId,'name'=>$storeName,'url'=>$base.'/']];
 $structured[]=$productSchema;
}

if(($path==='/magazin'||$categoryData)&&!$private){
 $listRows=$categoryData?all("SELECT p.name,p.slug FROM products p JOIN product_categories pc ON pc.product_id=p.id WHERE p.status='publish' AND pc.category_id=? ORDER BY p.featured DESC,p.id DESC",[$categoryData['id']]):all("SELECT name,slug FROM products WHERE status='publish' ORDER BY featured DESC,id DESC");
 $structured[]=['@context'=>'https://schema.org','@type'=>'ItemList','name'=>$categoryData['name']??'Produse Floralis','numberOfItems'=>count($listRows),'itemListElement'=>array_map(fn($row,$index)=>['@type'=>'ListItem','position'=>$index+1,'name'=>$row['name'],'url'=>$base.'/produs/'.$row['slug']],$listRows,array_keys($listRows))];
}
if($path==='/blog'&&!$private){$posts=all("SELECT title,slug FROM pages WHERE type='post' AND status='publish' ORDER BY id DESC");$structured[]=['@context'=>'https://schema.org','@type'=>'ItemList','name'=>'Articole Floralis','numberOfItems'=>count($posts),'itemListElement'=>array_map(fn($row,$index)=>['@type'=>'ListItem','position'=>$index+1,'name'=>$row['title'],'url'=>$base.'/blog/'.$row['slug']],$posts,array_keys($posts))];}

if($path==='/faq'){
 $faq=[
  ['Cum solicit un decor pentru un eveniment?','Decorurile pentru nunți, botezuri și evenimente private sunt realizate pe bază de comandă. Scrie-ne câteva detalii despre dată, locație și atmosfera dorită, iar noi revenim cu pașii următori.'],
  ['Pot exista diferențe față de fotografie?','Florile sunt naturale și sezoniere. Pot exista mici diferențe de nuanță sau varietate, însă păstrăm stilul, cromatica și valoarea estetică a creației alese.'],
  ['Unde livrați și cât durează?','Livrăm în Tunari, Ilfov și zonele apropiate. Intervalul exact și costul sunt confirmate înainte de finalizarea comenzii, în funcție de adresă și trafic.'],
  ['Pot ridica personal comanda?','Da. Poți alege ridicarea din atelierul Floralis, Calea București Nr. 9, Tunari, după confirmarea telefonică a orei.'],
  ['Ce metode de plată sunt disponibile?','Metodele active sunt afișate la finalizarea comenzii. Plata cu cardul este procesată securizat, iar detaliile cardului nu sunt stocate de Floralis.'],
  ['Pot modifica sau anula o comandă?','Contactează-ne cât mai repede. Pentru produsele florale pregătite la comandă, posibilitatea de modificare sau anulare depinde de stadiul realizării.'],
  ['Cum păstrez florile proaspete mai mult timp?','Așază aranjamentul într-un loc răcoros, ferit de soare direct și surse de căldură. Completează apa conform tipului de aranjament și îndepărtează florile ofilite.'],
  ['Cum iau legătura rapid cu voi?','Ne poți suna la 0720 823 194, ne poți scrie pe email sau poți folosi formularul din pagina Contact.']
 ];
 $structured[]=['@context'=>'https://schema.org','@type'=>'FAQPage','mainEntity'=>array_map(fn($item)=>['@type'=>'Question','name'=>$item[0],'acceptedAnswer'=>['@type'=>'Answer','text'=>$item[1]]],$faq)];
}

if(!$private&&$path!=='/'){
 $crumbs=[['name'=>'Acasă','item'=>$base.'/']];
 if($productData){$crumbs[]=['name'=>'Magazin','item'=>$base.'/magazin'];if($lastCategory??null)$crumbs[]=['name'=>$lastCategory['name'],'item'=>$base.'/categorie/'.$lastCategory['slug']];$crumbs[]=['name'=>$productData['name'],'item'=>$canonical];}
 elseif($categoryData){$crumbs[]=['name'=>'Magazin','item'=>$base.'/magazin'];$crumbs[]=['name'=>$categoryData['name'],'item'=>$canonical];}
 elseif($contentData&&$contentData['type']==='post'){$crumbs[]=['name'=>'Blog','item'=>$base.'/blog'];$crumbs[]=['name'=>$contentData['title'],'item'=>$canonical];}
 else $crumbs[]=['name'=>$contentData['title']??($staticMeta[2]??metaText($title)),'item'=>$canonical];
 $structured[]=['@context'=>'https://schema.org','@type'=>'BreadcrumbList','itemListElement'=>array_map(fn($crumb,$index)=>['@type'=>'ListItem','position'=>$index+1,'name'=>$crumb['name'],'item'=>$crumb['item']],$crumbs,array_keys($crumbs))];
}

$title=metaText($title);$description=metaExcerpt($description,160);$imageUrl=absoluteUrl($base,$image);$imageType=['jpg'=>'image/jpeg','jpeg'=>'image/jpeg','png'=>'image/png','webp'=>'image/webp'][strtolower(pathinfo(parse_url($imageUrl,PHP_URL_PATH)??'',PATHINFO_EXTENSION))]??'';$imageSize=null;$localImage=parse_url($imageUrl,PHP_URL_PATH);
if(is_string($localImage)&&preg_match('~^/(assets/floralis/|uploads/)[a-zA-Z0-9_.\/-]+$~',$localImage)){$imageFile=__DIR__.'/public'.$localImage;if(is_file($imageFile))$imageSize=@getimagesize($imageFile);}

$robots=$private?'noindex,nofollow,noarchive':'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
$meta='<meta name="description" content="'.escape($description).'"><meta name="author" content="Floralis Arta Florilor SRL"><meta name="application-name" content="Floralis"><link rel="canonical" href="'.escape($canonical).'"><link rel="alternate" hreflang="ro-RO" href="'.escape($canonical).'"><link rel="alternate" hreflang="x-default" href="'.escape($canonical).'"><meta name="robots" content="'.$robots.'"><meta name="googlebot" content="'.$robots.'"><meta property="og:locale" content="ro_RO"><meta property="og:site_name" content="'.escape($storeName).'"><meta property="og:type" content="'.($productPage?'product':($contentData&&$contentData['type']==='post'?'article':'website')).'"><meta property="og:title" content="'.escape($title).'"><meta property="og:description" content="'.escape($description).'"><meta property="og:url" content="'.escape($canonical).'"><meta property="og:image" content="'.escape($imageUrl).'"><meta property="og:image:secure_url" content="'.escape($imageUrl).'"><meta property="og:image:alt" content="'.escape($imageAlt).'"><link rel="image_src" href="'.escape($imageUrl).'">'.($imageType!==''?'<meta property="og:image:type" content="'.$imageType.'">':'').($imageSize?'<meta property="og:image:width" content="'.$imageSize[0].'"><meta property="og:image:height" content="'.$imageSize[1].'">':'').'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'.escape($title).'"><meta name="twitter:description" content="'.escape($description).'"><meta name="twitter:image" content="'.escape($imageUrl).'"><meta name="twitter:image:alt" content="'.escape($imageAlt).'">';
if(in_array($path,['/','/contact'],true))$meta.='<meta name="geo.region" content="RO-IF"><meta name="geo.placename" content="Tunari"><meta name="geo.position" content="44.547202494152565;26.13912747656769"><meta name="ICBM" content="44.547202494152565, 26.13912747656769">';
if($productPage&&$productData&&$productData['price_cents']!==null)$meta.='<meta property="product:price:amount" content="'.number_format($productData['price_cents']/100,2,'.','').'"><meta property="product:price:currency" content="RON"><meta property="product:availability" content="'.($productData['stock_status']==='instock'&&(!$productData['manage_stock']||$productData['stock']>0)?'in stock':'out of stock').'">';
foreach($structured as $item)$meta.='<script type="application/ld+json">'.json_encode($item,JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).'</script>';

$html=file_get_contents(__DIR__.'/dist/index.html');
$html=preg_replace('~<title>.*?</title>~s','<title>'.escape($title).'</title>',$html);
$html=str_replace('<!--SEO-->',$meta,$html);
if($snapshot)$html=str_replace('<div id="root"></div>','<div id="root"><div class="seo-snapshot" hidden aria-hidden="true">'.$snapshot.'</div></div>',$html);
echo $html;
