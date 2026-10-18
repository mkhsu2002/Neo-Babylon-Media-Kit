import {readdir, readFile, lstat} from 'node:fs/promises';
import path from 'node:path';
export const categories = ['characters', 'scenes', 'mecha'];
export const supported = /\.(jpe?g|png|webp|avif|gif)$/i;
// A file or any parent folder carrying one of these markers is never published.
export const blocked = /CANDIDATE|NEEDS[_ -]?GEOGRAPHY[_ -]?FIX|UNAPPROVED|PENDING|REJECTED|DRAFT|PRIVATE|NEEDS[_ -]?REVIEW|待審|未核准|需修正|私人/i;
export function isPublicImage(relativePath) {
  const parts = relativePath.replaceAll('\\', '/').split('/');
  return parts[0] === 'assets' && categories.includes(parts[1]) && parts.length >= 3 && !parts.some(part => part.startsWith('.') || part === '..') && supported.test(relativePath) && !blocked.test(relativePath);
}
async function walk(root, relative) {
  const entries = await readdir(path.join(root, relative), {withFileTypes:true}).catch(error => {if(error.code === 'ENOENT') return []; throw error;});
  const result = [];
  for(const entry of entries.sort((a,b) => a.name.localeCompare(b.name, 'en'))) {
    if(entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
    const child = `${relative}/${entry.name}`;
    if(blocked.test(child)) continue;
    if(entry.isDirectory()) result.push(...await walk(root, child));
    else if(entry.isFile() && isPublicImage(child)) result.push(child);
  }
  return result;
}
export async function collectImages(root) {
  const images = [];
  for(const category of categories) {
    const file = path.join(root, 'data', `${category}.json`);
    let records = [];
    try { records = JSON.parse(await readFile(file, 'utf8')); } catch(error) {if(error.code !== 'ENOENT') throw error;}
    if(!Array.isArray(records)) throw new Error(`${category}.json must contain an array`);
    for(const relativePath of await walk(root, `assets/${category}`)) {
      // Check the real file as well: publication never follows symbolic links.
      const parentParts = relativePath.split('/');
      for(let i = 1; i <= parentParts.length; i++) if((await lstat(path.join(root, ...parentParts.slice(0,i)))).isSymbolicLink()) throw new Error(`Symlink refused: ${relativePath}`);
      const filename = path.posix.basename(relativePath);
      const folder = path.posix.basename(path.posix.dirname(relativePath));
      const record = records.find(item => item.images?.includes(relativePath)) || records.find(item => item.id === folder) || {};
      if(record.status && !['approved', 'published', 'public'].includes(String(record.status).toLowerCase())) continue;
      const stem = filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      images.push({path:relativePath, filename, category, id:record.id || (folder === category ? filename.replace(/\.[^.]+$/, '') : folder), name:record.name_zh || stem, name_en:record.name_en || '', name_jp:record.name_jp || '', description:record.desc || '', source:record.source || '', stype:record.stype || '', keywords:Array.isArray(record.keywords) ? record.keywords : []});
    }
  }
  return images;
}
