<?php
declare(strict_types=1);
function mailConfig(bool $private=false): array {
 $c=is_file(ROOT.'/data/email-private.json')?decoded(file_get_contents(ROOT.'/data/email-private.json')):[];
 $c+=['enabled'=>0,'host'=>'','port'=>587,'security'=>'starttls','username'=>'','password'=>'','from_email'=>settingAll()['email']??'','from_name'=>'Floralis — arta florilor'];
 if(!$private){$c['password_set']=$c['password']!=='';unset($c['password']);}return $c;
}
function saveMailConfig(array $a): void {
 $c=mailConfig(true);$enabled=integer($a['enabled']??0,0,1);$host=text($a,'host',0,250);
 if($host&&!preg_match('/^[a-zA-Z0-9.-]+$/',$host))abortApi('Host SMTP invalid.');
 $from=strtolower(text($a,'from_email',3,200));if(!filter_var($from,FILTER_VALIDATE_EMAIL))abortApi('Expeditor invalid.');
 $next=['enabled'=>$enabled,'host'=>$host,'port'=>integer($a['port']??587,1,65535),'security'=>enumValue($a['security']??'starttls',['starttls','ssl']),'username'=>text($a,'username',0,250),'password'=>text($a,'password',0,500)?:$c['password'],'from_email'=>$from,'from_name'=>text($a,'from_name',2,150)];
 if($enabled&&(!$host||!$next['username']||!$next['password']))abortApi('Completează hostul, utilizatorul și parola SMTP.');
 file_put_contents(ROOT.'/data/email-private.json',j($next),LOCK_EX);
}
function sendMailRow(array $row): void {
 $c=mailConfig(true);if(!$c['enabled']||!$c['host']||!function_exists('curl_init'))abortApi('Configurează și activează SMTP în admin.',503);
 if($row['status']==='sent')return;
 $encode=fn($s)=>'=?UTF-8?B?'.base64_encode(str_replace(["\r","\n"],' ',(string)$s)).'?=';
 $payload='From: '.$encode($c['from_name']).' <'.$c['from_email'].">\r\nTo: <".$row['recipient'].">\r\nSubject: ".$encode($row['subject'])."\r\nDate: ".date(DATE_RFC2822)."\r\nMessage-ID: <floralis-".$row['id'].'-'.bin2hex(random_bytes(8))."@localhost>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n".chunk_split(base64_encode($row['body']));
 $stream=fopen('php://temp','r+');fwrite($stream,$payload);rewind($stream);
 $curl=curl_init(($c['security']==='ssl'?'smtps://':'smtp://').$c['host'].':'.$c['port']);
 $options=[CURLOPT_USERNAME=>$c['username'],CURLOPT_PASSWORD=>$c['password'],CURLOPT_MAIL_FROM=>$c['from_email'],CURLOPT_MAIL_RCPT=>[$row['recipient']],CURLOPT_UPLOAD=>true,CURLOPT_INFILE=>$stream,CURLOPT_INFILESIZE=>strlen($payload),CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>25,CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_USE_SSL=>CURLUSESSL_ALL];if(defined('CURLSSLOPT_NATIVE_CA'))$options[CURLOPT_SSL_OPTIONS]=CURLSSLOPT_NATIVE_CA;if(env('CURL_CA_BUNDLE'))$options[CURLOPT_CAINFO]=env('CURL_CA_BUNDLE');curl_setopt_array($curl,$options);$ok=curl_exec($curl);curl_close($curl);fclose($stream);
 if($ok===false){sql("UPDATE outbox SET status='error',error='Conexiunea SMTP a eșuat; verifică setările.' WHERE id=?",[$row['id']]);abortApi('Conexiunea SMTP a eșuat; verifică setările.',502);}
 sql("UPDATE outbox SET status='sent',error='' WHERE id=?",[$row['id']]);
}
