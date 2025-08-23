// src/lib/googleAds.js
const SEND_TO = 'AW-17446628010/REPLACE_WITH_YOUR_LABEL'; // 👈 paste your label

let firedFor = new Set();

function gtagSafe(...args) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag(...args);
    return true;
  }
  return false;
}

/**
 * Fire Google Ads conversion (de‑duped by transactionId)
 * @param {Object} p
 * @param {number} p.value     - order total (e.g., 59)
 * @param {string} [p.currency='ILS']
 * @param {string} [p.transactionId] - your order id (e.g., R-13) to prevent double firing
 */
export function fireAdsConversion({ value, currency = 'ILS', transactionId } = {}) {
  // de-dup per order (runtime & localStorage)
  if (transactionId) {
    if (firedFor.has(transactionId)) return;
    try {
      const key = `ads_conv_${transactionId}`;
      if (localStorage.getItem(key) === '1') return;
      localStorage.setItem(key, '1');
    } catch {}
    firedFor.add(transactionId);
  }

  // try now; if gtag not ready yet, retry a few times
  const payload = {
    send_to: SEND_TO,
    value: typeof value === 'number' ? value : undefined,
    currency,
    transaction_id: transactionId || undefined,
  };

  let attempts = 0;
  const tryFire = () => {
    attempts += 1;
    const ok = gtagSafe('event', 'conversion', payload);
    if (!ok && attempts < 10) setTimeout(tryFire, 200); // retry up to ~2s
  };
  tryFire();
}