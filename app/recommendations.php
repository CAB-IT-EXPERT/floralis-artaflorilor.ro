<?php
declare(strict_types=1);

function relatedProductTokens(string $name): array {
 $skip=['aranjament','buchet','lumanare','lumanari','flori','floral','de','din','cu','si','in','set'];
 return array_values(array_unique(array_map('searchStem',array_filter(explode(' ',searchNormalize($name)),fn($word)=>strlen($word)>2&&!in_array($word,$skip,true)))));
}

function relatedProducts(array $current,int $limit=4): array {
 // Rank the complete catalog before limiting, so excluding the current item never removes a recommendation.
 $categoryRows=all('SELECT id,slug,parent_id FROM categories');$categories=array_column($categoryRows,null,'id');
 $members=[];foreach(all("SELECT pc.product_id,pc.category_id FROM product_categories pc JOIN products p ON p.id=pc.product_id WHERE p.status='publish'") as $row)$members[$row['product_id']][]=$row['category_id'];
 $ancestors=function(array $ids)use($categories): array {$result=[];foreach($ids as $id){$seen=[];while(isset($categories[$id])&&!isset($seen[$id])){$seen[$id]=true;$result[$id]=true;$id=$categories[$id]['parent_id'];if(!$id)break;}}return array_keys($result);};
 $ownIds=array_column($current['categories'],'id');$ownTree=$ancestors($ownIds);$tokens=relatedProductTokens($current['name']);
 $giftSlugs=['cadouri-accesorii','bomboane','vin-sampanie'];
 $giftContext=(bool)array_filter($ownTree,fn($id)=>in_array($categories[$id]['slug'],$giftSlugs,true));
 $candidates=all("SELECT * FROM products WHERE status='publish' AND id<>?",[$current['id']]);
 foreach($candidates as &$candidate){
  $ids=$members[$candidate['id']]??[];$tree=$ancestors($ids);$score=0;
  foreach(array_intersect($ownIds,$ids) as $id)$score+=$categories[$id]['parent_id']?1000:600;
  $score+=count(array_intersect($ownTree,$tree))*180;
  if($giftContext&&array_filter($tree,fn($id)=>in_array($categories[$id]['slug'],$giftSlugs,true)))$score+=160;
  $score+=count(array_intersect($tokens,relatedProductTokens($candidate['name'])))*12;
  if($current['price_cents']!==null&&$candidate['price_cents']!==null)$score+=6/(1+abs($candidate['price_cents']-$current['price_cents'])/max(1,$current['price_cents']));
  if($candidate['stock_status']==='instock'&&(!$candidate['manage_stock']||$candidate['stock']>0))$score+=2;
  $candidate['_relevance']=$score;
 }
 unset($candidate);
 usort($candidates,fn($a,$b)=>($b['_relevance']<=>$a['_relevance'])?:($a['id']<=>$b['id']));
 return array_map(function($candidate){unset($candidate['_relevance']);return product($candidate);},array_slice($candidates,0,$limit));
}
