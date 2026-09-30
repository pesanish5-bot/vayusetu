import {readFile} from 'node:fs/promises';
import {timingSafeEqual,randomUUID} from 'node:crypto';
import {get,put,list} from '@vercel/blob';
const cities=new Set(['bengaluru','delhi','mumbai','hyderabad']);
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
function authorized(request){
 const expected=Buffer.from('Basic '+Buffer.from(`${process.env.PRANA_USER}:${process.env.PRANA_PASSWORD}`).toString('base64'));
 const actual=Buffer.from(request.headers.get('authorization')||'');
 return Boolean(process.env.PRANA_PASSWORD)&&actual.length===expected.length&&timingSafeEqual(actual,expected);
}
async function read(path){const result=await get(path,{access:'private',useCache:false});return result?{data:await new Response(result.stream).json(),etag:result.blob.etag}:null;}
const write=(path,data,extra={})=>put(path,JSON.stringify(data),{access:'private',addRandomSuffix:false,contentType:'application/json',...extra});
export default {async fetch(request){
 const url=new URL(request.url),path='/'+(url.searchParams.get('path')||'').replace(/^\/+/,''),loggedIn=authorized(request);
 if(path==='/operator'&&!loggedIn)return new Response('Operator login required',{status:401,headers:{'www-authenticate':'Basic realm="PRANA operator", charset="UTF-8"','cache-control':'no-store'}});
 if(path.startsWith('/api/')&&!loggedIn)return json({error:'Operator login required. Open Operator login before accessing saved records.'},401);
 try{
  if(!path.startsWith('/api/')){
   if(!['/','/operator','/features.js','/presentation.pptx'].includes(path))return new Response('Not found',{status:404});
   const name=path==='/features.js'?'features.js':path==='/presentation.pptx'?'presentation.pptx':'index.html';
   let data=await readFile(new URL('./assets/'+name,import.meta.url));
   if(name==='index.html')data=Buffer.from(data.toString().replace('</body>','<a href="/operator" style="position:fixed;bottom:18px;left:18px;z-index:9999;background:#113347;color:white;padding:10px 16px;border-radius:12px;font:14px system-ui">Operator login</a></body>'));
   if(name==='features.js')data=Buffer.from(data.toString().replaceAll('this private Site','protected operator storage').replaceAll('this Site','protected storage').replaceAll('Storage unavailable · retry to reconnect','Operator login required or storage unavailable'));
   return new Response(data,{headers:{'content-type':name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'text/javascript; charset=utf-8':'application/vnd.openxmlformats-officedocument.presentationml.presentation','cache-control':'no-store','x-content-type-options':'nosniff'}});
  }
  if(request.method!=='GET'&&request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return json({error:'Cross-origin writes are not allowed'},403);
  if(path==='/api/records'&&request.method==='GET'){
   const city=url.searchParams.get('city');if(!cities.has(city))return json({error:'Unknown city'},400);
   const result=await list({prefix:`prana/records/${city}/`,limit:100});
   const records=await Promise.all(result.blobs.map(async b=>(await read(b.pathname))?.data));
   return json({records:records.filter(Boolean).sort((a,b)=>b.created.localeCompare(a.created))});
  }
  if(path==='/api/records'&&request.method==='POST'){
   const raw=await request.text();if(raw.length>210000)return json({error:'Record too large'},413);
   const body=JSON.parse(raw);
   if(!cities.has(body.city)||!['report','incident','sensor','feedback'].includes(body.kind)||!body.payload||typeof body.payload!=='object'||Array.isArray(body.payload))return json({error:'Invalid record'},400);
   if(JSON.stringify(body.payload).length>200000)return json({error:'Record too large'},413);
   if(body.kind==='report'&&(typeof body.payload.description!=='string'||body.payload.description.trim().length<3||body.payload.description.length>3000||typeof body.payload.location!=='string'||!body.payload.location.trim()||body.payload.location.length>200))return json({error:'Location and description are required'},400);
   const row={id:randomUUID(),created:new Date().toISOString(),kind:body.kind,city:body.city,payload:body.payload,stage:0};
   const pathname=`prana/records/${row.city}/${String(9999999999999-Date.now()).padStart(13,'0')}-${row.id}.json`;
   await write(pathname,row);await write(`prana/index/${row.id}.json`,{pathname});return json(row,201);
  }
  const stage=path.match(/^\/api\/records\/([\w-]{36})\/stage$/);
  if(stage&&request.method==='PATCH'){
   const body=await request.json();if(!Number.isInteger(body.stage)||body.stage<0||body.stage>5)return json({error:'Invalid response stage'},400);
   const index=await read(`prana/index/${stage[1]}.json`),record=index&&await read(index.data.pathname);
   if(!record||record.data.kind!=='incident')return json({error:'Incident not found'},404);
   await write(index.data.pathname,{...record.data,stage:body.stage},{allowOverwrite:true,ifMatch:record.etag});return json({stage:body.stage});
  }
  if(path==='/api/photos'&&request.method==='POST'){
   const type=request.headers.get('content-type');if(!['image/jpeg','image/png','image/webp'].includes(type))return json({error:'Use JPEG, PNG or WebP'},400);
   if(Number(request.headers.get('content-length')||0)>3000000)return json({error:'Photo exceeds 3 MB'},413);
   const bytes=await request.arrayBuffer();if(!bytes.byteLength||bytes.byteLength>3000000)return json({error:'Photo must be between 1 byte and 3 MB'},413);
   const id=randomUUID();await put(`prana/photos/${id}`,bytes,{access:'private',addRandomSuffix:false,contentType:type});return json({url:'/api/photos/'+id},201);
  }
  const photo=path.match(/^\/api\/photos\/([\w-]{36})$/);
  if(photo&&request.method==='GET'){
   const result=await get('prana/photos/'+photo[1],{access:'private',useCache:false});if(!result)return json({error:'Photo not found'},404);
   return new Response(result.stream,{headers:{'content-type':result.blob.contentType,'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
  }
  return json({error:'Not found'},404);
 }catch(error){console.error('Storage failure',error.name);return json({error:'Unable to complete request. Please retry; your input has been preserved.'},503);}
}};
