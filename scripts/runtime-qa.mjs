import {execFileSync,spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {root,phpCommand} from './php-runtime.mjs';
// Optional local QA only. Vendor binaries are untracked in tools/qa-runtime.
const runtime=join(root,'tools','qa-runtime'),maria=join(runtime,'mariadb','mariadb-11.4.9-winx64','bin'),apache=join(runtime,'apache','Apache24');
assert.equal(createHash('sha256').update(readFileSync(join(runtime,'apache.zip'))).digest('hex'),'9b47a2363a71fef6209c88e79743db81311e1753c4564e007141934123132c10');
assert.equal(createHash('sha256').update(readFileSync(join(runtime,'mariadb.zip'))).digest('hex'),'802f9f40a9dca774a3ba62f39c21093942954f178d6d7d458dc51453929bcdda');
const folder=mkdtempSync(join(root,'data','floralis-test-')),password=randomBytes(24).toString('hex'),p=phpCommand();let dbProcess,httpProcess,logs='';
const env={...process.env,TEST_DB_DRIVER:'mysql',DB_DRIVER:'mysql',DB_HOST:'127.0.0.1',DB_PORT:'53307',DB_USER:'root',DB_PASSWORD:password,DB_NAME:'floralis_integration_qa',MYSQL_PWD:password,STRIPE_ENABLED:'0',GOOGLE_LOCAL_CALLBACK_ENABLED:'0',ADMIN_EMAIL:'qa@floralis.local',ADMIN_PASSWORD:'Floralis-QA-password-2026'};
const command=(binary,args,extra={})=>execFileSync(binary,args,{cwd:root,env,encoding:'utf8',...extra});
const slash=file=>file.replaceAll('\\','/');
const report={tested_at:new Date().toISOString(),apache:'2.4.69 Windows',php:command(p.binary,['-r','echo PHP_VERSION;']).trim(),mariadb:'11.4.9',database:'disposable local QA databases',checks:[]};
async function stop(child){if(child&&child.exitCode===null){const ended=new Promise(r=>child.once('exit',r));if(process.platform==='win32')execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'});else child.kill();await ended;}}
try{
 command(join(maria,'mariadb-install-db.exe'),[`--datadir=${join(folder,'mysql')}`,`--password=${password}`,'--port=53307','--silent']);
 dbProcess=spawn(join(maria,'mariadbd.exe'),[`--defaults-file=${join(folder,'mysql','my.ini')}`,'--bind-address=127.0.0.1','--console'],{cwd:root,env,stdio:['ignore','pipe','pipe']});dbProcess.stderr.on('data',b=>logs+=b);
 for(let i=0;i<60;i++){try{command(join(maria,'mariadb.exe'),['-h','127.0.0.1','-P','53307','-u','root','-e','SELECT 1'],{stdio:['ignore','pipe','ignore']});break;}catch{if(i===59)throw Error('MariaDB did not start');await new Promise(r=>setTimeout(r,250));}}
 command(join(maria,'mariadb.exe'),['-h','127.0.0.1','-P','53307','-u','root','-e','CREATE DATABASE floralis_integration_qa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE DATABASE floralis_apache_qa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;']);
 const result=spawn('node',['--test','tests/integration.test.mjs'],{cwd:root,env,stdio:'inherit'});assert.equal(await new Promise(r=>result.once('exit',r)),0,'MySQL integration suite failed');report.checks.push('13 integration tests passed on MariaDB / PDO MySQL');
 env.DB_NAME='floralis_apache_qa';env.APP_URL='http://127.0.0.1:5193';command(p.binary,[...p.args,'tools/seed.php']);
 const phpIni=join(folder,'php.ini');writeFileSync(phpIni,`extension_dir="${slash(join(dirname(p.binary),'ext'))}"\n${['pdo_sqlite','pdo_mysql','gd','mbstring','curl','openssl'].map(x=>'extension='+x).join('\n')}\ndisplay_errors=Off\nlog_errors=On\n`);
 const conf=join(folder,'httpd.conf');
 writeFileSync(conf,`ServerRoot "${slash(apache)}"\nListen 127.0.0.1:5193\nServerName 127.0.0.1:5193\nPidFile "${slash(join(folder,'apache.pid'))}"\nLoadModule authz_core_module modules/mod_authz_core.so\nLoadModule authz_host_module modules/mod_authz_host.so\nLoadModule alias_module modules/mod_alias.so\nLoadModule dir_module modules/mod_dir.so\nLoadModule mime_module modules/mod_mime.so\nLoadModule rewrite_module modules/mod_rewrite.so\nLoadModule actions_module modules/mod_actions.so\nLoadModule cgi_module modules/mod_cgi.so\nLoadModule env_module modules/mod_env.so\nTypesConfig conf/mime.types\nErrorLog "${slash(join(folder,'apache-error.log'))}"\nLogLevel warn\nDocumentRoot "${slash(root)}"\n<Directory "${slash(root)}">\n AllowOverride All\n Options FollowSymLinks ExecCGI\n Require local\n AddHandler application/x-httpd-php .php\n Action application/x-httpd-php /php/php-cgi.exe\n</Directory>\nScriptAlias /php/ "${slash(dirname(p.binary))}/"\n<Directory "${slash(dirname(p.binary))}">\n Options ExecCGI\n AllowOverride None\n Require local\n</Directory>\nSetEnv PHPRC "${slash(phpIni)}"\n${Object.entries({...env,SESSION_COOKIE:'floralis_apache_qa_session',RATE_LIMIT_PATH:slash(join(folder,'rate-limits')),EMAIL_CONFIG_FILE:slash(join(folder,'email-private.json'))}).filter(([key])=>/^(DB_|APP_URL|ADMIN_|STRIPE_ENABLED|GOOGLE_LOCAL_CALLBACK_ENABLED|SESSION_COOKIE|RATE_LIMIT_PATH|EMAIL_CONFIG_FILE)/.test(key)).map(([key,value])=>`SetEnv ${key} "${value}"`).join('\n')}\n`);
 command(join(apache,'bin','httpd.exe'),['-f',conf,'-t']);
 httpProcess=spawn(join(apache,'bin','httpd.exe'),['-f',conf],{cwd:root,env,stdio:['ignore','pipe','pipe']});httpProcess.stderr.on('data',b=>logs+=b);
 for(let i=0;i<40;i++){try{const response=await fetch(env.APP_URL+'/api/bootstrap');assert.equal(response.status,200);break;}catch{if(i===39)throw Error('Apache did not serve PHP: '+(existsSync(join(folder,'apache-error.log'))?readFileSync(join(folder,'apache-error.log'),'utf8'):logs));await new Promise(r=>setTimeout(r,250));}}
 const bootResponse=await fetch(env.APP_URL+'/api/bootstrap'),cookie=bootResponse.headers.get('set-cookie').split(';')[0],boot=await bootResponse.json();assert.equal(boot.categories.length,12);
 const list=await (await fetch(env.APP_URL+'/api/products?limit=100')).json();assert.equal(list.total,83);report.checks.push('Apache serves PHP API with 83 products and 12 categories');
 for(const path of ['/','/magazin','/categorie/nunta','/produs/'+list.items[0].slug,'/admin','/robots.txt','/sitemap.xml','/llms.txt']){const response=await fetch(env.APP_URL+path);assert.equal(response.status,200,path);const body=await response.text();assert.ok(body.length>20,path);}
 report.checks.push('Apache rewrite supports storefront, category, product, admin and SEO routes');
 for(const path of ['/.env','/data/source-catalog.json','/app/bootstrap.php','/tools/seed.php','/src/main.jsx','/client_secret_fake.json']){const response=await fetch(env.APP_URL+path);assert.ok([403,404].includes(response.status),path);}
 report.checks.push('Private source, database and credential paths return 403/404 through Apache');
 const image=await fetch(env.APP_URL+list.items[0].images[0].url);assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/image\/webp/);
 const dist=readFileSync(join(root,'dist','index.html'),'utf8'),script=dist.match(/src="([^"]+\.js)"/)[1];assert.equal((await fetch(env.APP_URL+script)).status,200);
 const range=await fetch(env.APP_URL+'/assets/floralis/atelier.mp4',{headers:{Range:'bytes=0-99'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,100);report.checks.push('Compiled JavaScript, real product photos and MP4 range requests work through Apache');
 const login=await fetch(env.APP_URL+'/api/auth/login',{method:'POST',headers:{Cookie:cookie,'X-CSRF-Token':boot.csrf,'Content-Type':'application/json'},body:JSON.stringify({email:env.ADMIN_EMAIL,password:env.ADMIN_PASSWORD,admin:true})});assert.equal(login.status,200);assert.equal((await login.json()).user.role,'admin');report.checks.push('Admin authentication works through Apache with PDO MySQL');
 report.passed=true;writeFileSync(join(root,'qa','apache-mysql-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{
 await stop(httpProcess);
 if(dbProcess&&dbProcess.exitCode===null){try{command(join(maria,'mariadb-admin.exe'),['-h','127.0.0.1','-P','53307','-u','root','shutdown']);}catch{}await stop(dbProcess);}
 assert.ok(resolve(folder).startsWith(resolve(root,'data')+'\\'));
 // Retain ignored QA files for inspection; never delete outside the named QA folder.
}
