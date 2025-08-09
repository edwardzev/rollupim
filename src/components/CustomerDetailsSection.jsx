import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ShoppingCart, MapPin, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { pendingUploads, clearAllPendingUploads } from '@/lib/pendingUploads';

const CLOUD_NAME = 'dkdpwgsyl';
const UPLOAD_PRESET = 'rollupim';
const PABBLY_WEBHOOK =
  'https://connect.pabbly.com/workflow/sendwebhookdata/IjU3NjYwNTZhMDYzMDA0MzE1MjZhNTUzNTUxMzci_pc';

/* --------------------------------- helpers --------------------------------- */
const safeParse = (s) => { try { return JSON.parse(s); } catch { return null; } };

const getUnitsFromOrder = (od) => {
  if (Number(od?.quantity) > 0) return Number(od.quantity);
  const prods = Array.isArray(od?.products) ? od.products : [];
  let sum = 0;
  for (const p of prods) sum += Number(p?.quantity ?? p?.qty ?? 1) || 0;
  if (sum > 0) return sum;
  for (const k of ['qty','count','units','pieces','selectedQuantity','totalUnits','numUnits']) {
    const v = Number(od?.[k]); if (v > 0) return v;
  }
  return 1;
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// dd-mm-yy_hh-mm (no slashes)
const tsForId = (d = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${String(d.getFullYear()).slice(-2)}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
};

// ASCII-only, safe for Cloudinary prefixes
const asciiSlug = (s) => (s || '')
  .toString()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9\-_]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
  .toLowerCase();

// Example: "edward_09-08-25_14-32_"
const makePublicIdPrefix = (customerName) => {
  const who = asciiSlug(customerName) || 'client';
  return `${who}_${tsForId()}_`;
};

