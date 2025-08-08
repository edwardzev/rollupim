import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: 'דני כהן',
      business: 'סטודיו גרפי',
      text: 'היה מהיר, זול וקל להרכבה! הלקוחות שלי מאוד מרוצים מהאיכות והמחיר הזול.',
      rating: 5,
      image: 'Happy business owner with rollup banner in modern office'
    },
    {
      name: 'מיכל לוי',
      business: 'חנות בגדים',
      text: 'הזמנתי 3 רולאפים לחנות. ההרכבה הייתה פשוטה והתוצאה מקצועית מאוד!',
      rating: 5,
      image: 'Female shop owner standing next to rollup banner in clothing store'
    },
    {
      name: 'אבי רוזן',
      business: 'חברת הייטק',
      text: 'מושלם לתערוכות! חסכנו המון כסף והרולאפים נראים בדיוק כמו של החברות הגדולות.',
      rating: 5,
      image: 'Professional man in suit at tech conference with rollup banner'
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            מה הלקוחות שלנו אומרים
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            אלפי לקוחים מרוצים כבר בחרו ברולאפ להרכבה עצמית
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0 }}
              viewport={{ once: true }}
              className="bg-gray-50 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="mb-6">
                <img  alt="דני כהן - לקוח מרוצה" className="w-20 h-20 rounded-full mx-auto object-cover" src="https://images.unsplash.com/photo-1635366544213-e09abf974aa6" />
              </div>
              <div className="flex justify-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <blockquote className="text-gray-700 text-center mb-6 leading-relaxed">
                "היה מהיר, זול וקל להרכבה! הלקוחות שלי מאוד מרוצים מהאיכות והמחיר הזול."
              </blockquote>
              <div className="text-center">
                <div className="font-bold text-gray-900">דני כהן</div>
                <div className="text-gray-600 text-sm">סטודיו גרפי</div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-gray-50 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="mb-6">
                <img  alt="מיכל לוי - לקוחה מרוצה" className="w-20 h-20 rounded-full mx-auto object-cover" src="https://images.unsplash.com/photo-1573497161529-95eb65b7a2fb" />
              </div>
              <div className="flex justify-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <blockquote className="text-gray-700 text-center mb-6 leading-relaxed">
                "הזמנתי 3 רולאפים לחנות. ההרכבה הייתה פשוטה והתוצאה מקצועית מאוד!"
              </blockquote>
              <div className="text-center">
                <div className="font-bold text-gray-900">מיכל לוי</div>
                <div className="text-gray-600 text-sm">חנות בגדים</div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
              className="bg-gray-50 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="mb-6">
                <img  alt="אבי רוזן - לקוח מרוצה" className="w-20 h-20 rounded-full mx-auto object-cover" src="https://images.unsplash.com/flagged/photo-1568811034478-0ca324d5f8f0" />
              </div>
              <div className="flex justify-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <blockquote className="text-gray-700 text-center mb-6 leading-relaxed">
                "מושלם לתערוכות! חסכנו המון כסף והרולאפים נראים בדיוק כמו של החברות הגדולות."
              </blockquote>
              <div className="text-center">
                <div className="font-bold text-gray-900">אבי רוזן</div>
                <div className="text-gray-600 text-sm">חברת הייטק</div>
              </div>
            </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">2000+</div>
            <div className="text-gray-600">לקוחים מרוצים</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">100%</div>
            <div className="text-gray-600">שביעות רצון</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">24h</div>
            <div className="text-gray-600">זמן עיבוד</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-orange-600 mb-2">5★</div>
            <div className="text-gray-600">דירוג ממוצע</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsSection;