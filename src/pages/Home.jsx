import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Toaster } from '@/components/ui/toaster';
import HeroSection from '@/components/HeroSection';
import HowItWorksSection from '@/components/HowItWorksSection';
import ProductSection from '@/components/ProductSection';
import PreviewSection from '@/components/PreviewSection';
import AdditionalUploadsSection from '@/components/AdditionalUploadsSection';
import QualitySection from '@/components/QualitySection';
import FAQSection from '@/components/FAQSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import Footer from '@/components/Footer';
import CustomerDetailsSection from '@/components/CustomerDetailsSection';
import BulkOffer from '@/components/BulkOffer';

function Home() {
  const [requiredUploads, setRequiredUploads] = useState(0);

  useEffect(() => {
    const checkOrderDetails = () => {
      const orderDetails = JSON.parse(localStorage.getItem('rollup_order_details'));
      if (orderDetails && orderDetails.products) {
        const totalGraphicItems = orderDetails.products
          .filter(p => p.id === 'fabric' || p.id === 'complete')
          .reduce((sum, p) => sum + p.quantity, 0);
        
        setRequiredUploads(Math.max(0, totalGraphicItems - 1));
      } else {
        setRequiredUploads(0);
      }
    };

    checkOrderDetails();
    const interval = setInterval(checkOrderDetails, 1000); 

    return () => clearInterval(interval);
  }, []);
  
  const handleFilesUpdate = useCallback((files) => {
    localStorage.setItem('additional_files', JSON.stringify(files));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <html lang="he" dir="rtl" />
        <title>Rollupim – רולאפ במחיר הטוב ביותר בישראל</title>
        <meta
          name="description"
          content="הזמינו רולאפ להרכבה עצמית באתר הרשמי – איכות גבוהה, מחיר משתלם ומשלוח לכל הארץ."
        />
        <meta name="keywords" content="רולאפ, רול אפ, הרכבה עצמית, זול, ישראל, הדפסה, גרפיקה" />
        <link rel="canonical" href="https://rollupim.co.il/" />

        {/* Open Graph / WhatsApp / Facebook */}
        <meta property="og:title" content="Rollupim – רולאפ במחיר הטוב ביותר בישראל" />
        <meta
          property="og:description"
          content="הזמינו רולאפ אונליין – איכות גבוהה, מחיר משתלם ומשלוח מהיר."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://rollupim.co.il/" />
        <meta
          property="og:image"
          content="https://rollupim.co.il/og-preview.jpg"
        />
        <meta property="og:locale" content="he_IL" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Rollupim – רולאפ במחיר הטוב ביותר בישראל" />
        <meta
          name="twitter:description"
          content="הזמינו רולאפ אונליין – איכות גבוהה, מחיר משתלם ומשלוח מהיר."
        />
        <meta
          name="twitter:image"
          content="https://rollupim.co.il/og-preview.jpg"
        />

        {/* WebSite JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            url: 'https://rollupim.co.il/',
            name: 'Rollupim – רולאפ להרכבה עצמית',
            inLanguage: 'he',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://rollupim.co.il/?s={search_term_string}',
              'query-input': 'required name=search_term_string',
            },
          })}
        </script>
      </Helmet>
      
      <HeroSection />
      <HowItWorksSection />
      <QualitySection />
      <ProductSection />
      <PreviewSection />
      {requiredUploads > 0 && (
        <AdditionalUploadsSection 
          requiredUploads={requiredUploads}
          onFilesUpdate={handleFilesUpdate}
        />
      )}
      <CustomerDetailsSection />
      <FAQSection />
      <TestimonialsSection />
      <Footer />
      <Toaster />
      <BulkOffer />
    </div>
  );
}

export default Home;