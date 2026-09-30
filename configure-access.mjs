import {randomBytes} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const password=randomBytes(24).toString('base64url');
await mkdir('.sites-runtime',{recursive:true});
await writeFile('.sites-runtime/vercel-access.json',JSON.stringify({username:'prana',password}));
await writeFile('../presentation/output/Operator-Access.txt',`PRANA-NET private operator access\nUsername: prana\nPassword: ${password}\nOpen the deployed app's /operator page to sign in.\nKeep this file private. The dashboard is public; saved records and photos are protected.\n`);
for(const [name,value] of [['PRANA_USER','prana'],['PRANA_PASSWORD',password]]){
 const result=spawnSync('cmd.exe',['/c','npx --yes vercel@latest env add '+name+' production,preview --sensitive --yes'],{input:value,cwd:process.cwd(),encoding:'utf8'});
 if(result.status!==0)throw new Error('Unable to configure '+name+': '+result.stderr);
 console.log(name+' configured');
}
