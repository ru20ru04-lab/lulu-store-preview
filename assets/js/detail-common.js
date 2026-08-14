/* 商品詳細ページ共通モジュール
 * - 商品ロード → media / info を DOM に反映
 * - ライトボックス（拡大表示）
 * - 写真一覧モーダル（グリッド）
 * variant 側は init({ onReady(product, images) }) で受け取り、sticky/scroll 挙動を実装
 */
(function () {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  async function init(opts) {
    opts = opts || {};
    const media = document.getElementById('media');
    const info = document.getElementById('info');
    const crumb = document.getElementById('crumb-name');
    try {
      const products = await LuLu.loadProducts();
      const p = id ? products.find(function (x) { return x.id === id; }) : null;
      if (!p) {
        renderNotFound(media, info, crumb);
        return;
      }

      document.title = p.name + ' — LuLu';
      if (crumb) crumb.textContent = p.name;

      const images = (p.images || []).map(function (s) { return LuLu.assetPath(s); });

      renderMedia(media, images, p.name);
      renderPhotoStatus(images);
      renderInfo(info, p, images);
      initLightbox(images, p.name);
      initGridView(images, p.name);

      if (opts.onReady) opts.onReady(p, images);
    } catch (e) {
      renderNotFound(media, info, crumb, e.message);
    }
  }

  function renderNotFound(media, info, crumb, msg) {
    document.title = '商品が見つかりません — LuLu';
    if (crumb) crumb.textContent = '商品が見つかりません';
    if (media) media.innerHTML = '';
    // 写真スロットも詰める（sticky の高さが空でも大きく残らないように）
    const slot = document.getElementById('photo-slot');
    if (slot) slot.style.display = 'none';
    info.innerHTML =
      '<div class="detail-notfound">' +
        '<h1 class="detail-notfound__title">お探しの商品が見つかりませんでした</h1>' +
        '<p class="detail-notfound__desc">URL が間違っているか、公開が終了した商品の可能性があります。' +
          (msg ? '<br><small>(' + esc(msg) + ')</small>' : '') +
        '</p>' +
        '<p><a class="link-button link-button--wide" href="' + (window.SITE_ROOT || '../') + 'products/index.html">商品一覧に戻る</a></p>' +
      '</div>';
  }

  // 写真エリアにドット＋カウンター（mediaコンテナの scroll に追従）
  function renderPhotoStatus(images) {
    const slot = document.getElementById('photo-slot');
    const media = document.getElementById('media');
    if (!slot || !media || !images.length) return;

    if (images.length === 1) {
      slot.classList.add('detail-photo-slot--single');
      return;
    }

    const status = document.createElement('div');
    status.className = 'detail-photo-status';
    status.innerHTML =
      '<div class="detail-photo-dots">' +
        images.map(function (_, i) { return '<span class="detail-photo-dot" data-dot="' + i + '"></span>'; }).join('') +
      '</div>' +
      '<span class="detail-photo-counter"><span data-cur>1</span> / ' + images.length + '</span>';
    slot.appendChild(status);

    const dots = status.querySelectorAll('.detail-photo-dot');
    const cur = status.querySelector('[data-cur]');

    function updateFromScroll() {
      const w = media.clientWidth;
      if (!w) return;
      // カルーセルの中央付近にある写真を「現在」とみなす
      const centerX = media.scrollLeft + w / 2;
      const frames = media.querySelectorAll('.product-media__frame');
      let best = 0, bestDist = Infinity;
      frames.forEach(function (fr, i) {
        const fx = fr.offsetLeft + fr.offsetWidth / 2;
        const d = Math.abs(fx - centerX);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      cur.textContent = String(best + 1);
      dots.forEach(function (d, i) {
        d.classList.toggle('detail-photo-dot--active', i === best);
      });
    }
    updateFromScroll();
    dots[0].classList.add('detail-photo-dot--active');

    let raf = 0;
    media.addEventListener('scroll', function () {
      if (!raf) raf = requestAnimationFrame(function () { raf = 0; updateFromScroll(); });
    }, { passive: true });
  }

  function renderMedia(el, images, alt) {
    el.innerHTML = images.map(function (src, i) {
      return (
        '<button class="product-media__frame" type="button" data-lightbox-index="' + i + '" aria-label="写真 ' + (i + 1) + ' を拡大">' +
          '<img src="' + src + '" alt="' + esc(alt) + '" loading="lazy">' +
        '</button>'
      );
    }).join('');
  }

  function renderInfo(el, p, images) {
    const catLabel = LuLu.categoryLabels[p.category] || p.category || '—';
    const meta =
      '<div class="product-meta">' +
        '<dl>' +
          '<dt>カテゴリ</dt><dd>' + esc(catLabel) + '</dd>' +
          '<dt>サイズ</dt><dd>' + esc(p.size || '—') + '</dd>' +
          '<dt>素材</dt><dd>' + esc(p.material || '—') + '</dd>' +
        '</dl>' +
      '</div>';

    const m = p.measurements || {};
    const rows = Object.keys(m).map(function (k) {
      const label = LuLu.measurementLabels[k] || k;
      return (
        '<tr>' +
          '<th scope="row">' + esc(label) + '</th>' +
          '<td>' + esc(m[k]) + '<span class="measurements__unit">cm</span></td>' +
        '</tr>'
      );
    }).join('');
    const measurements = rows
      ? '<div class="measurements">' +
          '<p class="measurements__title">採寸 (cm)</p>' +
          '<table class="measurements__table"><tbody>' + rows + '</tbody></table>' +
        '</div>'
      : '';

    const soldMark = p.sold ? '<span class="product-info__sold">Sold</span>' : '';
    const button = p.sold
      ? '<button class="buy-button" type="button" aria-disabled="true" disabled>Sold Out</button>'
      : '<button class="buy-button" type="button">購入する</button>';
    const gridLink = images.length > 1
      ? '<button class="photo-list-btn" type="button" id="open-grid">写真すべて見る（' + images.length + '枚）</button>'
      : '';

    const cleanNote =
      '<p class="detail-clean-note">クリーニング済みでお届けします。</p>';

    el.innerHTML =
      soldMark +
      '<h1 class="product-info__name">' + esc(p.name) + '</h1>' +
      '<p class="product-info__price">' + LuLu.formatPrice(p.price) + '</p>' +
      cleanNote +
      '<p class="product-info__desc">' + esc(p.description || '') + '</p>' +
      gridLink +
      meta +
      measurements +
      button;
  }

  function initLightbox(images, alt) {
    if (!images.length) return;
    const single = images.length === 1;
    const root = document.createElement('div');
    root.className = 'lightbox' + (single ? ' lightbox--single' : '');
    root.setAttribute('aria-hidden', 'true');
    const dotsHtml = single ? '' :
      '<div class="lightbox__dots">' +
        images.map(function (_, i) { return '<span class="lightbox__dot" data-dot="' + i + '"></span>'; }).join('') +
      '</div>';
    const iconClose = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>';
    const iconPrev  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 L7 12 L15 20"/></svg>';
    const iconNext  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 L17 12 L9 20"/></svg>';
    root.innerHTML =
      '<button class="lightbox__close" type="button" aria-label="閉じる">' + iconClose + '</button>' +
      '<button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="前の写真">' + iconPrev + '</button>' +
      '<button class="lightbox__nav lightbox__nav--next" type="button" aria-label="次の写真">' + iconNext + '</button>' +
      '<div class="lightbox__stage"><img class="lightbox__img" alt=""></div>' +
      dotsHtml +
      '<div class="lightbox__counter">1 / ' + images.length + '</div>';
    document.body.appendChild(root);
    const img = root.querySelector('.lightbox__img');
    const counter = root.querySelector('.lightbox__counter');
    const dots = single ? [] : Array.prototype.slice.call(root.querySelectorAll('.lightbox__dot'));
    let idx = 0;
    function show(i) {
      idx = ((i % images.length) + images.length) % images.length;
      img.src = images[idx];
      img.alt = alt + ' 写真 ' + (idx + 1);
      counter.textContent = (idx + 1) + ' / ' + images.length;
      dots.forEach(function (d, j) {
        d.classList.toggle('lightbox__dot--active', j === idx);
      });
    }
    function open(i) {
      show(i || 0);
      root.classList.add('lightbox--open');
      root.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', onKey);
    }
    function close() {
      root.classList.remove('lightbox--open');
      root.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
    }
    root.querySelector('.lightbox__close').addEventListener('click', close);
    root.querySelector('.lightbox__nav--prev').addEventListener('click', function (e) { e.stopPropagation(); show(idx - 1); });
    root.querySelector('.lightbox__nav--next').addEventListener('click', function (e) { e.stopPropagation(); show(idx + 1); });
    // 背景タップで閉じる（写真自体・ボタン以外の余白をタップした時）
    root.addEventListener('click', function (e) {
      if (e.target === root || e.target.classList.contains('lightbox__stage')) close();
    });

    // タッチスワイプで前後の写真へ
    if (!single) {
      const stage = root.querySelector('.lightbox__stage');
      let startX = 0, startY = 0, tracking = false;
      stage.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        tracking = true;
      }, { passive: true });
      stage.addEventListener('touchend', function (e) {
        if (!tracking) return;
        tracking = false;
        const t = e.changedTouches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          if (dx < 0) show(idx + 1); else show(idx - 1);
        }
      }, { passive: true });
    }

    // 委譲：任意の [data-lightbox-index] クリックで拡大
    document.addEventListener('click', function (e) {
      const t = e.target.closest('[data-lightbox-index]');
      if (t) {
        e.preventDefault();
        // 写真一覧が開いていたら閉じる
        if (window.LuLuPhotoGrid && window.LuLuPhotoGrid.isOpen()) {
          window.LuLuPhotoGrid.close();
        }
        open(parseInt(t.getAttribute('data-lightbox-index'), 10) || 0);
      }
    });

    window.LuLuLightbox = { open: open, close: close };
  }

  function initGridView(images, alt) {
    const root = document.createElement('div');
    root.className = 'photo-grid';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML =
      '<button class="photo-grid__close" type="button" aria-label="閉じる">×</button>' +
      '<h2 class="photo-grid__title">写真すべて</h2>' +
      '<div class="photo-grid__inner">' +
        images.map(function (src, i) {
          return (
            '<button class="photo-grid__thumb" type="button" data-lightbox-index="' + i + '" aria-label="写真 ' + (i + 1) + ' を拡大">' +
              '<img src="' + src + '" alt="' + esc(alt) + ' 写真 ' + (i + 1) + '">' +
            '</button>'
          );
        }).join('') +
      '</div>';
    document.body.appendChild(root);
    let isOpen = false;
    function open() {
      isOpen = true;
      root.classList.add('photo-grid--open');
      root.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      isOpen = false;
      root.classList.remove('photo-grid--open');
      root.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'open-grid') open();
    });
    root.querySelector('.photo-grid__close').addEventListener('click', close);
    window.LuLuPhotoGrid = { open: open, close: close, isOpen: function () { return isOpen; } };
  }

  window.LuLuDetail = { init: init };
})();
