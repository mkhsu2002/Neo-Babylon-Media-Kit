import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.avif':'image/avif','.svg':'image/svg+xml'};
http.createServer(async (req,res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const prefix = '/Neo-Babylon-Media-Kit';
    if(pathname === prefix) {res.writeHead(302,{Location:prefix + '/'});res.end();return;}
    if(pathname.startsWith(prefix + '/')) pathname = pathname.slice(prefix.length);
    if(pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(root,'.' + pathname);
    if(!file.startsWith(root + path.sep) || !(await stat(file)).isFile()) throw new Error('Not found');
    res.writeHead(200,{'Content-Type':types[path.extname(file).toLowerCase()] || 'application/octet-stream','Cache-Control':'no-store'});
    res.end(await readFile(file));
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(4173,'127.0.0.1', () => console.log('Local: http://127.0.0.1:4173/Neo-Babylon-Media-Kit/'));
