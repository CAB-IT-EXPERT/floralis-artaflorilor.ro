<?php
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/../app/bootstrap.php';require __DIR__.'/../app/email.php';
if(!mailConfig()['enabled']){echo "SMTP este dezactivat; outbox-ul local a fost păstrat.\n";exit;}
foreach(all("SELECT * FROM outbox WHERE status IN ('pending','error') ORDER BY id LIMIT 30") as $row){try{sendMailRow($row);echo 'Trimis: #'.$row['id']."\n";}catch(Throwable $e){echo 'Trimitere eșuată: #'.$row['id']."\n";}}
