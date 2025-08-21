import React from 'react';
import { Helmet } from 'react-helmet-async';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText } from 'lucide-react';

const TermsOfService = () => {
  return (
    <div className="bg-gray-50">
       <Helmet>
        <title>תנאי שימוש - רולאפ להרכבה עצמית</title>
        <meta name="description" content="תנאי השימוש של אתר רולאפ להרכבה עצמית. קראו את התנאים לפני ביצוע הזמנה." />
        <link rel="canonical" href="https://your-domain.com/terms-of-service" />
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
             <FileText className="h-16 w-16 mx-auto text-blue-500 mb-4" />
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900">תנאי שימוש</h1>
            <p className="text-lg text-gray-600 mt-2">עודכן לאחרונה: 8 באוגוסט 2025</p>
          </div>
          
          <div className="prose prose-lg max-w-none text-right" style={{direction: 'rtl'}}>
            <h2 className="text-2xl font-bold mt-8 mb-4">1. כללי</h2>
            <p>ברוכים הבאים לאתר "רולאפ להרכבה עצמית". השימוש באתר ובשירותים המוצעים בו כפוף לתנאים המפורטים להלן. אנא קראו אותם בעיון. עצם השימוש באתר מהווה הסכמה לתנאים אלו.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">2. אחריות המשתמש על התוכן</h2>
            <p>המשתמש מצהיר ומתחייב כי הוא בעל כל זכויות הקניין הרוחני (לרבות זכויות יוצרים) בקבצים הגרפיים שהוא מעלה לאתר, או שקיבל הרשאה מפורשת מבעל הזכויות להשתמש בהם לצורך ההדפסה. האחריות המלאה על התוכן המועלה חלה על המשתמש בלבד. האתר לא יישא באחריות כלשהי להפרת זכויות יוצרים או כל זכות אחרת הקשורה לקבצים שהועלו על ידי המשתמש.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">3. איכות הקובץ</h2>
            <p>המשתמש אחראי לספק קובץ גרפי באיכות הדפסה נדרשת (כמפורט בהוראות באתר). האתר מספק כלי לבדיקת איכות בסיסית, אך התוצאה הסופית תלויה באיכות הקובץ המקורי. ייתכנו הבדלים קלים בין הצבעים הנראים על המסך לבין הצבעים במוצר המודפס בפועל.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">4. ביצוע הזמנות ותשלום</h2>
            <p>השלמת הזמנה מותנית בקבלת אישור מחברת האשראי. המחירים באתר כוללים מע"מ כחוק. האתר שומר לעצמו את הזכות לשנות מחירים ותנאים בכל עת.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">5. הגבלת אחריות</h2>
            <p>השירות באתר ניתן "כפי שהוא" (AS IS). הנהלת האתר לא תישא באחריות לכל נזק ישיר או עקיף שייגרם למשתמש כתוצאה מהשימוש באתר או מהסתמכות על המידע המופיע בו. האחריות על המוצר מוגבלת לעלות המוצר בלבד.</p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default TermsOfService;