import React from 'react';
import { Helmet } from 'react-helmet-async';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import { ArrowRight, CornerDownLeft } from 'lucide-react';

const ReturnsPolicy = () => {
  return (
    <div className="bg-gray-50">
      <Helmet>
        <title>מדיניות החזרות והחלפות - רולאפ להרכבה עצמית</title>
        <meta name="description" content="מדיניות החזרות והחלפות של אתר רולאפ להרכבה עצמית." />
        <link rel="canonical" href="https://your-domain.com/returns-policy" />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-gray-800">רולאפ להרכבה עצמית</Link>
          <Link to="/" className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
            חזרה לעמוד הבית <ArrowRight className="mr-2 h-4 w-4" />
          </Link>
        </div>
      </div>
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-lg">
          <div className="text-center mb-12">
            <CornerDownLeft className="h-16 w-16 mx-auto text-blue-500 mb-4" />
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900">מדיניות החזרות והחלפות</h1>
            <p className="text-lg text-gray-600 mt-2">עודכן לאחרונה: 8 באוגוסט 2025</p>
          </div>
          
          <div className="prose prose-lg max-w-none text-right" style={{direction: 'rtl'}}>
            <h2 className="text-2xl font-bold mt-8 mb-4">1. מוצרים מותאמים אישית</h2>
            <p>בהתאם לחוק הגנת הצרכן, לא ניתן להחזיר או להחליף מוצרים שיוצרו במיוחד עבור הלקוח (כגון רולאפ עם הדפסה אישית), אלא אם כן נפל פגם בייצור המוצר.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">2. פגם במוצר</h2>
            <p>אנו עושים כל מאמץ לספק מוצר תקין ואיכותי. אם קיבלתם מוצר פגום (למשל, פגם במתקן הרולאפ או טעות משמעותית בהדפסה שלא נבעה מאיכות הקובץ המקורי), יש ליצור עמנו קשר תוך 48 שעות מקבלת המוצר בצירוף תמונה של הפגם.</p>
            <p>במקרה של פגם מוכח בייצור, אנו נדאג לספק לכם מוצר חדש ותקין על חשבוננו. לא יינתן החזר כספי אלא החלפה של המוצר.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">3. מוצרים שאינם מותאמים אישית</h2>
            <p>במקרה של רכישת מוצר שאינו מותאם אישית (למשל, סטנד רולאפ בלבד ללא הדפסה), ניתן להחזיר את המוצר תוך 14 יום מיום קבלתו, ובלבד שלא נעשה בו שימוש והוא מוחזר באריזתו המקורית. דמי המשלוח לא יוחזרו, ועלות משלוח ההחזרה תחול על הלקוח.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">4. ביטול עסקה</h2>
            <p>ניתן לבטל הזמנה של מוצר מודפס כל עוד ההזמנה לא עברה לשלב ההדפסה. לאחר שהקובץ נשלח להדפסה, לא ניתן לבטל את העסקה. להזמנות של מוצרים שאינם מודפסים, ניתן לבטל כל עוד המוצר לא נשלח.</p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ReturnsPolicy;