<?php
declare(strict_types=1);

function mailConfig(bool $private=false): array {
 $c=is_file(env('EMAIL_CONFIG_FILE',ROOT.'/data/email-private.json'))?decoded(file_get_contents(env('EMAIL_CONFIG_FILE',ROOT.'/data/email-private.json'))):[];
 $c+=['enabled'=>0,'host'=>'mail.floralis-artaflorilor.ro','port'=>465,'security'=>'ssl','username'=>'contact@floralis-artaflorilor.ro','password'=>'','from_email'=>'contact@floralis-artaflorilor.ro','from_name'=>'Floralis — arta florilor','notification_email'=>'alexie.popescu2019@yahoo.com'];
 if(!$private){$c['password_set']=$c['password']!=='';unset($c['password']);}return $c;
}

function saveMailConfig(array $a): void {
 $c=mailConfig(true);$enabled=integer($a['enabled']??0,0,1);$host=text($a,'host',0,250);
 if($host&&!preg_match('/^[a-zA-Z0-9.-]+$/',$host))abortApi('Host SMTP invalid.');
 $from=strtolower(text($a,'from_email',3,200));if(!filter_var($from,FILTER_VALIDATE_EMAIL))abortApi('Expeditor invalid.');
 $notification=strtolower(text($a,'notification_email',3,200));if(!filter_var($notification,FILTER_VALIDATE_EMAIL))abortApi('Adresa pentru notificările interne este invalidă.');
 $next=['enabled'=>$enabled,'host'=>$host,'port'=>integer($a['port']??465,1,65535),'security'=>enumValue($a['security']??'ssl',['starttls','ssl']),'username'=>text($a,'username',0,250),'password'=>text($a,'password',0,500)?:$c['password'],'from_email'=>$from,'from_name'=>text($a,'from_name',2,150),'notification_email'=>$notification];
 if($enabled&&(!$host||!$next['username']||!$next['password']))abortApi('Completează hostul, utilizatorul și parola SMTP.');
 file_put_contents(env('EMAIL_CONFIG_FILE',ROOT.'/data/email-private.json'),j($next),LOCK_EX);
}

function mailPresentation(array $row): array {
 $subject=(string)$row['subject'];
 if(str_contains($subject,'Resetare parolă'))return ['CONTUL TĂU FLORALIS','Alege o parolă nouă.','Am pregătit un link sigur, valabil timp de o oră.','Resetează parola'];
 if(str_contains($subject,'Comandă nouă'))return ['NOTIFICARE INTERNĂ','O nouă comandă a înflorit.','Toate detaliile importante sunt mai jos.','Deschide administrarea'];
 if(str_contains($subject,'Mesaj nou'))return ['MESAJ DIN WEBSITE','O nouă poveste a ajuns la Floralis.','Răspunde clientului cât mai curând, direct din administrare.','Vezi mesajele'];
 if(str_contains($subject,'Răspuns Floralis'))return ['RĂSPUNS DIN ATELIER','Ți-am pregătit un răspuns.','Îți mulțumim că ne-ai scris. Găsești mai jos mesajul echipei Floralis.','Vizitează Floralis'];
 if(str_contains($subject,'Comanda'))return ['COMANDA TA FLORALIS','Florile sunt deja în poveste.','Am primit comanda și îți păstrăm toate detaliile aproape.','Vezi magazinul'];
 if(str_contains($subject,'Plată confirmată'))return ['PLATĂ CONFIRMATĂ','Totul este în regulă.','Plata a fost confirmată în siguranță, iar comanda merge mai departe.','Vezi magazinul'];
 if(str_contains($subject,'Actualizare'))return ['VEȘTI DESPRE COMANDĂ','Povestea ta merge mai departe.','Am actualizat stadiul comenzii tale.','Vezi magazinul'];
 if(str_contains($subject,'Test SMTP'))return ['CONFIGURARE EMAIL','SMTP este pregătit.','Acest mesaj confirmă faptul că Floralis poate trimite emailuri securizate.','Vizitează Floralis'];
 return ['FLORALIS · ARTA FLORILOR','Un mesaj pregătit cu grijă.','Găsești mai jos informațiile importante.','Vizitează Floralis'];
}

