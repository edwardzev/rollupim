// src/lib/attribution.ts
export function captureClickIdsOnce() {
  const usp = new URLSearchParams(location.search);
  const gclid  = usp.get('gclid');
  const gbraid = usp.get('gbraid');
  const wbraid = usp.get('wbraid');
  if (gclid)  localStorage.setItem('gclid', gclid);
  if (gbraid) localStorage.setItem('gbraid', gbraid);
  if (wbraid) localStorage.setItem('wbraid', wbraid);
}
export function getClickIds() {
  return {
    gclid:  localStorage.getItem('gclid')  || null,
    gbraid: localStorage.getItem('gbraid') || null,
    wbraid: localStorage.getItem('wbraid') || null,
  };
}