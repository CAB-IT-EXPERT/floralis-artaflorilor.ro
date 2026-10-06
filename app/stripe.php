<?php
declare(strict_types=1);
// Floralis owns these mappings and credentials. No shared store or catalog.
function stripeConfigured(): bool {return env('STRIPE_ENABLED','0')==='1'&&str_starts_with(env('STRIPE_SECRET_KEY'),'sk_test_')&&str_starts_with(env('STRIPE_PUBLISHABLE_KEY'),'pk_test_');}
function stripeRequest(string $method,string $path,array $data=[],string $idempotency=''): array {
 if(!stripeConfigured()||!function_exists('curl_init'))abortApi('Stripe test nu este configurat sau extensia cURL lipsește.',503);
 $url='https://api.stripe.com/v1'.$path;if($method==='GET'&&$data)$url.='?'.http_build_query($data);
 $c=curl_init($url);$headers=['Authorization: Bearer '.env('STRIPE_SECRET_KEY'),'Stripe-Version: 2024-06-20'];if($idempotency)$headers[]='Idempotency-Key: '.$idempotency;
 $opts=[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>25,CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_HTTPHEADER=>$headers,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_CUSTOMREQUEST=>$method];
 if(defined('CURLSSLOPT_NATIVE_CA'))$opts[CURLOPT_SSL_OPTIONS]=CURLSSLOPT_NATIVE_CA;
 if($method!=='GET')$opts[CURLOPT_POSTFIELDS]=http_build_query($data);
 if(env('CURL_CA_BUNDLE'))$opts[CURLOPT_CAINFO]=env('CURL_CA_BUNDLE');curl_setopt_array($c,$opts);$raw=curl_exec($c);$status=curl_getinfo($c,CURLINFO_RESPONSE_CODE);curl_close($c);
 if($raw===false)abortApi('Conexiunea Stripe nu este disponibilă. Reîncearcă sincronizarea.',502);
 $result=json_decode($raw,true);if($status<200||$status>=300){$message=$result['error']['message']??'Cerere Stripe respinsă.';$message=preg_replace('/(?:sk|pk|rk)_(?:test|live)_[a-zA-Z0-9]+/','[secret]',$message);abortApi('Stripe: '.substr($message,0,400),502);}
 if(!is_array($result)||!empty($result['livemode']))abortApi('Răspuns Stripe test invalid.',502);return $result;
}
function stripeSyncProduct(int $id): void {
 $p=one('SELECT * FROM products WHERE id=?',[$id]);if(!$p)abortApi('Produs inexistent.',404);
 $map=one('SELECT * FROM stripe_catalog WHERE product_id=?',[$id]);$hash=hash('sha256',j(array_intersect_key($p,array_flip(['name','slug','status','price_cents','stock_status','manage_stock','stock','short_description','sku']))));
 if($map&&$map['synced_hash']===$hash)return;
 $active=$p['status']==='publish'&&$p['price_cents']!==null;
 $namespace=settingAll()['stripe_namespace']??null;if(!$namespace){$namespace=bin2hex(random_bytes(8));sql('INSERT OR IGNORE INTO settings VALUES(?,?)',['stripe_namespace',j($namespace)]);$namespace=settingAll()['stripe_namespace'];}$pid=$map['stripe_product_id']??('floralis_product_'.($p['source_id']?:$namespace.'_local_'.$id));
 $body=['name'=>$p['name'],'active'=>$active?'true':'false','description'=>substr($p['short_description']?:($p['description']?:$p['name']),0,1000),'metadata'=>['application'=>'floralis','local_product_id'=>(string)$id,'sku'=>$p['sku']??'','stock_status'=>$p['stock_status'],'stock'=>$p['stock']===null?'unmanaged':(string)$p['stock']]];
 if(!$map){try{stripeRequest('GET','/products/'.$pid);stripeRequest('POST','/products/'.$pid,$body);}catch(Throwable $e){stripeRequest('POST','/products',['id'=>$pid]+$body,'floralis-product-'.$pid);}
  sql('INSERT INTO stripe_catalog(product_id,stripe_product_id) VALUES(?,?)',[$id,$pid]);$map=one('SELECT * FROM stripe_catalog WHERE product_id=?',[$id]);
 }else stripeRequest('POST','/products/'.$pid,$body);
 $price=$map['stripe_price_id'];
 if($p['price_cents']!==null&&($price===null||$map['amount_cents']!==$p['price_cents'])){
  $new=stripeRequest('POST','/prices',['product'=>$pid,'currency'=>'ron','unit_amount'=>$p['price_cents'],'active'=>$active?'true':'false','metadata'=>['application'=>'floralis','local_product_id'=>(string)$id]],'floralis-price-'.$pid.'-'.$p['price_cents'].'-'.substr($hash,0,10));
  stripeRequest('POST','/products/'.$pid,['default_price'=>$new['id']]);if($price)stripeRequest('POST','/prices/'.$price,['active'=>'false']);$price=$new['id'];
 }elseif($price)stripeRequest('POST','/prices/'.$price,['active'=>$active?'true':'false']);
 sql("UPDATE stripe_catalog SET stripe_price_id=?,amount_cents=?,synced_hash=?,synced_at=datetime('now') WHERE product_id=?",[$price,$p['price_cents'],$hash,$id]);
}
function stripeSyncShipping(int $id): void {
 $m=one('SELECT * FROM shipping_methods WHERE id=?',[$id]);if(!$m)abortApi('Metodă inexistentă.',404);$map=one('SELECT * FROM stripe_shipping WHERE shipping_id=?',[$id]);$hash=hash('sha256',j($m));if($map&&$map['synced_hash']===$hash)return;
 $r=stripeRequest('POST','/shipping_rates',['display_name'=>$m['name'],'type'=>'fixed_amount','fixed_amount'=>['amount'=>$m['price_cents'],'currency'=>'ron'],'metadata'=>['application'=>'floralis','local_shipping_id'=>(string)$id]],'floralis-shipping-'.$id.'-'.substr($hash,0,12));
 if(!$m['enabled'])stripeRequest('POST','/shipping_rates/'.$r['id'],['active'=>'false']);if($map)stripeRequest('POST','/shipping_rates/'.$map['stripe_rate_id'],['active'=>'false']);
 sql('INSERT INTO stripe_shipping VALUES(?,?,?,?) ON CONFLICT(shipping_id) DO UPDATE SET stripe_rate_id=excluded.stripe_rate_id,amount_cents=excluded.amount_cents,synced_hash=excluded.synced_hash',[$id,$r['id'],$m['price_cents'],$hash]);
}
function stripeQueue(string $entity,int $id,bool $now=true): void {
 sql("INSERT INTO stripe_sync(entity,local_id,status) VALUES(?,?,'pending') ON CONFLICT(entity,local_id) DO UPDATE SET status='pending',error='',updated_at=datetime('now')",[$entity,$id]);
 if(!$now||!stripeConfigured())return;
 try{if($entity==='product')stripeSyncProduct($id);else stripeSyncShipping($id);sql("UPDATE stripe_sync SET status='synced',error='',updated_at=datetime('now') WHERE entity=? AND local_id=?",[$entity,$id]);}
 catch(Throwable $e){sql("UPDATE stripe_sync SET status='error',error=?,updated_at=datetime('now') WHERE entity=? AND local_id=?",[substr($e->getMessage(),0,500),$entity,$id]);}
}
function stripeStatus(): array {return ['configured'=>stripeConfigured(),'mode'=>'test','webhook_configured'=>str_starts_with(env('STRIPE_WEBHOOK_SECRET'),'whsec_'),'synced'=>one("SELECT COUNT(*) n FROM stripe_sync WHERE status='synced'")['n'],'pending'=>all("SELECT entity,local_id,status,error FROM stripe_sync WHERE status!='synced' ORDER BY updated_at LIMIT 100")];}
function stripeCheckoutPayload(array $o,array $items,string $email,?string $couponId=null): array {
 $base=rtrim(env('APP_URL','http://localhost:5173'),'/');$target=$base.'/comanda/'.$o['number'].'?token='.$o['access_token'];
 $payload=['mode'=>'payment','payment_method_types'=>['card'],'customer_email'=>$email,'client_reference_id'=>$o['number'],'success_url'=>$target.'&payment=success','cancel_url'=>$target.'&payment=cancelled','expires_at'=>time()+1800,'locale'=>'ro','metadata'=>['application'=>'floralis','local_order_id'=>(string)$o['id'],'order_number'=>$o['number']],'payment_intent_data'=>['metadata'=>['application'=>'floralis','local_order_id'=>(string)$o['id']]],'line_items'=>[], 'shipping_options'=>[['shipping_rate_data'=>['display_name'=>$o['shipping_method'],'type'=>'fixed_amount','fixed_amount'=>['amount'=>$o['shipping_cents'],'currency'=>'ron']]]]];
 foreach($items as $i){$map=one('SELECT * FROM stripe_catalog WHERE product_id=?',[$i['product_id']]);$line=['quantity'=>$i['quantity']];if($map&&$map['stripe_price_id']&&$map['amount_cents']===$i['price_cents'])$line['price']=$map['stripe_price_id'];else{$line['price_data']=['currency'=>'ron','unit_amount'=>$i['price_cents']];if($map)$line['price_data']['product']=$map['stripe_product_id'];else $line['price_data']['product_data']=['name'=>$i['name'],'metadata'=>['application'=>'floralis']];}$payload['line_items'][]=$line;}
 if($couponId)$payload['discounts']=[['coupon'=>$couponId]];return $payload;
}
function stripeCheckout(array $o): array {
 if($o['status']==='cancelled')abortApi('Comanda a fost anulată. Reface coșul.',409);if($o['stripe_checkout_url'])return $o;
 $items=all('SELECT * FROM order_items WHERE order_id=?',[$o['id']]);foreach($items as $i)stripeQueue('product',(int)$i['product_id']);
 $coupon=null;if($o['discount_cents']>0){$c=stripeRequest('POST','/coupons',['amount_off'=>$o['discount_cents'],'currency'=>'ron','duration'=>'once','name'=>$o['coupon'],'metadata'=>['application'=>'floralis','local_order_id'=>(string)$o['id']]],'floralis-order-discount-'.$o['id'].'-'.$o['idempotency_key']);$coupon=$c['id'];}
 $customer=one('SELECT email FROM customers WHERE id=?',[$o['customer_id']]);$result=stripeRequest('POST','/checkout/sessions',stripeCheckoutPayload($o,$items,$customer['email'],$coupon),'floralis-checkout-'.$o['id'].'-'.$o['idempotency_key']);
 if(($result['amount_total']??null)!==$o['total_cents']||($result['currency']??'')!=='ron'){stripeRequest('POST','/checkout/sessions/'.$result['id'].'/expire');abortApi('Totalul Stripe diferă de comandă. Plata nu a fost inițiată.',502);}
 sql('UPDATE orders SET stripe_session_id=?,stripe_checkout_url=?,stripe_error=? WHERE id=?',[$result['id'],$result['url'],'',$o['id']]);return one('SELECT * FROM orders WHERE id=?',[$o['id']]);
}
function stripeCancelOrder(array $o,string $note): void {
 if($o['payment_status']==='paid')abortApi('Comanda plătită nu poate fi anulată înaintea rambursării.',409);
 if(!$o['stock_restored']){foreach(all('SELECT * FROM order_items WHERE order_id=?',[$o['id']]) as $i){$p=one('SELECT * FROM products WHERE id=?',[$i['product_id']]);if($p&&$p['manage_stock']){sql("UPDATE products SET stock=stock+?,stock_status='instock' WHERE id=?",[$i['quantity'],$p['id']]);sql('INSERT INTO stock_movements(product_id,delta,balance,reason) VALUES(?,?,?,?)',[$p['id'],$i['quantity'],$p['stock']+$i['quantity'],$note]);}}if($o['coupon'])sql('UPDATE discounts SET uses=CASE WHEN uses>0 THEN uses-1 ELSE 0 END WHERE code=?',[$o['coupon']]);}
 sql("UPDATE orders SET status='cancelled',stock_restored=1 WHERE id=?",[$o['id']]);if($o['status']!=='cancelled')sql("INSERT INTO order_status_history(order_id,status,note) VALUES(?,'cancelled',?)",[$o['id'],$note]);
}
function stripeApplySession(array $s): void {
 if(($s['metadata']['application']??'')!=='floralis'||!empty($s['livemode']))return;
 tx(function()use($s){$o=one('SELECT * FROM orders WHERE id=?',[(int)($s['metadata']['local_order_id']??0)]);if(!$o||$o['stripe_session_id']!==($s['id']??'')||$o['payment_method']!=='card')return;
  if(($s['currency']??'')!=='ron'||($s['amount_total']??null)!==$o['total_cents'])abortApi('Valoare Stripe invalidă.',400);
  if((($s['payment_status']??'')==='paid'||(($s['payment_status']??'')==='no_payment_required'&&$o['total_cents']===0))&&!in_array($o['status'],['cancelled','returned'])&&$o['payment_status']!=='paid'){
   sql("UPDATE orders SET payment_status='paid',stripe_payment_intent=?,status=CASE WHEN status='received' THEN 'confirmed' ELSE status END WHERE id=?",[$s['payment_intent']??null,$o['id']]);sql("INSERT INTO order_status_history(order_id,status,note) VALUES(?,'confirmed','Plată confirmată de Stripe')",[$o['id']]);$c=one('SELECT email FROM customers WHERE id=?',[$o['customer_id']]);queueMail($c['email'],'Plată confirmată '.$o['number'],"Plata cu cardul pentru comanda ".$o['number']." a fost confirmată în siguranță.\n\nTotal achitat: ".number_format($o['total_cents']/100,2,',','.')." lei\n\nÎți mulțumim! Echipa Floralis pregătește următorii pași.");
  }elseif(($s['status']??'')==='expired'&&$o['payment_status']==='unpaid')stripeCancelOrder($o,'Sesiunea Stripe a expirat');
 });
}
function stripeReconcile(array $o): array {if($o['stripe_session_id']&&$o['payment_status']==='unpaid'&&$o['status']!=='cancelled'&&stripeConfigured()){try{stripeApplySession(stripeRequest('GET','/checkout/sessions/'.$o['stripe_session_id']));$o=one('SELECT * FROM orders WHERE id=?',[$o['id']]);}catch(Throwable $e){error_log('Floralis Stripe reconciliation unavailable.');}}return $o;}
function stripeWebhook(string $raw,string $signature): never {
 try{$secret=env('STRIPE_WEBHOOK_SECRET');if(!str_starts_with($secret,'whsec_'))abortApi('Webhook neconfigurat.',503);$t=0;$signs=[];foreach(explode(',',$signature) as $part){$v=explode('=',trim($part),2);if(count($v)!==2)continue;if($v[0]==='t')$t=(int)$v[1];if($v[0]==='v1')$signs[]=$v[1];}$expected=hash_hmac('sha256',$t.'.'.$raw,$secret);$valid=false;foreach($signs as $sign)if(hash_equals($expected,$sign))$valid=true;if(!$valid||abs(time()-$t)>300)abortApi('Semnătură Stripe invalidă.',400);
  $event=json_decode($raw,true);if(!is_array($event)||empty($event['id'])||empty($event['type'])||!empty($event['livemode']))abortApi('Eveniment Stripe test invalid.',400);if(one('SELECT id FROM stripe_events WHERE id=?',[$event['id']]))respond(['received'=>true]);
  if(in_array($event['type'],['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.expired']))stripeApplySession($event['data']['object']??[]);
  sql('INSERT OR IGNORE INTO stripe_events(id,type) VALUES(?,?)',[$event['id'],$event['type']]);respond(['received'=>true]);
 }catch(Throwable $e){respond(['error'=>$e->getCode()===400?'Eveniment Stripe respins.':'Webhook indisponibil.'],in_array($e->getCode(),[400,503])?$e->getCode():500);}
}
