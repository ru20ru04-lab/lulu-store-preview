/* トップページのスライドスタック（Miu Miu 型：next slide が下から100%スライドイン）
 * - wheel / touch を横取りして 1 スワイプ = 1 スライド遷移
 * - 最終スライドで下方向は解放 → 通常スクロールへ
 * - スクロール位置が先頭に戻ったら再びロック
 * - prefers-reduced-motion 尊重（通常縦積みへフォールバック）
 */
(function () {
  const stack = document.getElementById('slide-stack');
  if (!stack) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    stack.classList.add('slide-stack--flat');
    return;
  }

  const slides = stack.querySelectorAll('.slide');
  const MAX_IDX = slides.length - 1;

  function applyActive() {
    slides.forEach((el, i) => {
      el.classList.toggle('slide--in', i <= active);
    });
  }
  const TRANSITION_MS = 620;
  const WHEEL_MIN = 8;
  const TOUCH_MIN = 40;
  const EDGE_TOP = 4;

  let active = 0;
  let lastSwapAt = 0;

  function scrollY() {
    return window.pageYOffset || document.documentElement.scrollTop || 0;
  }

  function atTop() {
    return scrollY() < EDGE_TOP;
  }

  function locked() {
    return performance.now() - lastSwapAt < TRANSITION_MS;
  }

  function setActive(next) {
    if (next < 0 || next > MAX_IDX || next === active) return;
    active = next;
    stack.dataset.active = String(active);
    applyActive();
    lastSwapAt = performance.now();
  }

  function tryDown() {
    if (active < MAX_IDX) { setActive(active + 1); return true; }
    return false;
  }

  function tryUp() {
    if (active > 0) { setActive(active - 1); return true; }
    return false;
  }

  function currentSlide() { return slides[active]; }
  function canScrollDownInside() {
    const el = currentSlide();
    return el.scrollHeight - el.clientHeight - el.scrollTop > 1;
  }
  function canScrollUpInside() {
    return currentSlide().scrollTop > 1;
  }

  function onWheel(e) {
    if (!atTop()) return;
    if (locked()) { e.preventDefault(); return; }
    if (Math.abs(e.deltaY) < WHEEL_MIN) return;

    if (e.deltaY > 0) {
      if (canScrollDownInside()) return;
      if (tryDown()) { e.preventDefault(); return; }
      // 最終スライドで底に到達 → ドキュメントスクロールに明示的に流す
      e.preventDefault();
      window.scrollBy({ top: Math.max(Math.abs(e.deltaY), 60), behavior: 'auto' });
    } else {
      if (canScrollUpInside()) return;
      if (tryUp()) e.preventDefault();
    }
  }

  let touchStartY = null;
  function onTouchStart(e) {
    if (!atTop()) { touchStartY = null; return; }
    touchStartY = e.touches[0].clientY;
  }

  function onTouchMove(e) {
    if (touchStartY == null) return;
    if (!atTop()) { touchStartY = null; return; }
    if (locked()) { e.preventDefault(); return; }

    const dy = touchStartY - e.touches[0].clientY;
    if (Math.abs(dy) < TOUCH_MIN) return;

    if (dy > 0) {
      if (canScrollDownInside()) return;
      if (tryDown()) { e.preventDefault(); touchStartY = e.touches[0].clientY; return; }
      // 解放：ドキュメントへ流す
      e.preventDefault();
      window.scrollBy({ top: Math.max(dy, 60), behavior: 'auto' });
      touchStartY = e.touches[0].clientY;
    } else {
      if (canScrollUpInside()) return;
      if (tryUp()) { e.preventDefault(); touchStartY = e.touches[0].clientY; }
    }
  }

  function onTouchEnd() { touchStartY = null; }

  function onKey(e) {
    if (!atTop()) return;
    if (locked()) { e.preventDefault(); return; }
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      if (canScrollDownInside()) return;
      if (tryDown()) { e.preventDefault(); return; }
      e.preventDefault();
      window.scrollBy({ top: e.key === 'PageDown' ? window.innerHeight * 0.9 : 80, behavior: 'auto' });
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      if (canScrollUpInside()) return;
      if (tryUp()) e.preventDefault();
    }
  }

  applyActive();

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('keydown', onKey);
})();
