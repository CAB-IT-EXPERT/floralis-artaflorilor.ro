import {execFileSync,spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=dirname(dirname(fileURLToPath(import.meta.url)));
export function phpCommand(){
 const binary=execFileSync('php',['-r','echo PHP_BINARY;'],{encoding:'utf8'}).trim();
 const loaded=execFileSync(binary,['-m'],{encoding:'utf8'}).toLowerCase();
 const args=[];
 if(process.platform==='win32'){
  const ext=join(dirname(binary),'ext');args.push('-d',`extension_dir=${ext}`);
  for(const name of ['pdo_sqlite','pdo_mysql','gd','mbstring','curl','openssl'])if(!loaded.split(/\r?\n/).includes(name)&&existsSync(join(ext,`php_${name}.dll`)))args.push('-d',`extension=${name}`);
 }
 return {binary,args};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const p=phpCommand();const args=process.argv.slice(2);
 const child=spawn(p.binary,[...p.args,...(args[0]==='serve'?['-S','127.0.0.1:5173','router.php']:args)],{cwd:root,stdio:'inherit'});
 child.on('exit',code=>process.exit(code??1));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
}
