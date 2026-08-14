/* ハンバーガーメニュー
 * - 全画面 (fullscreen) / サイドパネル (panel) の2モード
 * - デフォルトは fullscreen。?menu=panel で切替、または <html data-menu-mode="panel"> でサイト全体デフォルトを上書き可
 * - カテゴリは products.json から動的生成（0件は非表示）
 * - Esc で閉じる / 背景スクロール停止 / aria 属性同期
 *
 * 表示切替は CSS の visibility + opacity で行い、display の切替は使わない
 * （display 変化で CSS transition が発火しない問題を回避）。
 */
(function () {
  const root = window.SITE_ROOT || './';

  function resolveMode() {
    const params = new URLSearchParams(location.search);
    const q = params.get('menu');
    if (q === 'panel' || q === 'fullscreen') return q;
    const attr = document.documentElement.getAttribute('data-menu-mode');
    if (attr === 'panel' || attr === 'fullscreen') return attr;
    return 'fullscreen';
  }

  const mode = resolveMode();
  document.documentElement.setAttribute('data-menu-mode', mode);

  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('menu');
  if (!toggle || !menu) return;

  // hidden 属性は使わず、visibility ベース。初期は閉じた状態。
  if (menu.hasAttribute('hidden')) menu.removeAttribute('hidden');

  // メニュー内に閉じる（×）ボタンを注入
  // ヘッダーの menu-toggle はスタッキングコンテキストに埋まってタップが届かないため
  if (!menu.querySelector('.menu__close')) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'menu__close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'メニューを閉じる');
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>';
    menu.insertBefore(closeBtn, menu.firstChild);
    closeBtn.addEventListener('click', function () { closeMenu(); });
  }

  const catList = document.getElementById('menu-cats');

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  async function buildMenu() {
    if (catList && window.LuLu && typeof window.LuLu.loadProducts === 'function') {
      try {
        const products = await window.LuLu.loadProducts();
        const cats = window.LuLu.nonEmptyCategories(products);
        const items = [
          '<li><a class="menu__link" href="' + root + 'products/index.html">All</a></li>'
        ].concat(cats.map(function (c) {
          return '<li><a class="menu__link" href="' + root + 'products/index.html?category=' + encodeURIComponent(c.key) + '">' + esc(c.en) + '</a></li>';
        }));
        catList.innerHTML = items.join('');
      } catch (e) {
        catList.innerHTML = '<li><a class="menu__link" href="' + root + 'products/index.html">All</a></li>';
      }
    }
  }

  // scroll lock（背景固定）
  let scrollY = 0;
  function lockScroll() {
    scrollY = window.scrollY || 0;
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + scrollY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }
  function unlockScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, scrollY);
  }

  let isOpen = false;

  function openMenu() {
    if (isOpen) return;
    isOpen = true;
    menu.classList.add('menu--open');
    menu.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.classList.add('menu-toggle--open');
    toggle.setAttribute('aria-label', 'メニューを閉じる');
    lockScroll();
    document.addEventListener('keydown', onKey);
    // 開いた後、最初のリンクにフォーカス（transitionが少し進んでから）
    setTimeout(function () {
      const first = menu.querySelector('a');
      if (first && isOpen) first.focus();
    }, 220);
  }

  function closeMenu() {
    if (!isOpen) return;
    isOpen = false;
    menu.classList.remove('menu--open');
    menu.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.classList.remove('menu-toggle--open');
    toggle.setAttribute('aria-label', 'メニューを開く');
    unlockScroll();
    document.removeEventListener('keydown', onKey);
    toggle.focus();
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
    }
  }

  toggle.addEventListener('click', function () {
    if (isOpen) closeMenu(); else openMenu();
  });

  buildMenu();
})();
