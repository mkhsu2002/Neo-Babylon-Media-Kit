import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const html = await readFile('index.html','utf8');
const app = await readFile('site/app.js','utf8');
const image = (overrides={}) => ({name:'陶比',name_en:'Toby',name_jp:'トビー',id:'NB-C001',category:'characters',description:'紅髮少年',path:'assets/characters/NB-C001/陶比_FRONT.jpg',filename:'陶比_FRONT.jpg',width:941,height:1672,bytes:200000,format:'jpeg',thumbnail:'thumbnails/test.webp',...overrides});
function setup(images=[]) {
  const dom=new JSDOM(html,{url:'https://example.com/Neo-Babylon-Media-Kit/',runScripts:'outside-only'});
  const {window}=dom;
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new window.Event('close'));};
  window.MEDIA_CATALOG={images};window.eval(app);
  const d=window.document;
  const input=value=>{d.getElementById('search').value=value;d.getElementById('search').dispatchEvent(new window.Event('input'));};
  return {window,d,input,close:()=>window.close()};
}
test('Chinese, English, Japanese, filename and ID search, categories, reset and empty results', t=>{
  const s=setup([image(),image({name:'中央研究院',category:'scenes',id:'SC-003',path:'assets/scenes/SC-003/入口.jpg',filename:'入口.jpg',name_en:'',name_jp:'',description:'失落叢林'})]);t.after(s.close);
  const count=()=>s.d.querySelectorAll('.card').length;
  assert.equal(count(),2);
  for(const term of ['陶比','ＴＯＢＹ','トビー','NB-C001 FRONT','紅髮']){s.input(term);assert.equal(count(),1,term);}
  s.d.querySelector('[data-category=scenes]').click();assert.equal(count(),0);
  assert.equal(s.d.getElementById('empty').hidden,false);
  s.d.getElementById('reset').click();assert.equal(count(),2);
  s.input('不存在');assert.equal(count(),0);
  s.d.getElementById('clear-search').click();assert.equal(count(),2);
});
test('preview contains exact original download, metadata, next/previous and keyboard controls', t=>{
  const s=setup([image(),image({name:'芸潔',path:'assets/characters/new/芸潔.jpg',filename:'芸潔.jpg'})]);t.after(s.close);
  s.d.querySelector('[data-preview="0"]').click();
  const dialog=s.d.getElementById('preview');assert.equal(dialog.open,true);
  assert.equal(s.d.getElementById('preview-title').textContent,'陶比');
  assert.equal(decodeURIComponent(new URL(s.d.getElementById('download').href).pathname),'/Neo-Babylon-Media-Kit/assets/characters/NB-C001/陶比_FRONT.jpg');
  assert.equal(s.d.getElementById('download').download,'陶比_FRONT.jpg');
  assert.match(s.d.getElementById('preview-meta').textContent,/941 × 1672/);
  s.d.getElementById('next').click();assert.equal(s.d.getElementById('preview-title').textContent,'芸潔');
  dialog.dispatchEvent(new s.window.KeyboardEvent('keydown',{key:'ArrowLeft'}));assert.equal(s.d.getElementById('preview-title').textContent,'陶比');
  s.d.getElementById('close-preview').click();assert.equal(dialog.open,false);
  assert.equal(s.d.body.classList.contains('preview-open'),false);
});
test('honest empty catalog and escaped untrusted filenames',t=>{
  const empty=setup();t.after(empty.close);assert.equal(empty.d.querySelectorAll('.card').length,0);assert.equal(empty.d.getElementById('empty-title').textContent,'公開素材準備中');
  const s=setup([image({name:'<script>bad</script>',filename:'a" onerror="bad.jpg'})]);t.after(s.close);
  assert.equal(s.d.querySelector('h3').textContent,'<script>bad</script>');
  assert.equal(s.d.querySelector('[onerror]'),null);
});
