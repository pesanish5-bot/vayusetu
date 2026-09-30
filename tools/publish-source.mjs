// Temporary repository credentials are accepted only on stdin, never written to disk.
import { spawnSync } from 'node:child_process';
if(process.stdin.isTTY)process.stdin.setRawMode(true);
process.stdin.setEncoding('utf8');
console.log('Ready for hidden source credential on stdin.');
let input=await new Promise(resolve=>{let data='';process.stdin.on('data',chunk=>{if(chunk.includes('\u0003'))process.exit(1);data+=chunk;const end=data.search(/[\r\n]/);if(end>=0){process.stdin.pause();resolve(data.slice(0,end));}});});
if(process.stdin.isTTY)process.stdin.setRawMode(false);
const credential=JSON.parse(input);
if(!credential.token||!credential.remote_url||!credential.branch)throw new Error('Missing source credential');
const env={...process.env,GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'http.extraHeader',GIT_CONFIG_VALUE_0:'Authorization: Basic '+Buffer.from('oauth2:'+credential.token).toString('base64')};
const result=spawnSync('git',['push',credential.remote_url,'HEAD:'+credential.branch],{env,encoding:'utf8'});
if(result.status!==0)throw new Error('Source push failed');
console.log(spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim());
