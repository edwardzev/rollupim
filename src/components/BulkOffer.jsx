import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { MessageSquare as MessageSquareQuote, CheckCircle } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

const BulkOffer = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', quantity: '' });

  const { ref, inView } = useInView({
    triggerOnce: false,
    threshold: 0.1,
  });

  useEffect(() => {
    const productSection = document.getElementById('products');
    if (productSection && ref) {
      ref(productSection);
    }
  }, [ref]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const newLead = { ...formData, date: new Date().toISOString() };
    const existingLeads = JSON.parse(localStorage.getItem('bulk_leads')) || [];
    localStorage.setItem('bulk_leads', JSON.stringify([...existingLeads, newLead]));
    
    setSubmitted(true);

    toast({
      title: 'הפנייה נשלחה בהצלחה!',
      description: 'ניצור איתך קשר בהקדם.',
    });

    setTimeout(() => {
      setOpen(false);
      // Reset after modal closes
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ name: '', phone: '', quantity: '' });
      }, 500);
    }, 2000);
  };

  return (
    <>
      <AnimatePresence>
        {inView && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="fixed bottom-10 right-0 z-50"
          >
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="rounded-r-none bg-blue-600 hover:bg-blue-700 text-white shadow-lg p-4 h-auto">
                    <MessageSquareQuote className="h-6 w-6 ml-2" />
                    <div>
                        <p className="font-bold">צריך יותר מ-3 יחידות?</p>
                        <p className="text-sm">קבל הצעה מיוחדת</p>
                    </div>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
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
                          <Input id="name" value={formData.name} onChange={handleInputChange} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="phone" className="text-right">טלפון</Label>
                          <Input id="phone" value={formData.phone} onChange={handleInputChange} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="quantity" className="text-right">כמות רולאפים</Label>
                          <Input id="quantity" type="number" value={formData.quantity} onChange={handleInputChange} className="col-span-3" required />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">שלח בקשה</Button>
                      </DialogFooter>
                    </form>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-8">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
                      <CheckCircle className="h-20 w-20 text-green-500 mb-4" />
                    </motion.div>
                    <h3 className="text-2xl font-bold mb-2">תודה!</h3>
                    <p className="text-gray-600">הפנייה שלך נשלחה בהצלחה. נחזור אליך בהקדם!</p>
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