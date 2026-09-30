import { build } from 'esbuild';
import { mkdir, copyFile, cp } from 'node:fs/promises';
await mkdir('dist/server',{recursive:true});
await build({entryPoints:['server/worker.mjs'],bundle:true,format:'esm',platform:'browser',target:'es2022',plugins:[{name:'client-source',setup(b){b.onLoad({filter:/features\.js$/},async(args)=>({contents:await (await import('node:fs/promises')).readFile(args.path,'utf8'),loader:'text'}));}}],loader:{'.html':'text'},outfile:'dist/server/index.js'});
await mkdir('dist/.openai',{recursive:true});
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
await cp('drizzle','dist/.openai/drizzle',{recursive:true});
console.log('Worker built with dashboard and durable storage.');
