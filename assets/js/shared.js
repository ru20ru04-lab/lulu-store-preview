/* 共通ヘルパ
 * - SITE_ROOT を軸に data / assets のパスを解決
 * - 商品データの取得（キャッシュあり）
 * - カテゴリ / 採寸キーの表示ラベル
 * - カテゴリの動的一覧（0件は除外、順序は categoryOrder 優先）
 */
(function () {
  const root = window.SITE_ROOT || './';

  function assetPath(p) {
    if (!p) return '';
    return root + String(p).replace(/^\//, '');
  }

  function formatPrice(v) {
    if (typeof v !== 'number') return '';
    return '¥' + v.toLocaleString('ja-JP');
  }

  let cache = null;
  async function loadProducts() {
    if (cache) return cache;
    const url = root + 'data/products.json';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('products.json の読み込みに失敗しました');
    cache = await res.json();
    return cache;
  }

  // カテゴリ表示（ハンバーガーメニュー・商品カード等）
  // 例に合わせてメニューは英語、商品ページ等は日本語ラベルを使い分け。
  const categoryLabels = {
    tops: 'トップス',
    bottoms: 'ボトムス',
    outer: 'アウター',
    dress: 'ワンピース',
    knit: 'ニット',
    cardigan: 'カーディガン',
  };

  const categoryEnLabels = {
    tops: 'Tops',
    bottoms: 'Bottoms',
    outer: 'Outer',
    dress: 'Dress',
    knit: 'Knit',
    cardigan: 'Cardigan',
  };

  // 表示順の優先度（この順に並べ、未定義キーは末尾へ）
  const categoryOrder = ['tops', 'outer', 'bottoms', 'dress', 'knit', 'cardigan'];

  function categorySortValue(key) {
    const i = categoryOrder.indexOf(key);
    return i === -1 ? 999 : i;
  }

  /**
   * 商品配列から、実際に1点以上ある category を JSON順ベースで返す。
   * 返す形: [{ key, en, ja, count }]
   * 0件のカテゴリは含まれない。
   */
  function nonEmptyCategories(products) {
    const counts = {};
    (products || []).forEach(function (p) {
      if (!p || !p.category) return;
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.keys(counts)
      .sort(function (a, b) {
        const av = categorySortValue(a);
        const bv = categorySortValue(b);
        if (av !== bv) return av - bv;
        return a.localeCompare(b);
      })
      .map(function (key) {
        return {
          key: key,
          en: categoryEnLabels[key] || key,
          ja: categoryLabels[key] || key,
          count: counts[key],
        };
      });
  }

  // 将来カテゴリごとに項目を変えるため、キーとラベルの対応表を分離。
  const measurementLabels = {
    length: '着丈',
    width: '身幅',
    shoulder: '肩幅',
    sleeve: '袖丈',
    // 将来追加予定：バッグ用
    height: '縦',
    depth: 'マチ',
    handle: '持ち手',
  };

  // ヘッダー：スクロール量に応じて "scrolled" 状態をトグル
  // → CSS 側で細い境界線を出して、下に流れる本文との仕切りを明示
  (function () {
    function attach() {
      const header = document.querySelector('.site-header');
      if (!header) return;
      const THRESHOLD = 4;
      let ticking = false;
      function update() {
        ticking = false;
        header.classList.toggle('site-header--scrolled', (window.pageYOffset || 0) > THRESHOLD);
      }
      function onScroll() {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      update();
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attach);
    } else {
      attach();
    }
  })();

  window.LuLu = {
    root: root,
    assetPath: assetPath,
    formatPrice: formatPrice,
    loadProducts: loadProducts,
    categoryLabels: categoryLabels,
    categoryEnLabels: categoryEnLabels,
    categoryOrder: categoryOrder,
    nonEmptyCategories: nonEmptyCategories,
    measurementLabels: measurementLabels,
  };
})();
