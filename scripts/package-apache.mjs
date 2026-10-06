import {mkdirSync,copyFileSync,cpSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {root} from './php-runtime.mjs';
// A new, curated runtime directory each time; private files never enter the package.
const stamp=new Date().toISOString().replace(/[:.]/g,'-'),folder=join(root,'delivery','floralis-apache-'+stamp);
mkdirSync(folder,{recursive:true});
for(const name of ['app','migrations','dist'])cpSync(join(root,name),join(folder,name),{recursive:true});
cpSync(join(root,'public','assets'),join(folder,'public','assets'),{recursive:true});
mkdirSync(join(folder,'public','uploads'),{recursive:true});mkdirSync(join(folder,'data'),{recursive:true});mkdirSync(join(folder,'tools'),{recursive:true});
for(const name of ['index.php','.htaccess','.env.example','README_LOCAL.md','FLORALIS_FINAL_REPORT.md'])copyFileSync(join(root,name),join(folder,name));
for(const name of ['floralis_catalog.json','floralis_content.json','import-report.json'])copyFileSync(join(root,'data',name),join(folder,'data',name));
for(const name of ['migrate.php','seed.php','admin.php','stripe-sync.php','send-outbox.php','apache-vhost.conf.example','php.ini.example'])copyFileSync(join(root,'tools',name),join(folder,'tools',name));
const checks=['.env','data/google-client.json','data/email-private.json','data/local-admin.txt','data/deployment-private.json','data/production.env'];for(const name of checks)if(existsSync(join(folder,name)))throw Error('Private file entered package: '+name);
const zip=folder+'.zip';
if(process.platform==='win32')execFileSync('powershell',['-NoProfile','-Command','Compress-Archive -LiteralPath $env:FLORALIS_PACKAGE_FOLDER -DestinationPath $env:FLORALIS_PACKAGE_ZIP'],{env:{...process.env,FLORALIS_PACKAGE_FOLDER:folder,FLORALIS_PACKAGE_ZIP:zip},stdio:'inherit'});
writeFileSync(join(root,'qa','apache-package-report.json'),JSON.stringify({created_at:new Date().toISOString(),folder:folder.slice(root.length+1),zip:zip.slice(root.length+1),private_files_included:false,node_required_at_runtime:false},null,2)+'\n');
console.log(zip);
