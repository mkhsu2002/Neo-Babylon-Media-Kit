(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const labels = {characters:'角色', scenes:'場景', mecha:'機甲'};
  const catalog = Array.isArray(window.MEDIA_CATALOG?.images) ? window.MEDIA_CATALOG.images : [];
  const normalize = text => String(text || '').normalize('NFKC').toLocaleLowerCase();
  const escape = text => String(text ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const url = path => path.split('/').map(encodeURIComponent).join('/');
  const size = bytes => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
  let category = 'all', visible = [], current = 0;
  const searchIndex = new Map(catalog.map(image => [image.path, normalize([image.name, image.name_en, image.name_jp, image.id, image.description, image.source, image.stype, image.path, ...(image.keywords || [])].join(' '))]));

  function render() {
    const terms = normalize($('search').value).trim().split(/\s+/).filter(Boolean);
    const matches = catalog.filter(image => terms.every(term => searchIndex.get(image.path).includes(term)));
    document.querySelectorAll('[data-category]').forEach(button => {
      const type = button.dataset.category;
      button.setAttribute('aria-pressed', String(type === category));
      button.querySelector('span').textContent = type === 'all' ? matches.length : matches.filter(image => image.category === type).length;
    });
    visible = matches.filter(image => category === 'all' || image.category === category);
    if ($('sort').value === 'name') visible.sort((a,b) => a.name.localeCompare(b.name, 'zh-Hant') || a.filename.localeCompare(b.filename));
    $('clear-search').hidden = !terms.length;
    $('result-count').textContent = `顯示 ${visible.length} / ${catalog.length} 張圖片${category === 'all' ? '' : ` · ${labels[category]}`}`;
    $('grid').innerHTML = visible.map((image,index) => `<article class="card"><button type="button" class="thumb" data-preview="${index}" aria-label="放大檢視 ${escape(image.name)}：${escape(image.filename)}"><img src="${url(image.thumbnail)}" alt="${escape(image.name)} · ${escape(image.filename)}" width="640" height="480" loading="lazy" decoding="async"><span class="category">${labels[image.category]}</span><span class="expand" aria-hidden="true">↗</span></button><div class="card-info"><div class="card-meta"><span>${escape(image.id)}</span><span>${image.width} × ${image.height}</span></div><h3>${escape(image.name)}${image.stype ? `<span class="stype">${escape(image.stype)}</span>` : ''}</h3><p class="variant" title="${escape(image.filename)}">${escape(image.filename)}</p><div class="card-actions"><button type="button" data-preview="${index}">放大預覽 ↗</button><a href="${url(image.path)}" download="${escape(image.filename)}" aria-label="下載 ${escape(image.name)} ${escape(image.filename)} 原圖">下載原圖 ↓</a></div></div></article>`).join('');
    $('empty').hidden = visible.length > 0;
    if (!catalog.length) {
      $('empty-title').textContent = window.MEDIA_CATALOG ? '公開素材準備中' : '素材清單暫時無法載入';
      $('empty-description').textContent = window.MEDIA_CATALOG ? '目前沒有可供展示與下載的圖片。請稍後再回來，或前往 GitHub 查看素材包狀態。' : '請重新整理網頁，或前往 GitHub 查看素材包。';
      $('reset').hidden = true;
    }
    $('grid').querySelectorAll('img').forEach(image => image.addEventListener('error', () => {
      image.hidden = true;
      const message = document.createElement('span'); message.className = 'image-unavailable'; message.textContent = '縮圖暫時無法載入';
      image.after(message);
    }, {once:true}));
  }
  function showPreview(index) {
    if (!visible.length) return;
    current = (index + visible.length) % visible.length;
    const image = visible[current];
    $('preview-image').hidden = false; $('preview-error').hidden = true;
    $('preview-image').src = url(image.path);
    $('preview-image').alt = `${image.name} · ${image.filename}`;
    $('preview-title').textContent = image.name;
    $('preview-category').textContent = `${labels[image.category]}${image.stype ? ` · ${image.stype}` : ''} / VISUAL REFERENCE`;
    $('preview-translation').textContent = [image.name_en, image.name_jp].filter(Boolean).join(' · ');
    $('preview-description').textContent = image.description || '公開視覺參考圖。使用時請遵守素材包 README 與官方開放創作規範。';
    $('preview-id').textContent = image.id;
    $('preview-source').textContent = image.source || '新巴比倫官方公開素材包';
    $('preview-meta').textContent = `${image.width} × ${image.height} · ${image.format.toUpperCase()} · ${size(image.bytes)}`;
    $('preview-filename').textContent = image.filename;
    $('download').href = url(image.path); $('download').download = image.filename;
    $('preview-position').textContent = `${current + 1} / ${visible.length}`;
    $('previous').disabled = $('next').disabled = visible.length < 2;
    if (!$('preview').open) { $('preview').showModal(); document.body.classList.add('preview-open'); }
  }
  document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {category = button.dataset.category; render();}));
  $('search').addEventListener('input', render);
  $('sort').addEventListener('change', render);
  $('clear-search').addEventListener('click', () => { $('search').value = ''; render(); $('search').focus(); });
  $('reset').addEventListener('click', () => { category = 'all'; $('search').value = ''; $('sort').value = 'default'; render(); $('search').focus(); });
  $('grid').addEventListener('click', event => { const button = event.target.closest('[data-preview]'); if (button) showPreview(Number(button.dataset.preview)); });
  $('close-preview').addEventListener('click', () => $('preview').close());
  $('preview').addEventListener('click', event => { if (event.target === $('preview')) { const rect = $('preview').getBoundingClientRect(); if(event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('preview').close(); } });
  $('preview').addEventListener('close', () => document.body.classList.remove('preview-open'));
  $('preview').addEventListener('keydown', event => { if(event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); showPreview(current + (event.key === 'ArrowLeft' ? -1 : 1)); } });
  $('previous').addEventListener('click', () => showPreview(current - 1));
  $('next').addEventListener('click', () => showPreview(current + 1));
  $('preview-image').addEventListener('error', () => { $('preview-image').hidden = true; $('preview-error').hidden = false; });
  $('total-count').textContent = catalog.length;
  const hero = catalog.find(image => image.filename.includes('NANFANGAO_DAWN')) || catalog.find(image => image.category === 'scenes');
  if (hero) { $('hero-image').src = url(hero.thumbnail); $('hero-image').alt = `${hero.name}，官方公開場景視覺參考`; $('hero-caption').textContent = `${hero.id} · ${hero.name}`; $('hero-visual').hidden = false; }
  render();
})();