function mailAbsoluteUrl(string $path): string {
 if(preg_match('~^https?://~i',$path))return $path;
 return rtrim(env('APP_URL','https://floralis-artaflorilor.ro'),'/').'/'.ltrim($path,'/');
}

function mailDocumentStyles(): string {
 return '<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><style>:root{color-scheme:light only;supported-color-schemes:light}body,.email-bg{background:#f3f1ed!important}.email-card,.email-surface{background:#ffffff!important}.email-soft{background:#f8f6f2!important}.email-text{color:#302b27!important}.email-muted{color:#746d66!important}.email-accent{color:#806534!important}.email-button{background:#302b27!important;color:#ffffff!important}.email-border{border-color:#ded8d0!important}@media(max-width:640px){.email-shell{padding:12px 6px!important}.email-card{border-radius:20px!important}.email-pad{padding-left:22px!important;padding-right:22px!important}.email-title{font-size:38px!important}.email-media{padding-left:14px!important;padding-right:14px!important}.email-button{display:block!important;text-align:center!important}}@media(prefers-color-scheme:dark){body,.email-bg{background:#f3f1ed!important}.email-card,.email-surface{background:#ffffff!important}.email-soft{background:#f8f6f2!important}.email-text{color:#302b27!important}.email-muted{color:#746d66!important}.email-accent{color:#806534!important}.email-button{background:#302b27!important;color:#ffffff!important}.email-border{border-color:#ded8d0!important}}[data-ogsc] .email-bg{background:#f3f1ed!important}[data-ogsc] .email-card,[data-ogsc] .email-surface{background:#ffffff!important}[data-ogsc] .email-soft{background:#f8f6f2!important}[data-ogsc] .email-text{color:#302b27!important}[data-ogsc] .email-muted{color:#746d66!important}[data-ogsc] .email-accent{color:#806534!important}[data-ogsc] .email-button{background:#302b27!important;color:#ffffff!important}</style>';
}

