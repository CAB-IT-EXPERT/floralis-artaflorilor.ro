<?php
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/../app/bootstrap.php';require __DIR__.'/../app/stripe.php';migrate();
$limit=(int)($argv[1]??10);$offset=(int)($argv[2]??0);
foreach(all('SELECT id FROM products ORDER BY id LIMIT '.max(1,min(100,$limit)).' OFFSET '.max(0,$offset)) as $p)stripeQueue('product',(int)$p['id']);
foreach(all('SELECT id FROM shipping_methods') as $s)stripeQueue('shipping',(int)$s['id']);
echo j(stripeStatus())."\n";
