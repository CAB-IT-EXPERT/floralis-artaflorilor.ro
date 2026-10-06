<?php
declare(strict_types=1);
const ROOT = __DIR__ . '/..';
function env(string $key, string $default=''): string {
 static $values=null;
 if ($values===null) { $values=[]; if(is_file(ROOT.'/.env')) foreach(file(ROOT.'/.env',FILE_IGNORE_NEW_LINES) as $line) {if(str_starts_with(trim($line),'#')||!str_contains($line,'='))continue;[$k,$v]=explode('=',$line,2);$values[trim($k)]=trim($v," \t\n\r\0\x0B\"'");} }
 return getenv($key) ?: ($values[$key]??$default);
}
function db(): PDO {
 static $db=null;if($db)return $db;
 $file=env('DATABASE_PATH','./data/floralis_local.sqlite');if(!str_starts_with($file,'/')&&!preg_match('~^[A-Z]:~i',$file))$file=ROOT.'/'.$file;
 if(!is_dir(dirname($file)))mkdir(dirname($file),0700,true);
 $db=new PDO('sqlite:'.$file,null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
 $db->exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');return $db;
}
function sql(string $query,array $params=[]): PDOStatement {$s=db()->prepare($query);$s->execute($params);return $s;}
function one(string $query,array $params=[]): ?array {$r=sql($query,$params)->fetch();return $r?:null;}
function all(string $query,array $params=[]): array {return sql($query,$params)->fetchAll();}
function tx(callable $fn): mixed {db()->exec('BEGIN IMMEDIATE');try{$r=$fn();db()->exec('COMMIT');return $r;}catch(Throwable $e){db()->exec('ROLLBACK');throw $e;}}
function j(mixed $v): string {return json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);}
function decoded(?string $v,mixed $default=[]): mixed {return $v===null?$default:(json_decode($v,true)??$default);}
function settingAll(): array {$out=[];foreach(all('SELECT * FROM settings') as $s)$out[$s['key']]=decoded($s['value']);return $out;}
function abortApi(string $message,int $status=400): never {throw new RuntimeException($message,$status);}
function respond(mixed $data,int $status=200): never {http_response_code($status);header('Content-Type: application/json; charset=utf-8');echo j($data);exit;}
function text(array $a,string $key,int $min=0,int $max=1000,string $default=''): string {$v=$a[$key]??$default;if(!is_string($v))abortApi('Câmp invalid: '.$key);$v=trim($v);$n=function_exists('mb_strlen')?mb_strlen($v):strlen($v);if($n<$min||$n>$max)abortApi('Completează corect câmpul: '.$key);return $v;}
function integer(mixed $v,int $min=0,int $max=PHP_INT_MAX): int {if(filter_var($v,FILTER_VALIDATE_INT)===false||$v<$min||$v>$max)abortApi('Valoare numerică invalidă.');return (int)$v;}
function email(array $a): string {$e=strtolower(text($a,'email',3,200));if(!filter_var($e,FILTER_VALIDATE_EMAIL))abortApi('Email invalid.');return $e;}
function enumValue(mixed $v,array $allowed): string {if(!in_array($v,$allowed,true))abortApi('Valoare invalidă.');return (string)$v;}
function safeUser(?array $u): ?array {return $u?array_intersect_key($u,array_flip(['id','email','name','phone','role','active'])):null;}
function product(array $p): array {$p['seo']=decoded($p['seo']);$p['source_fields']=decoded($p['source_fields']);$p['images']=all('SELECT * FROM product_images WHERE product_id=? ORDER BY sort_order,id',[$p['id']]);$p['categories']=all('SELECT c.* FROM categories c JOIN product_categories pc ON pc.category_id=c.id WHERE pc.product_id=?',[$p['id']]);$p['price']=$p['price_cents']===null?null:$p['price_cents']/100;return $p;}
function categories(): array {return array_map(function($c){$c['seo']=decoded($c['seo']);return $c;},all("SELECT c.*,(SELECT COUNT(*) FROM product_categories pc JOIN products p ON p.id=pc.product_id WHERE pc.category_id=c.id AND p.status='publish') product_count FROM categories c ORDER BY sort_order,id"));}
function migrate(): void {
 db()->exec("CREATE TABLE IF NOT EXISTS migrations(name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))");
 foreach(glob(ROOT.'/migrations/*.sql') as $file)if(!one('SELECT name FROM migrations WHERE name=?',[basename($file)]))tx(function()use($file){db()->exec(file_get_contents($file));sql('INSERT INTO migrations(name) VALUES(?)',[basename($file)]);});
}
