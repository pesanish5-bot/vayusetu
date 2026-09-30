// Temporary repository credentials are accepted only on stdin, never written to disk.
import { spawnSync } from 'node:child_process';
let input='';for await(const chunk of process.stdin)input+=chunk;
const credential=JSON.parse(input);
if(!credential.token||!credential.remote_url||!credential.branch)throw new Error('Missing source credential');
const env={...process.env,GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'http.extraHeader',GIT_CONFIG_VALUE_0:'Authorization: Basic '+Buffer.from('oauth2:'+credential.token).toString('base64')};
const result=spawnSync('git',['push',credential.remote_url,'HEAD:'+credential.branch],{env,encoding:'utf8'});
if(result.status!==0)throw new Error('Source push failed');
console.log(spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim());
