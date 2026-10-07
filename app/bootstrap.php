<?php
declare(strict_types=1);
const ROOT = __DIR__ . '/..';
function env(string $key, string $default=''): string {
 static $values=null;
 if ($values===null) { $values=[]; if(is_file(ROOT.'/.env')) foreach(file(ROOT.'/.env',FILE_IGNORE_NEW_LINES) as $line) {if(str_starts_with(trim($line),'#')||!str_contains($line,'='))continue;[$k,$v]=explode('=',$line,2);$values[trim($k)]=trim($v," \t\n\r\0\x0B\"'");} }
 $external=getenv($key);return $external!==false?$external:($values[$key]??$default);
}
function driver(): string {return env('DB_DRIVER','sqlite');}
function db(): PDO {
 static $db=null;if($db)return $db;
 if(driver()==='mysql'){
  $db=new PDO('mysql:host='.env('DB_HOST','localhost').';port='.env('DB_PORT','3306').';dbname='.env('DB_NAME').';charset=utf8mb4',env('DB_USER'),env('DB_PASSWORD'),[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
  $db->exec("SET time_zone='+00:00'");return $db;
 }
 $file=env('DATABASE_PATH','./data/floralis_local.sqlite');if(!str_starts_with($file,'/')&&!preg_match('~^[A-Z]:~i',$file))$file=ROOT.'/'.$file;
 if(!is_dir(dirname($file)))mkdir(dirname($file),0700,true);
 $db=new PDO('sqlite:'.$file,null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
 $db->exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');return $db;
}
function mysqlQuery(string $query,array &$params): string {
 $query=str_replace(['INSERT OR IGNORE','COLLATE NOCASE',"datetime('now')"],['INSERT IGNORE','COLLATE utf8mb4_unicode_ci','UTC_TIMESTAMP()'],$query);
 while(($pos=strpos($query,"datetime('now',?)"))!==false){$n=substr_count(substr($query,0,$pos),'?');if(!preg_match('/^(-?\d+) days$/',(string)($params[$n]??''),$m))throw new RuntimeException('Interval invalid.');$params[$n]=(int)$m[1];$query=substr_replace($query,'DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY)',$pos,strlen("datetime('now',?)"));}
 $query=preg_replace('/ON CONFLICT\([^)]*\) DO UPDATE SET /','ON DUPLICATE KEY UPDATE ',$query);
 $query=preg_replace('/excluded\.([a-z_]+)/','VALUES($1)',$query);
 return preg_replace('/\bkey\b/','`key`',$query);
}
function sql(string $query,array $params=[]): PDOStatement {if(driver()==='mysql')$query=mysqlQuery($query,$params);$s=db()->prepare($query);$s->execute($params);return $s;}
function one(string $query,array $params=[]): ?array {if(driver()==='mysql'&&db()->inTransaction()&&preg_match('/^SELECT (\*|id) FROM (products|orders|discounts) WHERE /',$query))$query.=' FOR UPDATE';$r=sql($query,$params)->fetch();return $r?:null;}
function all(string $query,array $params=[]): array {return sql($query,$params)->fetchAll();}
function tx(callable $fn): mixed {if(driver()==='mysql')db()->beginTransaction();else db()->exec('BEGIN IMMEDIATE');try{$r=$fn();if(driver()==='mysql')db()->commit();else db()->exec('COMMIT');return $r;}catch(Throwable $e){if(driver()==='mysql'){if(db()->inTransaction())db()->rollBack();}else db()->exec('ROLLBACK');throw $e;}}
function j(mixed $v): string {return json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);}
function decoded(?string $v,mixed $default=[]): mixed {return $v===null?$default:(json_decode($v,true)??$default);}
function settingAll(): array {$out=[];foreach(all('SELECT * FROM settings') as $s)$out[$s['key']]=decoded($s['value']);return $out;}
function paymentMethods(): array {return all("SELECT * FROM payment_methods ORDER BY CASE WHEN code='card' AND enabled=1 THEN 0 WHEN code='cod' THEN 1 ELSE 2 END,code");}
function abortApi(string $message,int $status=400): never {throw new RuntimeException($message,$status);}
function respond(mixed $data,int $status=200): never {http_response_code($status);header('Content-Type: application/json; charset=utf-8');echo j($data);exit;}
function text(array $a,string $key,int $min=0,int $max=1000,string $default=''): string {$v=$a[$key]??$default;if(!is_string($v))abortApi('Câmp invalid: '.$key);$v=trim($v);$n=function_exists('mb_strlen')?mb_strlen($v):strlen($v);if($n<$min||$n>$max)abortApi('Completează corect câmpul: '.$key);return $v;}
function integer(mixed $v,int $min=0,int $max=PHP_INT_MAX): int {if(filter_var($v,FILTER_VALIDATE_INT)===false||$v<$min||$v>$max)abortApi('Valoare numerică invalidă.');return (int)$v;}
function email(array $a): string {$e=strtolower(text($a,'email',3,200));if(!filter_var($e,FILTER_VALIDATE_EMAIL))abortApi('Email invalid.');return $e;}
function enumValue(mixed $v,array $allowed): string {if(!in_array($v,$allowed,true))abortApi('Valoare invalidă.');return (string)$v;}
function safeUser(?array $u): ?array {return $u?array_intersect_key($u,array_flip(['id','email','name','phone','role','active'])):null;}
function metaText(string $value): string {return trim(preg_replace('/\s+/u',' ',html_entity_decode(strip_tags($value),ENT_QUOTES|ENT_HTML5,'UTF-8')));}
function metaExcerpt(string $value,int $limit): string {
 $value=metaText($value);if($value===''||mb_strlen($value)<=$limit)return $value;$cut=mb_substr($value,0,$limit-1);$space=mb_strrpos($cut,' ');if($space!==false&&$space>(int)($limit*.68))$cut=mb_substr($cut,0,$space);return rtrim($cut," \t\n\r\0\x0B,.;:!?").'…';
}
function productMetaTitle(string $name): string {
 $suffix=' | Floralis';$budget=60-mb_strlen($suffix);if(mb_strlen($name)<=$budget)return $name.$suffix;$words=preg_split('/\s+/u',$name,-1,PREG_SPLIT_NO_EMPTY);$tailCount=count($words)>2?2:1;$tail=implode(' ',array_slice($words,-$tailCount));if(mb_strlen($tail)>20){$tailCount=1;$tail=end($words);}$headSource=implode(' ',array_slice($words,0,-$tailCount));if($headSource==='')return metaExcerpt($name,$budget).$suffix;$head=metaExcerpt($headSource,max(18,$budget-mb_strlen($tail)-1));return $head.' '.$tail.$suffix;
}
function productSeoDefaults(array $p,?array $seo=null): array {
 $seo=is_array($seo)?$seo:decoded((string)($p['seo']??''));$name=metaText((string)($p['name']??'Produs Floralis'));$automatic=!empty($seo['auto'])||(trim((string)($seo['title']??''))===''&&trim((string)($seo['description']??''))==='');
 if($automatic||trim((string)($seo['title']??''))==='')$seo['title']=productMetaTitle($name);
 if($automatic||trim((string)($seo['description']??''))===''){$source=metaText((string)(($p['short_description']??'')?:($p['description']??'')));$copy='Descoperă '.$name.' la Floralis.'.($source!==''?' '.$source:' Creație florală pregătită cu grijă, disponibilă pentru comandă online.');$seo['description']=metaExcerpt($copy,160);}
 $seo['canonical']=trim((string)($seo['canonical']??''));$seo['og_image']=trim((string)($seo['og_image']??''));$seo['noindex']=false;$seo['auto']=$automatic;return $seo;
}
function categorySeoDefaults(array $category,?array $seo=null): array {
 $seo=is_array($seo)?$seo:decoded((string)($category['seo']??''));$name=metaText((string)($category['name']??'Colecție florală'));$automatic=!empty($seo['auto'])||(trim((string)($seo['title']??''))===''&&trim((string)($seo['description']??''))==='');
 if($automatic||trim((string)($seo['title']??''))==='')$seo['title']=metaExcerpt($name,39).' | Colecții Floralis';
 if($automatic||trim((string)($seo['description']??''))===''){$source=metaText((string)($category['description']??''));$seo['description']=metaExcerpt('Descoperă '.$name.' la Floralis — flori și creații pregătite cu grijă în atelierul nostru din Tunari.'.($source!==''?' '.$source:''),160);}
 $seo['canonical']=trim((string)($seo['canonical']??''));$seo['og_image']=trim((string)($seo['og_image']??''));$seo['noindex']=false;$seo['auto']=$automatic;return $seo;
}
function pageSeoDefaults(array $page,?array $seo=null): array {
 $seo=is_array($seo)?$seo:decoded((string)($page['seo']??''));$slug=(string)($page['slug']??'');$name=metaText((string)($page['title']??'Floralis'));$automatic=!empty($seo['auto'])||(trim((string)($seo['title']??''))===''&&trim((string)($seo['description']??''))==='');$defaults=[
  'despre-noi'=>['Despre Floralis | Florărie și atelier floral Tunari','Descoperă povestea Floralis, atelierul floral din Tunari unde transformăm florile în gesturi memorabile, din 2017.'],
  'decor-floral'=>['Decor floral pentru nunți și evenimente | Floralis','Decoruri florale personalizate pentru nunți, botezuri și evenimente în București și Ilfov, create atent de atelierul Floralis.'],
  'contact'=>['Contact Floralis | Florărie în Tunari, Ilfov','Contactează florăria Floralis din Tunari pentru comenzi, livrare de flori și decoruri florale. Telefon, email, program și adresă.'],
  'transport-si-livrare'=>['Livrare flori în Tunari, Ilfov și București | Floralis','Află zonele, costurile și condițiile de livrare pentru florile și aranjamentele comandate online de la Floralis.'],
  'modalitati-de-plata'=>['Plată online sigură și ramburs | Floralis','Vezi metodele de plată disponibile la Floralis: card online procesat securizat și plata la livrare sau ridicare.'],
  'alergeni'=>['Alergeni și informații despre produse | Floralis','Informații utile despre alergeni, materiale și compoziția produselor disponibile în magazinul Floralis.'],
  'termeni-si-conditii'=>['Termeni și condiții magazin online | Floralis','Consultă termenii și condițiile aplicabile comenzilor, plăților și livrărilor realizate prin magazinul online Floralis.'],
  'confidentialitate'=>['Politica de confidențialitate | Floralis','Află cum colectează, folosește și protejează Floralis datele personale furnizate prin magazinul online.'],
  'cookies'=>['Politica de cookies | Floralis','Află ce cookie-uri utilizează site-ul Floralis, de ce sunt necesare și cum îți poți gestiona preferințele.'],
  'retur'=>['Retur și retragere din comandă | Floralis','Consultă condițiile de retur, retragere și rambursare pentru produsele comandate din magazinul online Floralis.'],
  'gdpr'=>['Protecția datelor personale și GDPR | Floralis','Informații despre drepturile tale GDPR și modul în care Floralis protejează datele personale.']
 ];
 if($automatic||trim((string)($seo['title']??''))==='')$seo['title']=$defaults[$slug][0]??metaExcerpt($name,47).' | Floralis';if($automatic||trim((string)($seo['description']??''))===''){$body=metaText((string)($page['body']??''));$seo['description']=$defaults[$slug][1]??metaExcerpt(($page['type']??'page')==='post'?$name.'. '.$body:'Descoperă '.$name.' la Floralis. '.$body,160);}
 $seo['canonical']=trim((string)($seo['canonical']??''));$seo['og_image']=trim((string)($seo['og_image']??''));$seo['noindex']=false;$seo['auto']=$automatic;return $seo;
}
function product(array $p): array {$p['seo']=productSeoDefaults($p,decoded($p['seo']));$p['source_fields']=decoded($p['source_fields']);$p['images']=all('SELECT * FROM product_images WHERE product_id=? ORDER BY sort_order,id',[$p['id']]);$p['categories']=all('SELECT c.* FROM categories c JOIN product_categories pc ON pc.category_id=c.id WHERE pc.product_id=?',[$p['id']]);$p['price']=$p['price_cents']===null?null:$p['price_cents']/100;return $p;}
function contentPage(array $p): array {$p['seo']=pageSeoDefaults($p,decoded($p['seo']));return $p;}
function categories(bool $admin=false): array {
 $rows=all("SELECT c.*,(SELECT COUNT(*) FROM product_categories pc JOIN products p ON p.id=pc.product_id WHERE pc.category_id=c.id AND p.status='publish') product_count FROM categories c ORDER BY sort_order,id");$byId=array_column($rows,null,'id');
 if(!$admin)$rows=array_values(array_filter($rows,function($c)use($byId){$seen=[];while($c){if(!$c['visible']||in_array($c['id'],$seen))return false;$seen[]=$c['id'];$c=$byId[$c['parent_id']]??null;}return true;}));
 return array_map(function($c){$c['seo']=categorySeoDefaults($c,decoded($c['seo']));return $c;},$rows);
}
function migrate(): void {
 db()->exec(driver()==='mysql'?"CREATE TABLE IF NOT EXISTS migrations(name VARCHAR(190) PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)":"CREATE TABLE IF NOT EXISTS migrations(name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))");
 foreach(glob(ROOT.'/migrations/'.(driver()==='mysql'?'mysql/':'').'*.sql') as $file)if(!one('SELECT name FROM migrations WHERE name=?',[basename($file)])){
  $apply=function()use($file){db()->exec(file_get_contents($file));sql('INSERT INTO migrations(name) VALUES(?)',[basename($file)]);};
  // MySQL DDL commits implicitly; SQLite DDL is transactional.
  if(driver()==='mysql')$apply();else tx($apply);
 }
}
