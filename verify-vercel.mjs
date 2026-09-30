import {readFile} from 'node:fs/promises';
import {list,del} from '@vercel/blob';
const base=process.argv[2],access=JSON.parse(await readFile('.sites-runtime/vercel-access.json'));
const headers={authorization:'Basic '+Buffer.from(access.username+':'+access.password).toString('base64'),'content-type':'application/json'};
async function check(path,options,expected){const response=await fetch(base+path,options);if(response.status!==expected)throw new Error(path+' returned '+response.status+' '+(await response.text()).slice(0,140));console.log(path+' '+expected);return response;}
await check('/',{},200);await check('/features.js',{},200);await check('/api/records?city=bengaluru',{},401);await check('/operator',{},401);
await check('/api/records?city=bengaluru',{headers},200);
const uploaded=await(await check('/api/photos',{method:'POST',headers:{...headers,'content-type':'image/png'},body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=','base64')},201)).json();
await check(uploaded.url,{},401);await check(uploaded.url,{headers},200);await del('prana/photos/'+uploaded.url.split('/').pop());
const row=await (await check('/api/records',{method:'POST',headers,body:JSON.stringify({city:'bengaluru',kind:'incident',payload:{source:'SYNTHETIC DEPLOYMENT TEST',signals:{pm:168,baseline:45,sigma:20,reports:true,satellite:true},reportCount:1}})},201)).json();
await check('/api/records/'+row.id+'/stage',{method:'PATCH',headers,body:JSON.stringify({stage:2})},200);
const records=await (await check('/api/records?city=bengaluru',{headers},200)).json();if(!records.records.some(r=>r.id===row.id&&r.stage===2))throw new Error('Stage did not persist');
const blobs=await list({prefix:'prana/records/bengaluru/'});const target=blobs.blobs.find(b=>b.pathname.endsWith('-'+row.id+'.json'));if(target)await del(target.url);await del('prana/index/'+row.id+'.json');console.log('Synthetic test incident cleaned up.');
