
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ShoppingCart, PackageCheck, MapPin } from 'lucide-react';

const CustomerDetailsSection = () => {
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: ''
  });
  const [total, setTotal] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [needsShipping, setNeedsShipping] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const calculateTotal = () => {
      const orderDetails = JSON.parse(localStorage.getItem('rollup_order_details'));
      if (orderDetails) {
        setSelectedProducts(orderDetails.products || []);
        
        const productsTotal = (orderDetails.products || []).reduce((sum, product) => {
            return sum + (product.price * product.quantity);
        }, 0);

        const addonsTotal = (orderDetails.addons || []).reduce((sum, addon) => {
            return sum + (addon?.price || 0);
        }, 0);

        setTotal(productsTotal + addonsTotal);
        setNeedsShipping((orderDetails.addons || []).some(addon => addon.id === 'shipping'));
      }
    };

    calculateTotal();
    
    const interval = setInterval(calculateTotal, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleCheckout = () => {
    // Validation
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.email) {
      toast({
        title: "פרטים חסרים",
        description: "אנא מלאו שם מלא, טלפון ואימייל.",
        variant: "destructive"
      });
      return;
    }
    
    if (!validateEmail(customerInfo.email)) {
      toast({
        title: "אימייל לא תקין",
        description: "אנא הזינו כתובת אימייל חוקית.",
        variant: "destructive"
      });
      return;
    }
    
    if (needsShipping && (!customerInfo.address || !customerInfo.city)) {
       toast({
        title: "פרטי משלוח חסרים",
        description: "אנא מלאו כתובת ועיר למשלוח.",
        variant: "destructive"
      });
      return;
    }

    const uploadedFile = JSON.parse(localStorage.getItem('uploaded_file'));
    const requiresFile = selectedProducts.some(p => p.id === 'fabric' || p.id === 'complete');
    if (requiresFile && !uploadedFile) {
       toast({
        title: "חסר קובץ גרפי",
        description: "אנא העלו קובץ גרפי לפני ההזמנה",
        variant: "destructive"
      });
      return;
    }

    const orderDetails = JSON.parse(localStorage.getItem('rollup_order_details'));

    const order = {
      id: Date.now(),
      products: orderDetails.products,
      addons: orderDetails.addons,
      file: uploadedFile ? uploadedFile.name : null,
      customer: customerInfo,
      total: total,
      date: new Date().toISOString()
    };

    const orders = JSON.parse(localStorage.getItem('rollup_orders') || '[]');
    orders.push(order);
    localStorage.setItem('rollup_orders', JSON.stringify(orders));

    toast({
      title: "🚧 תכונה זו עדיין לא מיושמת - אבל אל תדאגו! תוכלו לבקש אותה בהודעה הבאה! 🚀",
      description: `ההזמנה נשמרה במערכת. סה"כ: ${total} ש"ח`,
    });
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
                  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="הכניסו את שמכם המלא"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">טלפון *</label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="050-1234567"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">אימייל *</label>
                <input
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
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
                      onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="רחוב, מספר בית"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">עיר *</label>
                    <input
                      type="text"
                      value={customerInfo.city}
                      onChange={(e) => setCustomerInfo({...customerInfo, city: e.target.value})}
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
              onClick={handleCheckout}
              size="lg"
              className="w-full btn-primary bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-semibold rounded-xl"
            >
              <ShoppingCart className="ml-2 h-5 w-5" />
              המשך לתשלום
            </Button>
        </div>
      </div>
    </section>
  );
};

export default CustomerDetailsSection;
