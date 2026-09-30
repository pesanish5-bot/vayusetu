import {mkdir,copyFile,writeFile} from 'node:fs/promises';
await mkdir('api/assets',{recursive:true});
await mkdir('vercel-public',{recursive:true});
await writeFile('vercel-public/ready.txt','PRANA-NET');
for(const file of ['index.html','features.js'])await copyFile('dist/'+file,'api/assets/'+file);
await copyFile('presentation.pptx','api/assets/presentation.pptx');
