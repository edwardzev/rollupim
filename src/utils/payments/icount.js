// src/utils/payments/icount.js
export function buildICountPayUrl({
  pageId,           // iCount page ID, e.g. 123456
  sum,              // total in ILS (VAT included)
  description,      // short text, e.g. "Rollup DIY – Order #1234"
  fullName,
  firstName,
  lastName,
  phone,
  email,
  keepUtm = true,
}) {
  const base = `https://app.icount.co.il/m/${pageId}`;
  const params = new URLSearchParams();

  if (sum != null) params.set('cs', String(sum));
  if (description) params.set('cd', description);
  if (fullName) params.set('full_name', fullName);
  if (firstName) params.set('ccfname', firstName);
  if (lastName) params.set('cclname', lastName);
  if (phone) params.set('contact_phone', phone);
  if (email) params.set('contact_email', email);
  if (keepUtm) params.set('utm_nooverride', '1');

  return `${base}?${params.toString()}`;
}