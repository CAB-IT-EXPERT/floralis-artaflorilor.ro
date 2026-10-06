<?php
// Explicit CLI-only update; seed never overwrites an existing account password.
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/../app/bootstrap.php';migrate();
$mail=env('ADMIN_EMAIL');$password=env('ADMIN_PASSWORD');
if(!filter_var($mail,FILTER_VALIDATE_EMAIL)||strlen($password)<12)throw new RuntimeException('Configurează ADMIN_EMAIL și o parolă de minimum 12 caractere în .env.');
tx(function()use($mail,$password){
 $u=one('SELECT id FROM users WHERE email=?',[$mail]);
 if($u)sql("UPDATE users SET password_hash=?,role='admin',active=1 WHERE id=?",[password_hash($password,PASSWORD_DEFAULT),$u['id']]);
 else sql("INSERT INTO users(email,password_hash,name,role) VALUES(?,?,?,'admin')",[$mail,password_hash($password,PASSWORD_DEFAULT),'Administrator Floralis']);
 sql("UPDATE users SET active=0 WHERE role='admin' AND email!=?",[$mail]);
 sql("DELETE FROM sessions WHERE user_id IN(SELECT id FROM users WHERE role='admin')");
});
echo "Administratorul Floralis a fost configurat; parola nu este afișată.\n";
