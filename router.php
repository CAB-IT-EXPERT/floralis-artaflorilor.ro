<?php
declare(strict_types=1);

function localEnvValue(string $key): string {
 static $values=null;
 if($values===null){
  $values=[];
  $file=__DIR__.'/.env';
  if(is_file($file))foreach(file($file,FILE_IGNORE_NEW_LINES) as $line){
   $line=trim($line);if($line===''||str_starts_with($line,'#')||!str_contains($line,'='))continue;
   [$name,$value]=explode('=',$line,2);$values[trim($name)]=trim($value," \t\n\r\0\x0B\"'");
  }
 }
 $external=getenv($key);return $external!==false?(string)$external:($values[$key]??'');
}

function proxyRemoteApi(string $remote): never {
 if(!function_exists('curl_init')){http_response_code(503);header('Content-Type: application/json');echo '{"error":"Extensia cURL lipsește din PHP-ul local."}';exit;}
 $remote=rtrim($remote,'/');$uri=$_SERVER['REQUEST_URI']??'/api/bootstrap';$target=$remote.$uri;$method=$_SERVER['REQUEST_METHOD']??'GET';$body=file_get_contents('php://input');
 $requestHeaders=['Accept: application/json','Origin: '.$remote,'X-Floralis-Preview-Origin: http://'.($_SERVER['HTTP_HOST']??'localhost:5173')];
 foreach(['CONTENT_TYPE'=>'Content-Type','HTTP_X_CSRF_TOKEN'=>'X-CSRF-Token','HTTP_COOKIE'=>'Cookie','HTTP_STRIPE_SIGNATURE'=>'Stripe-Signature'] as $serverKey=>$header)if(!empty($_SERVER[$serverKey]))$requestHeaders[]=$header.': '.$_SERVER[$serverKey];
 $responseHeaders=[];$curl=curl_init($target);$options=[CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_TIMEOUT=>60,CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_HTTPHEADER=>$requestHeaders,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_HEADERFUNCTION=>function($handle,string $line)use(&$responseHeaders): int {$length=strlen($line);$line=trim($line);if($line!==''&&str_contains($line,':')){$parts=explode(':',$line,2);$responseHeaders[]=[$parts[0],trim($parts[1])];}return $length;}];
 $caBundle=localEnvValue('CURL_CA_BUNDLE');if($caBundle!=='')$options[CURLOPT_CAINFO]=$caBundle;
 if(!in_array($method,['GET','HEAD'],true))$options[CURLOPT_POSTFIELDS]=$body;curl_setopt_array($curl,$options);$response=curl_exec($curl);$status=curl_getinfo($curl,CURLINFO_RESPONSE_CODE);$error=$response===false?curl_error($curl):'';curl_close($curl);
 if($response===false){http_response_code(502);header('Content-Type: application/json; charset=utf-8');echo json_encode(['error'=>'API-ul Floralis de pe server nu răspunde.','detail'=>$error],JSON_UNESCAPED_UNICODE);exit;}
 http_response_code($status?:502);$local='http://'.($_SERVER['HTTP_HOST']??'localhost:5173');
 foreach($responseHeaders as [$name,$value]){
  $lower=strtolower($name);if(in_array($lower,['content-length','transfer-encoding','connection','content-encoding'],true))continue;
  if($lower==='set-cookie'){$value=preg_replace('/;\s*Secure/i','',$value);$value=preg_replace('/;\s*Domain=[^;]+/i','',$value);}
  if($lower==='location'&&str_starts_with($value,$remote))$value=$local.substr($value,strlen($remote));
  header($name.': '.$value,false);
 }
 echo $method==='HEAD'?'':$response;exit;
}

$remoteApi=getenv('DB_DRIVER')!==false?'':localEnvValue('REMOTE_API_URL');$path=parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH)??'/';
if($remoteApi!==''&&preg_match('~^https://[^/]+$~',$remoteApi)&&str_starts_with($path,'/api/'))proxyRemoteApi($remoteApi);

// Local PHP server uses the same front controller and private-file boundary as Apache.
require __DIR__.'/index.php';
