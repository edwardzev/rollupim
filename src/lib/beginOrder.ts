export async function beginOrderAndGoToIcount(opts: {
  orderId: string;     // e.g. 'R-13'
  totalILS: number;    // e.g. 59
  email?: string;
  icountUrl: string;   // the checkout URL you open
}) {
  const { orderId, totalILS, email, icountUrl } = opts;

  // pull click ids saved by attribution.ts
  const gclid  = localStorage.getItem('gclid');
  const gbraid = localStorage.getItem('gbraid');
  const wbraid = localStorage.getItem('wbraid');

  // save locally for client-side fallback on ?paid=1
  localStorage.setItem('last_order_id', orderId);
  localStorage.setItem('last_order_amount', String(totalILS));

  // tell our server (Vercel function)
  await fetch('/api/order/begin', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ orderId, amountILS: totalILS, email, gclid, gbraid, wbraid })
  }).catch(()=>{});

  // go to iCount
  location.href = icountUrl;
}