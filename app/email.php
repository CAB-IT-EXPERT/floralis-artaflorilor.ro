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

function mailHtml(array $row): string {
 [$eyebrow,$headline,$intro,$button]=mailPresentation($row);$body=(string)$row['body'];$app=rtrim(env('APP_URL','https://floralis-artaflorilor.ro'),'/');
 preg_match('~https?://[^\s<>"\']+~u',$body,$match);$action=$match[0]??$app;
 $safe=htmlspecialchars($body,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');$safe=nl2br($safe,false);$year=date('Y');
 foreach(['eyebrow','headline','intro','button'] as $name)$$name=htmlspecialchars($$name,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
 $subject=htmlspecialchars((string)$row['subject'],ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');$action=htmlspecialchars($action,ENT_QUOTES,'UTF-8');
 return '<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>@media(max-width:620px){.shell{padding:18px 8px!important}.card{border-radius:22px!important}.inner{padding:34px 22px!important}.title{font-size:40px!important}.button{display:block!important;text-align:center!important}.footer{padding:24px 18px!important}}</style></head><body style="margin:0;background:#f2ede6;color:#302820;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:radial-gradient(circle at top,#fffaf2 0,#f2ede6 48%,#e9e1d7 100%)"><tr><td class="shell" align="center" style="padding:48px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="card" style="max-width:660px;overflow:hidden;border:1px solid #e0d3c1;border-radius:34px;background:#fffdf9;box-shadow:0 24px 70px rgba(57,43,29,.12)"><tr><td style="height:7px;background:linear-gradient(90deg,#8d681f,#d3ae5e,#8d681f)"></td></tr><tr><td class="inner" style="padding:50px 54px 44px"><div style="margin-bottom:34px;text-align:center"><div style="color:#b0832e;font-family:Georgia,serif;font-size:43px;line-height:1">Floralis</div><div style="margin-top:5px;color:#ad9b82;font-size:9px;letter-spacing:.24em;text-transform:uppercase">arta florilor</div></div><div style="color:#b0832e;font-size:10px;font-weight:700;letter-spacing:.2em">'.$eyebrow.'</div><h1 class="title" style="margin:15px 0 13px;color:#2f2822;font-family:Georgia,serif;font-size:52px;font-weight:400;line-height:.96;letter-spacing:-.03em">'.$headline.'</h1><p style="margin:0 0 28px;color:#776d64;font-family:Georgia,serif;font-size:19px;line-height:1.55">'.$intro.'</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 28px;border:1px solid #eadfce;border-radius:18px;background:#faf6ef"><tr><td style="padding:24px 26px"><div style="margin-bottom:10px;color:#a67a28;font-size:9px;font-weight:700;letter-spacing:.17em;text-transform:uppercase">'.$subject.'</div><div style="color:#49413a;font-size:14px;line-height:1.75">'.$safe.'</div></td></tr></table><a class="button" href="'.$action.'" style="display:inline-block;padding:15px 26px;border-radius:999px;background:linear-gradient(135deg,#be943d,#98701f);box-shadow:0 12px 28px rgba(152,112,31,.24);color:#fff;font-family:Georgia,serif;font-size:18px;text-decoration:none">'.$button.' &nbsp;→</a><p style="margin:29px 0 0;color:#9a9086;font-size:11px;line-height:1.6">Dacă nu ai solicitat acest mesaj sau ai nevoie de ajutor, poți răspunde direct acestui email.</p></td></tr><tr><td class="footer" style="padding:27px 54px;border-top:1px solid #eadfce;background:#302821;color:#cfc0ae;font-size:11px;line-height:1.7"><strong style="color:#f0d594">Floralis — arta florilor</strong><br>Calea București Nr. 9, Tunari, Ilfov · 0720 823 194<br><span style="color:#958879">© '.$year.' Floralis. Creat cu grijă pentru momente care contează.</span></td></tr></table></td></tr></table></body></html>';
}

function sendMailRow(array $row): void {
 $c=mailConfig(true);if(!$c['enabled']||!$c['host']||!function_exists('curl_init'))abortApi('Configurează și activează SMTP în admin.',503);if($row['status']==='sent')return;
 $encode=fn($s)=>'=?UTF-8?B?'.base64_encode(str_replace(["\r","\n"],' ',(string)$s)).'?=';$boundary='floralis-'.bin2hex(random_bytes(12));$html=mailHtml($row);
 $payload='From: '.$encode($c['from_name']).' <'.$c['from_email'].">\r\nTo: <".$row['recipient'].">\r\nReply-To: <".$c['from_email'].">\r\nSubject: ".$encode($row['subject'])."\r\nDate: ".date(DATE_RFC2822)."\r\nMessage-ID: <floralis-".$row['id'].'-'.bin2hex(random_bytes(8))."@floralis-artaflorilor.ro>\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary=\"".$boundary."\"\r\n\r\n--".$boundary."\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n".chunk_split(base64_encode($row['body']))."\r\n--".$boundary."\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n".chunk_split(base64_encode($html))."\r\n--".$boundary."--\r\n";
 $stream=fopen('php://temp','r+');fwrite($stream,$payload);rewind($stream);$curl=curl_init(($c['security']==='ssl'?'smtps://':'smtp://').$c['host'].':'.$c['port']);
 $options=[CURLOPT_USERNAME=>$c['username'],CURLOPT_PASSWORD=>$c['password'],CURLOPT_MAIL_FROM=>$c['from_email'],CURLOPT_MAIL_RCPT=>[$row['recipient']],CURLOPT_UPLOAD=>true,CURLOPT_INFILE=>$stream,CURLOPT_INFILESIZE=>strlen($payload),CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>25,CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_USE_SSL=>CURLUSESSL_ALL];if(defined('CURLSSLOPT_NATIVE_CA'))$options[CURLOPT_SSL_OPTIONS]=CURLSSLOPT_NATIVE_CA;if(env('CURL_CA_BUNDLE'))$options[CURLOPT_CAINFO]=env('CURL_CA_BUNDLE');curl_setopt_array($curl,$options);$ok=curl_exec($curl);$error=$ok===false?curl_error($curl):'';curl_close($curl);fclose($stream);
 if($ok===false){sql("UPDATE outbox SET status='error',error=? WHERE id=?",[substr($error?:'Conexiunea SMTP a eșuat; verifică setările.',0,500),$row['id']]);abortApi('Conexiunea SMTP a eșuat; verifică setările.',502);}sql("UPDATE outbox SET status='sent',error='' WHERE id=?",[$row['id']]);
}

function queueMail(string $recipient,string $subject,string $body,bool $sendNow=true): int {
 sql('INSERT INTO outbox(recipient,subject,body) VALUES(?,?,?)',[$recipient,$subject,$body]);$id=(int)db()->lastInsertId();
 if($sendNow&&mailConfig(true)['enabled']){try{sendMailRow(one('SELECT * FROM outbox WHERE id=?',[$id]));}catch(Throwable $e){error_log('Floralis email #'.$id.': '.$e->getMessage());}}return $id;
}