function newsletterMailHtml(array $row,array $data): string {
 $product=($row['template']??'')==='newsletter_product';$h=fn($value)=>htmlspecialchars((string)$value,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
 $title=$h($data['title']??'O noutate Floralis');$excerpt=$h($data['excerpt']??'Descoperă cea mai nouă poveste pregătită în atelier.');$action=$h(mailAbsoluteUrl((string)($data['url']??'/')));$image=(string)($data['image']??'');$image=$image===''?'':$h(mailAbsoluteUrl($image));$price=$h($data['price']??'');$year=date('Y');
 $eyebrow=$product?'NOU ÎN ATELIER':'JURNALUL FLORALIS';$headline=$product?'O creație nouă a înflorit.':'O poveste nouă, scrisă cu flori.';$button=$product?'Descoperă produsul':'Citește articolul';$preheader=$product?'Descoperă cea mai nouă creație Floralis.':'O poveste nouă te așteaptă în jurnalul Floralis.';
 $media=$image?'<tr><td class="email-media" style="padding:0 32px 8px;background:#ffffff"><a href="'.$action.'" style="display:block;overflow:hidden;border-radius:16px;background:#f1eee9"><img src="'.$image.'" width="576" alt="'.$title.'" style="display:block;width:100%;max-height:380px;object-fit:cover;border:0"></a></td></tr>':'';
 $priceBlock=$product&&$price!==''?'<span class="email-soft email-accent email-border" style="display:inline-block;margin:0 0 18px;padding:8px 12px;border:1px solid #ded8d0;border-radius:999px;background:#f8f6f2;color:#806534;font-size:13px;font-weight:700">'.$price.'</span>':'';
 $styles=mailDocumentStyles();
 return <<<HTML
<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">{$styles}</head>
<body style="margin:0;background:#f3f1ed;color:#302b27;font-family:Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">{$h($preheader)}</div>
<table class="email-bg" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f1ed"><tr><td class="email-shell" align="center" style="padding:38px 14px">
<table class="email-card email-border" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;overflow:hidden;border:1px solid #ded8d0;border-radius:24px;background:#ffffff">
<tr><td class="email-surface email-pad" style="padding:28px 38px 24px;background:#ffffff;border-bottom:1px solid #e7e2dc"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td><div class="email-text" style="color:#302b27;font-family:Georgia,serif;font-size:30px;line-height:1">Floralis</div><div class="email-muted" style="margin-top:5px;color:#746d66;font-size:8px;letter-spacing:.24em;text-transform:uppercase">arta florilor</div></td><td align="right" class="email-accent" style="color:#806534;font-size:9px;font-weight:700;letter-spacing:.16em">{$h($eyebrow)}</td></tr></table></td></tr>
<tr><td class="email-surface email-pad" style="padding:38px 38px 30px;background:#ffffff"><h1 class="email-title email-text" style="max-width:520px;margin:0 0 14px;color:#302b27;font-family:Georgia,serif;font-size:48px;font-weight:400;line-height:1.02;letter-spacing:-.025em">{$h($headline)}</h1><p class="email-muted" style="max-width:510px;margin:0;color:#746d66;font-family:Georgia,serif;font-size:17px;line-height:1.6">O noutate aleasă cu grijă din atelierul Floralis.</p></td></tr>
{$media}
<tr><td class="email-surface email-pad" style="padding:30px 38px 40px;background:#ffffff">{$priceBlock}<div class="email-accent" style="color:#806534;font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">{$h($product?'CEA MAI NOUĂ CREAȚIE':'DIN JURNALUL NOSTRU')}</div><h2 class="email-text" style="margin:10px 0 12px;color:#302b27;font-family:Georgia,serif;font-size:32px;font-weight:400;line-height:1.12">{$title}</h2><p class="email-muted" style="margin:0 0 25px;color:#746d66;font-family:Georgia,serif;font-size:16px;line-height:1.7">{$excerpt}</p><a class="email-button" href="{$action}" style="display:inline-block;padding:15px 24px;border-radius:10px;background:#302b27;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">{$h($button)} &nbsp;→</a></td></tr>
<tr><td class="email-soft email-pad email-border" style="padding:20px 38px;border-top:1px solid #ded8d0;background:#f8f6f2"><p class="email-muted" style="margin:0;color:#746d66;font-size:11px;line-height:1.7"><strong class="email-text" style="color:#302b27">Creat manual în atelierul Floralis</strong> · Tunari, Ilfov · din 2017</p></td></tr>
<tr><td class="email-surface email-pad" style="padding:24px 38px;background:#ffffff"><p class="email-muted" style="margin:0;color:#746d66;font-size:10px;line-height:1.75">Floralis — arta florilor · Calea București Nr. 9, Tunari · 0720 823 194<br>Primești acest mesaj pentru că te-ai abonat la veștile Floralis.<br>© {$year} Floralis.</p></td></tr>
</table></td></tr></table></body></html>
HTML;
}

function mailHtml(array $row): string {
 if(in_array($row['template']??'',['newsletter_product','newsletter_post'],true))return newsletterMailHtml($row,decoded($row['template_data']??'{}'));
 [$eyebrow,$headline,$intro,$button]=mailPresentation($row);$body=(string)$row['body'];$app=rtrim(env('APP_URL','https://floralis-artaflorilor.ro'),'/');
 preg_match('~https?://[^\s<>"\']+~u',$body,$match);$action=$match[0]??$app;
 $safe=htmlspecialchars($body,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');$safe=nl2br($safe,false);$year=date('Y');
 foreach(['eyebrow','headline','intro','button'] as $name)$$name=htmlspecialchars($$name,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
 $subject=htmlspecialchars((string)$row['subject'],ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');$action=htmlspecialchars($action,ENT_QUOTES,'UTF-8');$styles=mailDocumentStyles();
 return <<<HTML
<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">{$styles}</head>
<body style="margin:0;background:#f3f1ed;color:#302b27;font-family:Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">{$intro}</div>
<table class="email-bg" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f1ed"><tr><td class="email-shell" align="center" style="padding:38px 14px">
<table class="email-card email-border" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;overflow:hidden;border:1px solid #ded8d0;border-radius:24px;background:#ffffff">
<tr><td class="email-surface email-pad" style="padding:28px 38px 24px;background:#ffffff;border-bottom:1px solid #e7e2dc"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td><div class="email-text" style="color:#302b27;font-family:Georgia,serif;font-size:30px;line-height:1">Floralis</div><div class="email-muted" style="margin-top:5px;color:#746d66;font-size:8px;letter-spacing:.24em;text-transform:uppercase">arta florilor</div></td><td align="right" class="email-accent" style="color:#806534;font-size:9px;font-weight:700;letter-spacing:.16em">{$eyebrow}</td></tr></table></td></tr>
<tr><td class="email-surface email-pad" style="padding:38px 38px 24px;background:#ffffff"><h1 class="email-title email-text" style="max-width:510px;margin:0 0 13px;color:#302b27;font-family:Georgia,serif;font-size:46px;font-weight:400;line-height:1.03;letter-spacing:-.025em">{$headline}</h1><p class="email-muted" style="margin:0;color:#746d66;font-family:Georgia,serif;font-size:17px;line-height:1.6">{$intro}</p></td></tr>
<tr><td class="email-surface email-pad" style="padding:0 38px 30px;background:#ffffff"><table class="email-soft email-border" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #ded8d0;border-radius:14px;background:#f8f6f2"><tr><td style="padding:22px 24px"><div class="email-accent" style="margin-bottom:10px;color:#806534;font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase">{$subject}</div><div class="email-text" style="color:#302b27;font-size:14px;line-height:1.75">{$safe}</div></td></tr></table></td></tr>
<tr><td class="email-surface email-pad" style="padding:0 38px 38px;background:#ffffff"><a class="email-button" href="{$action}" style="display:inline-block;padding:15px 24px;border-radius:10px;background:#302b27;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">{$button} &nbsp;→</a><p class="email-muted" style="margin:23px 0 0;color:#746d66;font-size:10px;line-height:1.7">Dacă nu ai solicitat acest mesaj sau ai nevoie de ajutor, răspunde direct acestui email.</p></td></tr>
<tr><td class="email-soft email-pad email-border" style="padding:22px 38px;border-top:1px solid #ded8d0;background:#f8f6f2"><p class="email-muted" style="margin:0;color:#746d66;font-size:10px;line-height:1.75"><strong class="email-text" style="color:#302b27">Floralis — arta florilor</strong><br>Calea București Nr. 9, Tunari, Ilfov · 0720 823 194<br>© {$year} Floralis.</p></td></tr>
</table></td></tr></table></body></html>
HTML;
}
function mailCapture(array $row): void {
 $path=env('MAIL_CAPTURE_PATH','');if($path==='')return;$folder=dirname($path);if(!is_dir($folder))mkdir($folder,0700,true);file_put_contents($path,j($row)."\n",FILE_APPEND|LOCK_EX);
}

function sendMailRow(array $row): void {
 $c=mailConfig(true);if(!$c['enabled']||!$c['host']||!function_exists('curl_init'))abortApi('Configurează și activează SMTP în admin.',503);
 $encode=fn($s)=>'=?UTF-8?B?'.base64_encode(str_replace(["\r","\n"],' ',(string)$s)).'?=';$boundary='floralis-'.bin2hex(random_bytes(12));$html=mailHtml($row);$messageId=preg_replace('/[^a-zA-Z0-9.-]/','',(string)($row['id']??bin2hex(random_bytes(8))));
 $payload='From: '.$encode($c['from_name']).' <'.$c['from_email'].">\r\nTo: <".$row['recipient'].">\r\nReply-To: <".$c['from_email'].">\r\nSubject: ".$encode($row['subject'])."\r\nDate: ".date(DATE_RFC2822)."\r\nMessage-ID: <floralis-".$messageId.'-'.bin2hex(random_bytes(8))."@floralis-artaflorilor.ro>\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary=\"".$boundary."\"\r\n\r\n--".$boundary."\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n".chunk_split(base64_encode($row['body']))."\r\n--".$boundary."\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n".chunk_split(base64_encode($html))."\r\n--".$boundary."--\r\n";
 $stream=fopen('php://temp','r+');fwrite($stream,$payload);rewind($stream);$curl=curl_init(($c['security']==='ssl'?'smtps://':'smtp://').$c['host'].':'.$c['port']);
 $options=[CURLOPT_USERNAME=>$c['username'],CURLOPT_PASSWORD=>$c['password'],CURLOPT_MAIL_FROM=>$c['from_email'],CURLOPT_MAIL_RCPT=>[$row['recipient']],CURLOPT_UPLOAD=>true,CURLOPT_INFILE=>$stream,CURLOPT_INFILESIZE=>strlen($payload),CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>25,CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_USE_SSL=>CURLUSESSL_ALL];if(defined('CURLSSLOPT_NATIVE_CA'))$options[CURLOPT_SSL_OPTIONS]=CURLSSLOPT_NATIVE_CA;if(env('CURL_CA_BUNDLE'))$options[CURLOPT_CAINFO]=env('CURL_CA_BUNDLE');curl_setopt_array($curl,$options);$ok=curl_exec($curl);$error=$ok===false?curl_error($curl):'';curl_close($curl);fclose($stream);
 if($ok===false)abortApi(substr($error?:'Conexiunea SMTP a eșuat; verifică setările.',0,500),502);
}

function queueMail(string $recipient,string $subject,string $body,bool $sendNow=true,string $template='default',array $templateData=[]): array {
 $row=['id'=>bin2hex(random_bytes(12)),'recipient'=>$recipient,'subject'=>$subject,'body'=>$body,'template'=>$template,'template_data'=>j($templateData),'status'=>'pending','error'=>'','created_at'=>date('Y-m-d H:i:s')];$enabled=(bool)mailConfig(true)['enabled'];
 if($sendNow){if(!$enabled)$row['status']='disabled';else try{sendMailRow($row);$row['status']='sent';}catch(Throwable $error){$row['status']='error';$row['error']=substr($error->getMessage(),0,500);error_log('Floralis email direct: '.$error->getMessage());}}
 mailCapture($row);return $row;
}

function scheduleMailDelivery(array $rows): void {
 if(!$rows||!mailConfig(true)['enabled'])return;
 register_shutdown_function(function()use($rows){if(function_exists('fastcgi_finish_request'))@fastcgi_finish_request();@set_time_limit(0);foreach($rows as $row)try{sendMailRow($row);}catch(Throwable $error){error_log('Floralis newsletter email direct: '.$error->getMessage());}});
}

function announceNewsletter(string $type,array $entity): int {
 if(!in_array($type,['product','post'],true)||($entity['status']??'')!=='publish')return 0;
 $ids=tx(function()use($type,$entity){$insert=sql('INSERT OR IGNORE INTO newsletter_campaigns(entity_type,entity_id) VALUES(?,?)',[$type,(int)$entity['id']]);if($insert->rowCount()===0)return [];$app=rtrim(env('APP_URL','https://floralis-artaflorilor.ro'),'/');$product=$type==='product';$title=(string)($entity[$product?'name':'title']??'Noutate Floralis');$url=$app.($product?'/produs/':'/blog/').$entity['slug'];$plain=trim(preg_replace('/\s+/u',' ',strip_tags((string)($entity[$product?'short_description':'body']??''))));if($plain==='')$plain=$product?'O nouă creație florală, pregătită cu grijă în atelierul Floralis.':'O poveste nouă din atelierul Floralis te așteaptă în jurnal.';$excerpt=function_exists('mb_substr')?mb_substr($plain,0,260):substr($plain,0,260);if(strlen($plain)>strlen($excerpt))$excerpt=rtrim($excerpt)."…";$image=$product?(string)($entity['images'][0]['url']??''):(string)($entity['image']??'');$price=$product&&$entity['price_cents']!==null?number_format((int)$entity['price_cents']/100,2,',','.').' lei':'';$subject=$product?'O creație nouă Floralis · '.$title:'O poveste nouă Floralis · '.$title;$body=($product?'Am pregătit o nouă creație în atelierul Floralis.':'O poveste nouă a înflorit în jurnalul Floralis.')."\n\n".$title."\n\n".$excerpt.($price!==''?"\n\nPreț: ".$price:'')."\n\nDescoperă aici:\n".$url;$template=$product?'newsletter_product':'newsletter_post';$data=['title'=>$title,'excerpt'=>$excerpt,'image'=>$image,'url'=>$url,'price'=>$price];$queued=[];foreach(all('SELECT email FROM newsletter ORDER BY id') as $subscriber)$queued[]=queueMail($subscriber['email'],$subject,$body,false,$template,$data);return $queued;});scheduleMailDelivery($ids);return count($ids);
}
