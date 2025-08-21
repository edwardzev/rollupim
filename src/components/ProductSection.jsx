import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Plus, Minus } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const ProductSection = () => {
  const [quantities, setQuantities] = useState({
    fabric: 0,
    stand: 0,
    complete: 1, // default one full kit
  });
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [total, setTotal] = useState(0);

  const products = [
    {
      id: 'fabric',
      name: 'רק בד מודפס',
      price: 59,
      description: 'בד מודפס באיכות גבוהה בלבד',
      features: ['הדפסה באיכות HD', 'בד עמיד ואיכותי', 'גודל: 85x200 ס"מ'],
    },
    {
      id: 'stand',
      name: 'רק סטנד',
      price: 99,
      description: 'סטנד רולאפ איכותי בלבד',
      features: ['סטנד אלומיניום קל', 'מנגנון פתיחה חלק', 'מתאים לבד בגודל 85x200 ס"מ'],
    },
    {
      id: 'complete',
      name: 'ערכה מלאה להרכבה עצמית',
      price: 149,
      description: 'הכל ביחד - הכי משתלם!',
      features: ['בד מודפס + סטנד', 'הוראות הרכבה מפורטות', 'אחריות מלאה'],
      popular: true,
    },
  ];

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'מבחר מוצרי רולאפ',
    itemListElement: products.map((p, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        description: p.description,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'ILS',
          price: String(p.price),
          availability: 'https://schema.org/InStock',
          url: 'https://start.printmarket.club/',
        },
      },
    })),
  };

  const addons = [
    { id: 'bag',       name: 'תיק נשיאה',    originalPrice: 19, price: 0 }, // free
    { id: 'assembly',  name: 'הרכבה מראש',  price: 19 },                    // ← per unit
    { id: 'shipping',  name: 'משלוח עם שליח', price: 49 },                  // per order
  ];

  // helper: total units selected
  const units = products.reduce((sum, p) => sum + (quantities[p.id] || 0), 0);

  useEffect(() => {
    const calculateTotal = () => {
      const productsTotal = products.reduce(
        (sum, product) => sum + (quantities[product.id] || 0) * product.price,
        0
      );

      // Per-unit rule for assembly; others once (bag may be 0)
      const addonsTotal = selectedAddons.reduce((sum, addonId) => {
        const addon = addons.find((a) => a.id === addonId);
        if (!addon) return sum;
        const perUnit = addon.id === 'assembly' || (addon.name || '').includes('הרכבה');
        const qty = perUnit ? Math.max(units, 0) : 1;
        return sum + (addon.price || 0) * qty;
      }, 0);

      setTotal(productsTotal + addonsTotal);

      // Persist full order details for later steps
      const selectedProducts = products
        .filter((p) => (quantities[p.id] || 0) > 0)
        .map((p) => ({ ...p, quantity: quantities[p.id] }));

      const orderDetails = {
        products: selectedProducts,
        addons: selectedAddons.map((id) => addons.find((a) => a.id === id)),
        quantity: units, // make unit count explicit for downstream use
      };

      localStorage.setItem('rollup_order_details', JSON.stringify(orderDetails));
    };

    calculateTotal();
  }, [quantities, selectedAddons]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuantityChange = (productId, change) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + change),
    }));
  };

  const handleAddonToggle = (addonId) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  return (
    <section id="products" className="py-20 bg-white">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(itemListJsonLd)}</script>
      </Helmet>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            1. בחרו את החבילה שלכם
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">מחירים שקופים, ללא עלויות נסתרות</p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">אפשרויות מוצר</h3>

          <div className="space-y-4">
            {products.map((product, index) => {
              const qty = quantities[product.id] || 0;
              const subtotal = qty * product.price;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className={`product-card relative p-6 rounded-2xl border-2 transition-all ${
                    qty > 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {product.popular && (
                    <div className="absolute -top-3 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      הכי פופולרי
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                    <div className="flex-grow">
                      <h4 className="text-xl font-bold text-gray-900">{product.name}</h4>
                      <p className="text-gray-600">{product.description}</p>
                    </div>
                    <div className="text-left mt-4 sm:mt-0 sm:ml-4 flex-shrink-0">
                      <div className="flex items-baseline gap-1 justify-start">
                        <span className="text-3xl font-bold text-blue-600">{product.price}</span>
                        <span className="text-gray-600"> ש"ח</span>
                        <span className="text-xs text-gray-500">כולל מע״מ</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center">
                    <ul className="space-y-2 mb-4 sm:mb-0">
                      {product.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-gray-700">
                          <Check className="h-4 w-4 text-green-500 ml-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <div className="flex items-center space-x-3 space-x-reverse">
                      <button
                        onClick={() => handleQuantityChange(product.id, 1)}
                        className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition"
                      >
                        <Plus className="h-5 w-5" />
                      </button>

                      <span className="text-xl font-bold w-10 text-center">{qty}</span>

                      <button
                        onClick={() => handleQuantityChange(product.id, -1)}
                        className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                      >
                        <Minus className="h-5 w-5" />
                      </button>

                      {qty > 0 && (
                        <div className="text-lg font-semibold text-gray-700 w-28 text-center">
                          סה"כ:
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-blue-600">{subtotal} ש"ח</span>
                            <span className="text-[11px] text-gray-500">כולל מע״מ</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">תוספות (אופציונלי)</h3>
            <div className="space-y-3">
              {addons.map((addon) => {
                // Show computed price for assembly per unit; others once
                const perUnit = addon.id === 'assembly' || (addon.name || '').includes('הרכבה');
                const displayQty = perUnit ? Math.max(units, 0) : 1;
                const displayPrice =
                  addon.price > 0 ? addon.price * (perUnit ? Math.max(units, 0) : 1) : 0;

                return (
                  <div
                    key={addon.id}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedAddons.includes(addon.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleAddonToggle(addon.id)}
                  >
                    <span className="font-medium text-gray-900">
                      {addon.name}
                      {perUnit && units > 1 && (
                        <span className="text-gray-500 mr-2 text-sm">× {displayQty}</span>
                      )}
                    </span>

                    <div className="flex items-center">
                      {addon.id === 'bag' && (
                        <>
                          <span className="text-gray-500 line-through ml-2">{addon.originalPrice} ש"ח</span>
                          <span className="text-xs text-gray-400 mr-2"> </span>
                        </>
                      )}
                      {addon.price > 0 ? (
                        <>
                          <span className={`font-bold ${addon.id === 'bag' ? 'text-green-600' : 'text-blue-600'}`}>
                            {displayPrice} ש"ח
                          </span>
                          <span className="text-xs text-gray-500 mr-2">כולל מע״מ</span>
                        </>
                      ) : (
                        <span className="font-bold text-green-600">חינם!</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-12 p-6 bg-gray-100 rounded-2xl shadow-inner">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-800">סך הכל:</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-blue-600">{total} ש"ח</span>
                <span className="text-sm text-gray-500">כולל מע״מ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductSection;
