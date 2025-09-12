import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowDown, Check, Clock, Globe, ShieldCheck } from 'lucide-react';

const HeroSection = () => {
  const scrollToProducts = () => {
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
  };

  const images = [
    'https://horizons-cdn.hostinger.com/9ecc1982-6818-4569-adec-da0cfff42911/c1f51d6298c2afd3766ea529ae781b71.jpg',
    'https://horizons-cdn.hostinger.com/9ecc1982-6818-4569-adec-da0cfff42911/5ff2ddb2978e6498f96d87b3102b22ce.jpg',
    'https://horizons-cdn.hostinger.com/9ecc1982-6818-4569-adec-da0cfff42911/4ac9905ca1ca568d5e1c268a4c9a1d19.jpg',
    'https://horizons-cdn.hostinger.com/9ecc1982-6818-4569-adec-da0cfff42911/967bf6390525d5563d4053d27595d631.jpg',
  ];

  const floatingElements = [
    { text: 'הרכבה פשוטה תוך 5 דקות', icon: Clock, position: { top: '10%', left: '5%' } },
    { text: 'מתאים לכל מקום', icon: Globe, position: { top: '35%', right: '5%' } },
    { text: 'עמיד לאורך זמן', icon: ShieldCheck, position: { bottom: '30%', left: '8%' } },
    { text: 'איכות מקצועית', icon: Check, position: { bottom: '10%', right: '10%' } },
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="absolute inset-0 bg-white/20"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-right"
          >
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hero-title text-4xl lg:text-6xl font-bold text-gray-900 mb-4 leading-tight"
            >
              רולאפ במחיר הטוב ביותר בישראל
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="price-line text-3xl lg:text-5xl font-extrabold text-blue-700 mb-4"
            >
              <span className="align-middle">החל מ־</span>
              <span className="mx-1">149</span>
              <span className="align-middle">ש״ח</span>
              <span className="text-gray-600 text-base lg:text-lg font-semibold mr-2">כולל מע״מ</span>
            </motion.p>
            
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="hero-subtitle text-xl lg:text-2xl text-gray-600 mb-8"
            >
              <span >למה לשלם יותר?</span>
              <br/>
              מרכיבים לבד וחוסכים כסף!
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-end"
            >
              <Button
                onClick={scrollToProducts}
                size="lg"
                className="btn-primary bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg"
              >
                הזמינו עכשיו
                <ArrowDown className="mr-2 h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>
          
          {/* Hero Image Carousel */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative h-96 lg:h-[32rem]"
          >
            <AnimatePresence>
              <motion.img
                key={currentImageIndex}
                src={images[currentImageIndex]}
                alt={`רולאפ להרכבה עצמית - תמונה ${currentImageIndex + 1}`}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 1, ease: 'easeInOut' }}
                className="absolute inset-0 w-full h-full object-cover rounded-2xl shadow-2xl"
              />
            </AnimatePresence>

            {/* Floating elements */}
            {floatingElements.map((el, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1 + i * 0.2 }}
                whileHover={{ scale: 1.1, y: -5 }}
                className="absolute p-3 rounded-full flex items-center shadow-lg"
                style={{
                  ...el.position,
                  background: 'rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                }}
              >
                <el.icon className="h-5 w-5 text-blue-600 ml-2" />
                <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">{el.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <ArrowDown className="h-6 w-6 text-gray-400" />
      </motion.div>
    </section>
  );
};

export default HeroSection;