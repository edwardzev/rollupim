import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FAQSection = () => {
  const [openFAQ, setOpenFAQ] = useState(0);

  const faqs = [
    {
      question: 'איך אני מרכיב את הרולאפ?',
      answer: 'ההרכבה פשוטה מאוד! אנחנו שולחים הוראות מפורטות עם תמונות. בעצם אתם פשוט מכניסים את הבד למנגנון הסטנד ומותחים אותו. זה לוקח בערך 5 דקות.'
    },
    {
      question: 'האם המוצר יציב?',
      answer: 'בהחלט! הסטנד עשוי מאלומיניום איכותי עם בסיס כבד שמבטיח יציבות מלאה. המוצר מיועד לשימוש מקצועי ועומד בכל התקנים.'
    },
    {
      question: 'אפשר להשתמש בבסיס עם גרפיקה אחרת בעתיד?',
      answer: 'כן! אחד היתרונות הגדולים של הרולאפ שלנו הוא שאפשר להחליף את הבד בקלות. אתם יכולים להזמין בדים נוספים ולהחליף לפי הצורך.'
    },
    {
      question: 'כמה זמן לוקח המשלוח?',
      answer: 'המשלוח לוקח 3-5 ימי עסקים לכל הארץ. אנחנו שולחים הודעת SMS עם מספר מעקב ברגע שהחבילה יוצאת.'
    },
    {
      question: 'איזה גדלים זמינים?',
      answer: 'אנחנו מציעים גדלים סטנדרטיים: 80x200 ס"מ, 85x.'
    },
    {
      question: 'מה קורה אם המוצר מגיע פגום?',
      answer: 'יש לנו אחריות מלאה על המוצר. אם משהו מגיע פגום או לא תקין, אנחנו מחליפים מיד ללא עלות נוספת.'
    },
    {
      question: 'אפשר לקבל עזרה עם הגרפיקה?',
      answer: 'אתם יכולים לצפות בסרטון ההדרכה באתר שלנו. אם תרצה עזרה נוספת, ניתן לפנות לפרילנסרים: - Dana: dana@gmail.com - Ofer: ofer@gmail.com - Alina: alina@gmail.com.'
    }
  ];

  return (
    <section id="faq" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            שאלות נפוצות
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            כל מה שרציתם לדעת על הרולאפ להרכבה עצמית
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="mb-4"
            >
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <button
                  onClick={() => setOpenFAQ(openFAQ === index ? -1 : index)}
                  className="w-full p-6 text-right flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg font-semibold text-gray-900">
                    {faq.question}
                  </span>
                  {openFAQ === index ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                
                <motion.div
                  initial={false}
                  animate={{
                    height: openFAQ === index ? 'auto' : 0,
                    opacity: openFAQ === index ? 1 : 0
                  }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6">
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="bg-blue-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              יש לכם שאלה נוספת?
            </h3>
            <p className="text-blue-100 mb-6">
              אנחנו כאן לעזור! צרו קשר ונענה על כל השאלות שלכם
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              
              <a
                href="mailto:info@rollupim.co.il"
                className="bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors"
              >
                info@rollupim.co.il
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;