// Unsigned upload (PDF -> resource "raw", images -> "auto")
async function uploadToCloudinary(file, prefix) {
  const resource = file?.type === 'application/pdf' ? 'raw' : 'auto';
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  if (prefix) fd.append('public_id_prefix', prefix); // allowed for unsigned

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resource}/upload`, {
    method: 'POST',
    body: fd,
  });

  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = (JSON.parse(text).error?.message) || text; } catch {}
    throw new Error(msg);
  }
  try { return JSON.parse(text); } catch { throw new Error('Invalid JSON from Cloudinary'); }
}

/* -------------------------- canonical catalogs ----------------------------- */
const PRODUCT_CATALOG = [
  { id: 'fabric',   name: 'רק בד מודפס',               price: 59 },
  { id: 'stand',    name: 'רק סטנד',                   price: 99 },
  { id: 'complete', name: 'ערכה מלאה להרכבה עצמית',     price: 149 },
];

const ADDON_CATALOG = [
  { id: 'bag',       name: 'תיק נשיאה',     price: 0,  perUnit: false },
  { id: 'assembly',  name: 'הרכבה מראש',    price: 19, perUnit: true  },
  { id: 'shipping',  name: 'משלוח עם שליח', price: 49, perUnit: false },
];

/* ------------------------------ component ---------------------------------- */
const CustomerDetailsSection = () => {
  const { toast } = useToast();

  const [orderDetails, setOrderDetails] = useState({ products: [], addons: [], quantity: 1 });
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', email: '', address: '', city: '' });
  const [total, setTotal] = useState(0);
  const [needsShipping, setNeedsShipping] = useState(false);

  const [sending, setSending] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  useEffect(() => {
    const calculate = () => {
      const od = safeParse(localStorage.getItem('rollup_order_details')) || {};

      setOrderDetails({
        products: od.products || [],
        addons: od.addons || [],
        quantity: od.quantity || 1,
      });

      const units = getUnitsFromOrder(od);

      const productsTotal = (od.products || []).reduce((sum, p) => {
        const price = Number(p?.price || 0);
        const qty = Number(p?.quantity ?? p?.qty ?? 1);
        return sum + price * qty;
      }, 0);

      const addonsTotal = (od.addons || []).reduce((sum, a) => {
        const price = Number(a?.price ?? a?.amount ?? 0);
        const id = String(a?.id ?? '').toLowerCase();
        const name = String(a?.name ?? a?.label ?? '').toLowerCase();
        const perUnit = id === 'assembly' || name.includes('הרכבה');
        const qty = Number(a?.quantity) > 0 ? Number(a.quantity) : (perUnit ? units : 1);
        return sum + price * qty;
      }, 0);

      setTotal(productsTotal + addonsTotal);

      setNeedsShipping((od.addons || []).some(a =>
        `${a?.id ?? a?.key ?? a?.slug ?? ''}`.toLowerCase().includes('shipping')
      ));
    };

    calculate();
    const interval = setInterval(calculate, 500);
    return () => clearInterval(interval);
  }, []);

  const handleCheckout = async (e) => {
    e?.preventDefault?.();
    if (sending) return;

    try {
      // ===== form validation =====
      if (!customerInfo.name?.trim() || !customerInfo.phone?.trim() || !customerInfo.email?.trim()) {
        toast({ title: 'חסר מידע', description: 'אנא מלאו שם, טלפון ואימייל.', variant: 'destructive' });
        return;
      }
      if (!validateEmail(customerInfo.email)) {
        toast({ title: 'אימייל לא תקין', description: 'אנא הזינו כתובת אימייל תקינה.', variant: 'destructive' });
        return;
      }
      if (needsShipping && (!customerInfo.address?.trim() || !customerInfo.city?.trim())) {
        toast({ title: 'פרטי משלוח חסרים', description: 'אנא הזינו כתובת ועיר למשלוח.', variant: 'destructive' });
        return;
      }

      // ===== files present? =====
      const primaryQueued = !!pendingUploads.main;
      const legacyPrimary = safeParse(localStorage.getItem('uploaded_file'));
      if (!primaryQueued && !legacyPrimary) {
        toast({ title: 'חסר קובץ גרפי', description: 'אנא העלו קובץ גרפי לפני ההזמנה.', variant: 'destructive' });
        return;
      }

      setSending(true);

      // ===== units for per-unit addons & matrices =====
      const odNow = safeParse(localStorage.getItem('rollup_order_details')) || {};
      let units = getUnitsFromOrder(odNow);
      const queuedUnits = (pendingUploads?.main ? 1 : 0) + Object.keys(pendingUploads?.additional || {}).length;
      if (queuedUnits > units) units = queuedUnits;

      // ===== upload queued files =====
      const uploadedMap = {};
      const allUrls = [];
      const prefix = makePublicIdPrefix(customerInfo.name);

      if (pendingUploads.main) {
        const cloud = await uploadToCloudinary(pendingUploads.main, prefix);
        uploadedMap.primary = {
          url: cloud.secure_url,
          public_id: cloud.public_id,
          original_name: pendingUploads.main.name,
          size: pendingUploads.main.size,
        };
        allUrls.push(cloud.secure_url);
      } else if (legacyPrimary?.url) {
        uploadedMap.primary = legacyPrimary;
        allUrls.push(legacyPrimary.url);
      }

      for (const [key, file] of Object.entries(pendingUploads.additional || {})) {
        const cloud = await uploadToCloudinary(file, prefix);
        uploadedMap[key] = {
          url: cloud.secure_url,
          public_id: cloud.public_id,
          original_name: file.name,
          size: file.size,
        };
        allUrls.push(cloud.secure_url);
      }

      // ===== recompute totals (safety) =====
      const productsTotal = (odNow.products || []).reduce((sum, p) => {
        const price = Number(p?.price || 0);
        const qty = Number(p?.quantity ?? p?.qty ?? 1);
        return sum + price * qty;
      }, 0);

      const addonsTotal = (odNow.addons || []).reduce((sum, a) => {
        const price = Number(a?.price ?? a?.amount ?? 0);
        const id = String(a?.id ?? '').toLowerCase();
        const name = String(a?.name ?? a?.label ?? '').toLowerCase();
        const perUnit = id === 'assembly' || name.includes('הרכבה');
        const qty = Number(a?.quantity) > 0 ? Number(a.quantity) : (perUnit ? units : 1);
        return sum + price * qty;
      }, 0);

      const grandTotal = productsTotal + addonsTotal;

      // ===== full matrices (qty 0 for unselected) =====
      const selectedById = new Map((odNow.products || []).map(p => [String(p.id), Number(p.quantity || 0)]));
      const product_lines = PRODUCT_CATALOG.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        quantity: selectedById.get(p.id) || 0,
      }));

      const addonIdsSelected = new Set((odNow.addons || []).map(a => String(a.id)));
      const addon_lines = ADDON_CATALOG.map(a => {
        const selected = addonIdsSelected.has(a.id);
        const qty = selected ? (a.perUnit ? units : 1) : 0;
        return { id: a.id, name: a.name, price: a.price, quantity: qty };
      });

      // ===== payload =====
      const orderPayload = {
        id: Date.now(),
        products: product_lines,
        addons: addon_lines,
        computed_units: units,
        file_urls: allUrls.join(','), // single field with comma-separated URLs
        customer: {
            name: customerInfo.name,
            phone: customerInfo.phone,
            email: customerInfo.email,
            address: customerInfo.address || null,
            city: customerInfo.city || null,
        },
        total: grandTotal,
        date: new Date().toISOString(),
      };

      await fetch(PABBLY_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      clearAllPendingUploads?.();

      // Success toast + popup
      toast({
        title: 'ההזמנה נשלחה!',
        description: `הקבצים הועלו ונשלחו. סה״כ: ${grandTotal} ש״ח`,
      });
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 6500); // auto-close after ~2.5s
    } catch (err) {
      console.error(err);
      toast({
        title: 'שגיאה בשליחת ההזמנה',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="customer-details" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            3. פרטי הזמנה ותשלום
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            כמעט סיימנו! רק נשאר למלא את הפרטים.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 shadow-lg">
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא *</label>
              <input
                type="text"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="הכניסו את שמכם המלא"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">טלפון *</label>
              <input
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="050-1234567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אימייל *</label>
              <input
                type="email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="example@email.com"
              />
            </div>

            {needsShipping ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">כתובת למשלוח *</label>
                  <input
                    type="text"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="רחוב, מספר בית"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">עיר *</label>
                  <input
                    type="text"
                    value={customerInfo.city}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, city: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="תל אביב"
                  />
                </div>
              </>
            ) : (
              <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 ml-3 flex-shrink-0" />
                  <div>
                    <p className="font-bold">איסוף עצמי</p>
                    <p>ניתן לאסוף מהכתובת: האורגים 32, חולון</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-100 rounded-xl p-6 mb-6">
            <div className="flex justify-between items-center text-2xl font-bold">
              <span>סה"כ לתשלום:</span>
              <span className="text-blue-600">{total} ש"ח</span>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleCheckout}
            disabled={sending}
            size="lg"
            className="w-full btn-primary bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-semibold rounded-xl"
          >
            <ShoppingCart className="ml-2 h-5 w-5" />
            {sending ? 'שולח…' : 'המשך לתשלום'}
          </Button>
        </div>
      </div>

      {/* Success popup (auto-closes) */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-[700px] bg-white">
          <div className="flex flex-col items-center text-center p-2">
            <CheckCircle className="h-16 w-16 text-green-500 mb-3" />
            <h3 className="text-2xl font-bold mb-2">ההזמנה התקבלה!</h3>
            <p className="text-gray-600">
              ממש בקרוב תקבלו הודעת WhatsApp ואימייל עם מספר הזמנה וקישור לתשלום.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default CustomerDetailsSection;
