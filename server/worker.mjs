import html from '../dist/index.html';
import features from '../dist/features.js';
const cities = new Set(['bengaluru','delhi','mumbai','hyderabad']);
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
function database(env){if(!env.DB)throw new Error('Storage is unavailable');return env.DB;}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/features.js')return new Response(features,{headers:{'content-type':'text/javascript; charset=utf-8'}});
    if(!url.pathname.startsWith('/api/'))return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','x-content-type-options':'nosniff'}});
    try{
      if(request.method!=='GET' && request.headers.get('origin') && request.headers.get('origin')!==url.origin)return json({error:'Cross-origin writes are not allowed'},403);
      if(url.pathname==='/api/records' && request.method==='GET'){
        const city=url.searchParams.get('city');if(!cities.has(city))return json({error:'Unknown city'},400);
        const rows=await database(env).prepare('SELECT id,kind,city,created,payload,stage FROM records WHERE city=? ORDER BY created DESC LIMIT 100').bind(city).all();
        return json({records:rows.results.map(row=>({...row,payload:JSON.parse(row.payload)}))});
      }
      if(url.pathname==='/api/records' && request.method==='POST'){
        if(Number(request.headers.get('content-length')||0)>250000)return json({error:'Record too large'},413);
        const body=await request.json();
        if(!cities.has(body.city)||!['report','incident','sensor','feedback'].includes(body.kind)||!body.payload||typeof body.payload!=='object')return json({error:'Invalid record'},400);
        const serialized=JSON.stringify(body.payload);if(serialized.length>200000)return json({error:'Record too large'},413);
        if(body.kind==='report' && (typeof body.payload.description!=='string'||body.payload.description.trim().length<3||body.payload.description.length>3000||typeof body.payload.location!=='string'||body.payload.location.length>200))return json({error:'Location and description are required'},400);
        const id=crypto.randomUUID(),created=new Date().toISOString();
        await database(env).prepare('INSERT INTO records (id,kind,city,created,payload,stage) VALUES (?,?,?,?,?,0)').bind(id,body.kind,body.city,created,serialized).run();
        return json({id,created,kind:body.kind,city:body.city,payload:body.payload,stage:0},201);
      }
      const stageMatch=url.pathname.match(/^\/api\/records\/([\w-]+)\/stage$/);
      if(stageMatch&&request.method==='PATCH'){
        const body=await request.json();if(!Number.isInteger(body.stage)||body.stage<0||body.stage>5)return json({error:'Invalid response stage'},400);
        const changed=await database(env).prepare("UPDATE records SET stage=? WHERE id=? AND kind='incident'").bind(body.stage,stageMatch[1]).run();
        if(!changed.meta.changes)return json({error:'Incident not found'},404);return json({stage:body.stage});
      }
      if(url.pathname==='/api/photos'&&request.method==='POST'){
        const type=request.headers.get('content-type');if(!['image/jpeg','image/png','image/webp'].includes(type))return json({error:'Use JPEG, PNG or WebP'},400);
        if(Number(request.headers.get('content-length')||0)>3000000)return json({error:'Photo exceeds 3 MB'},413);
        const bytes=await request.arrayBuffer();if(bytes.byteLength>3000000)return json({error:'Photo exceeds 3 MB'},413);
        const id=crypto.randomUUID();await env.BUCKET.put(id,bytes,{httpMetadata:{contentType:type}});return json({url:'/api/photos/'+id},201);
      }
      if(url.pathname.startsWith('/api/photos/')&&request.method==='GET'){
        const id=url.pathname.slice(12);if(!/^[\w-]{36}$/.test(id))return json({error:'Invalid photo'},400);
        const object=await env.BUCKET.get(id);if(!object)return json({error:'Photo not found'},404);
        return new Response(object.body,{headers:{'content-type':object.httpMetadata.contentType,'x-content-type-options':'nosniff','cache-control':'private, max-age=300'}});
      }
      return json({error:'Not found'},404);
    }catch(error){console.error('PRANA storage request failed',url.pathname,error.message);return json({error:'Unable to complete this request. Your input has been preserved; please retry.'},503);}
  }
};
