import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { MessageSquare as MessageSquareQuote, CheckCircle } from 'lucide-react';

/* ----------------------------- constants ---------------------------------- */
const PABBLY_WEBHOOK =
  'https://connect.pabbly.com/workflow/sendwebhookdata/IjU3NjYwNTZhMDYzMDA0MzE1MjZhNTUzNTUxMzci_pc';

// Must match the catalogs in CustomerDetailsSection.jsx
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

/* --------------------------------- ui ------------------------------------- */
const BulkOffer = () => {
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', quantity: '' });

  // Keep the banner visible reliably (center-right)
  const [showBanner, setShowBanner] = useState(true);
  useEffect(() => {
    const node = document.querySelector('#products');
    if (!node) { setShowBanner(true); return; }
    const obs = new IntersectionObserver(
      ([entry]) => setShowBanner(entry.isIntersecting),
      { root: null, threshold: 0.1 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;

    const name = formData.name.trim();
    const phone = formData.phone.trim();
    const qty = Number(formData.quantity);

    if (!name || !phone || !qty || qty <= 0) {
      toast({
        title: 'חסר מידע',
        description: 'אנא מלאו שם, טלפון וכמות חיובית.',
        variant: 'destructive',
      });
      return;
    }

    // Build the SAME structured payload used at checkout:
    // - full product/addon matrices (qty 0 since nothing selected here)
    // - computed_units = requested quantity
    // - file_urls = "" (none uploaded)
    // - customer.address & customer.city included as null
    // - total = 0 (no pricing for a lead)
    const product_lines = PRODUCT_CATALOG.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      quantity: 0,
    }));

    const addon_lines = ADDON_CATALOG.map(a => ({
      id: a.id,
      name: a.name,
      price: a.price,
      quantity: 0,
    }));

    const payload = {
      version: '1.0',
      event: 'bulk_offer',
      source: 'site',
      timestamp: new Date().toISOString(),
      page_url: typeof window !== 'undefined' ? window.location.href : '',

      id: String(Date.now()),
      order_hint: '',
      is_assist: false,
      is_bulk: true,

      customer: {
        name,
        phone,
        email: '',
        address: '',
        city: ''
      },

      bulk_quantity: qty,
      computed_units: qty,
      total: 0,

      products: product_lines,
      addons: addon_lines,

      file_urls: '',
      dropbox_urls: '',

      uploads: {},

      analysis: {
        primary: { ratio: '', resolution: '' },
        assist:  { ratio: '', resolution: '' }
      },

      notes: '',
      chat_context: ''
    };

    try {
      setSending(true);

      const res = await fetch(PABBLY_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Webhook request failed');
      }

      setSubmitted(true);
      toast({ title: 'הפנייה נשלחה בהצלחה!', description: 'ניצור איתך קשר בהקדם.' });

      // Auto-close and reset
      setTimeout(() => {
        setOpen(false);
        setTimeout(() => {
          setSubmitted(false);
          setFormData({ name: '', phone: '', quantity: '' });
        }, 500);
      }, 1500);
    } catch (err) {
      toast({
        title: 'שגיאה בשליחת הבקשה',
        description: err.message || 'נסו שוב בעוד רגע.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="fixed bottom-4 right-4 md:top-1/2 md:right-0 md:-translate-y-1/2 md:bottom-auto transform z-[9999]"
          >
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  size="default"
                  className="rounded-l-xl bg-blue-600 hover:bg-blue-700 text-white shadow-2xl p-3 px-4 md:p-5 md:px-6 h-auto w-[240px] sm:w-[260px] md:w-[280px] lg:w-[280px] text-left"
                >
                  <MessageSquareQuote className="h-6 w-6 md:h-8 md:w-8 ml-3" />
                  <div>
                    <p className="font-bold text-base md:text-lg">צריך יותר מ-3 יחידות?</p>
                    <p className="text-sm md:text-base opacity-90">קבל הצעה מיוחדת</p>
                  </div>
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[480px] bg-white">
                {!submitted ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>הצעה להזמנה כמותית</DialogTitle>
                      <DialogDescription>
                        השאירו פרטים ונחזור אליכם עם הצעה משתלמת במיוחד!
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">שם</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="col-span-3"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="phone" className="text-right">טלפון</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="col-span-3"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="quantity" className="text-right">כמות רולאפים</Label>
                          <Input
                            id="quantity"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            value={formData.quantity}
                            onChange={handleInputChange}
                            className="col-span-3"
                            required
                          />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button type="submit" disabled={sending}>
                          {sending ? 'שולח…' : 'שלח בקשה'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    >
                      <CheckCircle className="h-20 w-20 text-green-500 mb-4" />
                    </motion.div>
                    <h3 className="text-2xl font-bold mb-2">תודה!</h3>
                    <p className="text-gray-600">
                      הפנייה שלך נשלחה בהצלחה. נחזור אליך בהקדם!
                    </p>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BulkOffer;
