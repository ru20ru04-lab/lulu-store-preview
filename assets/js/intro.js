/* オープニングアニメーション（Miu Miu 型）
 * - 初回訪問のみ再生（sessionStorage）
 * - prefers-reduced-motion 尊重
 * - 起動 → 巨大ロゴを一拍見せる → ヘッダーロゴ位置へ滑らかに縮小 → 背景フェード
 * - クリック / スクロール で即座に縮小遷移
 */
(function () {
  const STORAGE_KEY = 'lulu_intro_seen';
  const overlay = document.getElementById('intro-overlay');
  if (!overlay) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const alreadySeen = (function () {
    try { return sessionStorage.getItem(STORAGE_KEY) === '1'; }
    catch (_) { return true; }
  })();

  if (prefersReduced || alreadySeen) {
    overlay.classList.add('intro-overlay--gone');
    return;
  }

  const logoEl = overlay.querySelector('.intro-overlay__logo');
  const targetEl = document.querySelector('.site-header__logo');
  if (!logoEl || !targetEl) {
    overlay.classList.add('intro-overlay--gone');
    return;
  }

  let closing = false;
  let autoTimer = 0;

  function morphToHeader() {
    if (closing) return;
    closing = true;
    clearTimeout(autoTimer);

    const src = logoEl.getBoundingClientRect();
    const tgt = targetEl.getBoundingClientRect();
    if (!src.height || !tgt.height) {
      overlay.classList.add('intro-overlay--gone');
      try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
      return;
    }
    const scale = tgt.height / src.height;
    const dx = (tgt.left + tgt.width / 2) - (src.left + src.width / 2);
    const dy = (tgt.top + tgt.height / 2) - (src.top + src.height / 2);

    logoEl.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) scale(' + scale + ')';
    overlay.classList.add('intro-overlay--closing');

    const finish = function () {
      overlay.classList.add('intro-overlay--gone');
      overlay.removeEventListener('transitionend', finish);
      try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
    };
    overlay.addEventListener('transitionend', finish);
    // 保険：transitionend が発火しない環境用フォールバック
    setTimeout(finish, 1500);
  }

  // 巨大ロゴを一拍見せてから自動でヘッダー位置へ
  autoTimer = setTimeout(morphToHeader, 1300);
  overlay.addEventListener('click', morphToHeader);
  window.addEventListener('scroll', morphToHeader, { passive: true, once: true });
})();
