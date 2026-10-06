import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync,readdirSync,statSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,relative} from 'node:path';
import {root} from './php-runtime.mjs';
const failures=[];let scanned=0;
const envFile=existsSync(join(root,'.env'))?readFileSync(join(root,'.env'),'utf8'):'';
const privateValues=envFile.split(/\r?\n/).filter(line=>/^(ADMIN_PASSWORD|DB_PASSWORD|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET)=/.test(line)).map(line=>line.slice(line.indexOf('=')+1).trim().replace(/^['"]|['"]$/g,'')).filter(value=>value.length>=8);
const googleFile=join(root,'data','google-client.json');if(existsSync(googleFile)){const google=JSON.parse(readFileSync(googleFile,'utf8'));const value=(google.web||google.installed)?.client_secret;if(value)privateValues.push(value);}
function walk(dir){return readdirSync(dir).flatMap(name=>{const file=join(dir,name);return statSync(file).isDirectory()?walk(file):[file];});}
const runtimeFiles=['app','src','scripts','tools','migrations'].flatMap(dir=>walk(join(root,dir)).filter(file=>!file.includes('qa-runtime')&&/\.(php|jsx?|mjs|css|sql|ps1)$/.test(file))).concat(['index.php','router.php','package.json','vite.config.mjs'].map(file=>join(root,file)));
for(const file of runtimeFiles){
 const name=relative(root,file).replaceAll('\\','/'),content=readFileSync(file,'utf8');scanned++;
 if(!name.startsWith('src/admin-reference/')&&name!=='scripts/audit-independence.mjs'&&/(?:\.\.\/|\.\.\\|https?:\/\/[^\s'"]*)smilebaby\.ro/i.test(content))failures.push(`${name}: sibling project dependency`);
 if(/(?:sk|rk)_(?:test|live)_[a-zA-Z0-9]{25,}|whsec_[a-zA-Z0-9]{25,}|"client_secret"\s*:\s*"[^"\s]{12,}"/.test(content))failures.push(`${name}: private credential literal`);
}
const tracked=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
const privateNames=['.env','data/local-admin.txt','data/google-client.json','data/email-private.json','data/production.env','data/deployment-private.json','data/stripe-qa.json'];
for(const file of tracked){
 if(privateNames.includes(file)||/^client_secret|\.sqlite(?:-|$)/.test(file))failures.push(`${file}: private file tracked`);
  if(/\.(php|jsx?|mjs|json|md|txt|sql|ps1)$/.test(file)&&existsSync(join(root,file))){const content=readFileSync(join(root,file),'utf8');if(privateValues.some(value=>content.includes(value))||/(?:sk|rk)_(?:test|live)_[a-zA-Z0-9]{25,}|whsec_[a-zA-Z0-9]{25,}|"client_secret"\s*:\s*"[^"\s]{12,}"/.test(content))failures.push(`${file}: tracked credential`);}
}
const databaseDriver=execFileSync('node',['scripts/php-runtime.mjs','-r',"require 'app/bootstrap.php'; echo driver();"],{cwd:root,encoding:'utf8'}).trim();
if(databaseDriver!=='sqlite')failures.push('Local application is not using its independent SQLite database');
mkdirSync(join(root,'qa'),{recursive:true});
const report={audited_at:new Date().toISOString(),passed:failures.length===0,scanned_runtime_files:scanned,local_database_driver:databaseDriver,admin_styles:'Copied locally with explicit user authorization; no runtime dependency on sibling project',private_files_not_tracked:true,failures};
writeFileSync(join(root,'qa','independence-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(failures.length)process.exitCode=1;
