import {mkdir, readFile, writeFile, copyFile, rm, cp} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {collectImages} from './catalog.mjs';
export async function build({root = process.cwd(), output = path.join(root, 'dist')} = {}) {
  if(path.resolve(output) === path.resolve(root) || !path.resolve(output).startsWith(path.resolve(root) + path.sep)) throw new Error('Build output must be a subdirectory of the project');
  const images = await collectImages(root);
  await rm(output, {recursive:true, force:true});
  await mkdir(path.join(output, 'data'), {recursive:true});
  await mkdir(path.join(output, 'thumbnails'), {recursive:true});
  for(const file of ['index.html','favicon.svg']) await copyFile(path.join(root,file), path.join(output,file));
  await cp(path.join(root,'site'), path.join(output,'site'), {recursive:true, filter:source => !path.basename(source).startsWith('.')});
  for(const image of images) {
    const source = path.join(root,image.path);
    const bytes = await readFile(source);
    const metadata = await sharp(bytes).metadata();
    if(!['jpeg','png','webp','avif','heif','gif'].includes(metadata.format)) throw new Error(`Unsupported actual image format: ${image.path}`);
    const extension = path.extname(image.path).slice(1).toLowerCase();
    const expected = {jpg:['jpeg'],jpeg:['jpeg'],png:['png'],webp:['webp'],gif:['gif'],avif:['heif','avif']}[extension];
    if(!expected?.includes(metadata.format) || (extension === 'avif' && metadata.compression && metadata.compression !== 'av1')) throw new Error(`Image extension/content mismatch: ${image.path}`);
    const digest = createHash('sha256').update(bytes).digest('hex');
    Object.assign(image, {width:metadata.autoOrient?.width || metadata.width, height:metadata.autoOrient?.height || metadata.height, format:metadata.format === 'heif' ? 'avif' : metadata.format, bytes:bytes.length, sha256:digest, thumbnail:`thumbnails/${digest}.webp`});
    await sharp(bytes).rotate().resize({width:960,height:720,fit:'inside',withoutEnlargement:true}).webp({quality:80}).toFile(path.join(output,image.thumbnail));
    await mkdir(path.dirname(path.join(output,image.path)), {recursive:true});
    await copyFile(source,path.join(output,image.path));
  }
  const catalog = {version:1, images};
  const json = JSON.stringify(catalog,null,2);
  await writeFile(path.join(output,'data/catalog.json'), json + '\n');
  await writeFile(path.join(output,'data/catalog.js'), 'window.MEDIA_CATALOG = ' + JSON.stringify(catalog).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029') + ';\n');
  await writeFile(path.join(output,'.nojekyll'),'');
  console.log(`Built ${images.length} public images: ${['characters','scenes','mecha'].map(c => `${c}=${images.filter(x=>x.category===c).length}`).join(', ')}`);
  return catalog;
}
if(process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
