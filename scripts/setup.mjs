import {existsSync,writeFileSync,mkdirSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
mkdirSync('data',{recursive:true});
if(!existsSync('.env')){
 const password=randomBytes(18).toString('base64url');
 writeFileSync('.env',`HOST=127.0.0.1\nPORT=5173\nAPP_URL=http://localhost:5173\nDATABASE_PATH=./data/floralis_local.sqlite\nADMIN_EMAIL=admin@floralis.local\nADMIN_PASSWORD=${password}\n`);
 writeFileSync('data/local-admin.txt',`Floralis local development\nEmail: admin@floralis.local\nPassword: ${password}\n`);
 console.log('Local environment and independent development admin credentials created. See data/local-admin.txt.');
} else console.log('Existing Floralis environment preserved.');
