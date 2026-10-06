import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {root} from './php-runtime.mjs';
const file=join(root,'.env');const env=Object.fromEntries(readFileSync(file,'utf8').split(/\r?\n/).filter(x=>x.includes('=')&&!x.startsWith('#')).map(x=>{const n=x.indexOf('=');return [x.slice(0,n),x.slice(n+1)];}));
const exe=join(root,'node_modules','@stripe','cli','bin','shim.js');
const child=spawn(process.execPath,[exe,'listen','--api-key',env.STRIPE_SECRET_KEY,'--forward-to','http://localhost:5173/api/payments/stripe/webhook','--events','checkout.session.completed,checkout.session.expired,checkout.session.async_payment_succeeded'],{cwd:root,stdio:['ignore','pipe','pipe']});
let configured=false;
function log(buffer){const s=buffer.toString();const secret=s.match(/whsec_[a-zA-Z0-9]+/);if(secret&&!configured){let body=readFileSync(file,'utf8');body=body.replace(/^STRIPE_WEBHOOK_SECRET=.*$/m,`STRIPE_WEBHOOK_SECRET=${secret[0]}`);writeFileSync(file,body);configured=true;console.log('Stripe test listener active. Signing secret saved privately in .env.');}else if(configured)console.log(s.replace(/(?:whsec|sk_test|pk_test)_[a-zA-Z0-9]+/g,'[secret]').trim());}
child.stdout.on('data',log);child.stderr.on('data',log);child.on('exit',code=>process.exit(code??1));for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>child.kill(sig));
