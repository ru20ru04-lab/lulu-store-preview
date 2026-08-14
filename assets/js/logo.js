/* ロゴコンポーネント
 * 後日、手書きPNG画像へ差し替える予定のため、この1ファイルの変更で完結させる。
 * `data-lulu-logo` を持つ要素を対象に、文字組み or 画像タグを差し込む。
 *
 * 画像に差し替える場合：
 *   window.LULU_LOGO = { src: '/assets/images/logo.png', alt: 'LuLu' };
 * を、このスクリプトより前に定義するだけで切り替わる。
 */
(function () {
  const config = window.LULU_LOGO || null;
  const root = window.SITE_ROOT || './';

  function render(el) {
    const variant = el.dataset.luluLogo || 'header';
    const cls = variant === 'hero' ? 'logo logo--hero' : 'logo logo--header';

    if (config && config.src) {
      const src = String(config.src).replace(/^\//, '') || '';
      const img = document.createElement('img');
      img.src = root + src;
      img.alt = config.alt || 'LuLu';
      el.innerHTML = '';
      el.appendChild(img);
      el.classList.add(cls.split(' ')[0]);
    } else {
      el.innerHTML = '';
      const span = document.createElement('span');
      span.className = cls;
      span.textContent = 'LuLu';
      el.appendChild(span);
    }
  }

  function init() {
    document.querySelectorAll('[data-lulu-logo]').forEach(render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
