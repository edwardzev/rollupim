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
        <title>רולאפ להרכבה עצמית – הכי זול בישראל | פרינט מרקט</title>
        <meta
          name="description"
          content="רולאפ להרכבה עצמית במחיר הכי זול בישראל. העלו את הגרפיקה שלכם, קבלו תצוגה מקדימה ומשלוח מהיר לכל הארץ."
        />
        <meta name="keywords" content="רולאפ, רול אפ, הרכבה עצמית, זול, ישראל, הדפסה, גרפיקה" />
        <link rel="canonical" href="https://start.printmarket.club/" />

        {/* Open Graph / WhatsApp / Facebook */}
        <meta property="og:title" content="רולאפ להרכבה עצמית – הכי זול בישראל" />
        <meta
          property="og:description"
          content="מחיר נמוך, איכות גבוהה. העלו קובץ וקבלו הדמיה מיידית ומשלוח מהיר."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://start.printmarket.club/" />
        <meta
          property="og:image"
          content="https://start.printmarket.club/og/rollup-hero.jpg"
        />
        <meta property="og:locale" content="he_IL" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="רולאפ להרכבה עצמית – הכי זול בישראל" />
        <meta
          name="twitter:description"
          content="העלו קובץ וקבלו הדמיה מיידית. משלוח לכל הארץ."
        />
        <meta
          name="twitter:image"
          content="https://start.printmarket.club/og/rollup-hero.jpg"
        />

        {/* WebSite JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            url: 'https://start.printmarket.club/',
            name: 'פרינט מרקט – רולאפ להרכבה עצמית',
            inLanguage: 'he',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://start.printmarket.club/?s={search_term_string}',
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