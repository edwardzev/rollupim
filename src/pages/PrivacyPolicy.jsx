import React from 'react';
import { Helmet } from 'react-helmet-async';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="bg-gray-50">
      <Helmet>
        <title>מדיניות פרטיות - רולאפ להרכבה עצמית</title>
        <meta name="description" content="מדיניות הפרטיות של אתר רולאפ להרכבה עצמית. אנו מכבדים את פרטיותכם." />
        <link rel="canonical" href="https://your-domain.com/privacy-policy" />
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
            <ShieldCheck className="h-16 w-16 mx-auto text-blue-500 mb-4" />
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900">מדיניות פרטיות</h1>
            <p className="text-lg text-gray-600 mt-2">עודכן לאחרונה: 8 באוגוסט 2025</p>
          </div>
          
          <div className="prose prose-lg max-w-none text-right" style={{direction: 'rtl'}}>
            <p>אנו ב"רולאפ להרכבה עצמית" מכבדים את פרטיות המשתמשים שלנו. מסמך זה מתאר איזה מידע אנו אוספים וכיצד אנו משתמשים בו.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">1. איסוף מידע</h2>
            <p>אנו אוספים מידע אישי שאתם מספקים לנו באופן ישיר בעת ביצוע הזמנה, כגון שם, כתובת, כתובת דוא"ל ומספר טלפון. מידע זה נדרש לצורך עיבוד ההזמנה, משלוח המוצרים ויצירת קשר במידת הצורך.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">2. שימוש במידע</h2>
            <p>המידע שנאסף ישמש אך ורק למטרות הבאות:</p>
            <ul>
              <li>עיבוד וניהול ההזמנות שלכם.</li>
              <li>משלוח המוצרים לכתובת שסופקה.</li>
              <li>שליחת עדכונים לגבי סטטוס ההזמנה.</li>
              <li>יצירת קשר במקרה של בעיה עם ההזמנה או הקובץ הגרפי.</li>
            </ul>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">3. שמירת קבצים גרפיים</h2>
            <p>הקבצים הגרפיים שאתם מעלים נשמרים בשרתים שלנו לתקופה מוגבלת לצורך ביצוע ההדפסה. אנו לא עושים כל שימוש אחר בקבצים אלו ולא חולקים אותם עם צדדים שלישיים, למעט בית הדפוס המבצע את העבודה.</p>

            <h2 className="text-2xl font-bold mt-8 mb-4">4. שיתוף מידע עם צדדים שלישיים</h2>
            <p>אנו לא נמכור, נסחור או נעביר את המידע האישי שלכם לצדדים שלישיים, למעט חברות שילוח לצורך אספקת ההזמנה. אנו דורשים מצדדים אלו לשמור על סודיות המידע.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">5. אבטחת מידע</h2>
            <p>אנו נוקטים באמצעי אבטחה סבירים כדי להגן על המידע האישי שלכם. עם זאת, חשוב לזכור כי שום אמצעי אבטחה אינו מושלם ולא ניתן להבטיח הגנה מלאה.</p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;