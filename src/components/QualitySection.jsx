import React from 'react';
import { motion } from 'framer-motion';
import { Printer, HardHat, ShieldCheck, Lightbulb } from 'lucide-react';

const QualitySection = () => {
  const qualityFeatures = [
    {
      icon: Printer,
      title: 'הדפסה בטכנולוגיה מתקדמת',
      description: 'אנו משתמשים במדפסות דיגיטליות חדישות ובדיו איכותי כדי להבטיח צבעים חיים וחדות תמונה מקסימלית.',
      imageAlt: 'מדפסת דיגיטלית מתקדמת מדפיסה בד לרולאפ'
    },
    {
      icon: HardHat,
      title: 'בד עמיד ואיכותי',
      description: 'הבד שלנו עשוי מחומרים סינתטיים חזקים, עמידים בפני קריעה, דהייה ושינויי מזג אוויר, לשמירה על מראה מושלם לאורך זמן.',
      imageAlt: 'בד רולאפ עמיד ואיכותי עם טקסטורה'
    },
    {
      icon: ShieldCheck,
      title: 'סטנד אלומיניום יציב',
      description: 'הסטנדים שלנו מיוצרים מאלומיניום קל וחזק, עם בסיס רחב ויציב המונע התנדנדות ומבטיח עמידות לאורך שנים.',
      imageAlt: 'סטנד רולאפ מאלומיניום חזק ויציב'
    },
    {
      icon: Lightbulb,
      title: 'עיצוב חכם וקל להרכבה',
      description: 'כל רכיב תוכנן בקפידה להרכבה מהירה ופשוטה, ללא צורך בכלים מיוחדים, כך שתוכלו להקים את הרולאפ בקלות.',
      imageAlt: 'אדם מרכיב רולאפ בקלות ובמהירות'
    }
  ];

  return (
    <section className="py-20 bg-gray-100">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            איכות ללא פשרות
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            אנו מתחייבים למוצרים ברמה הגבוהה ביותר, מהבד ועד הסטנד
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {qualityFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.15 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
                <feature.icon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="max-w-3xl mx-auto bg-blue-600 text-white rounded-2xl p-8 shadow-xl">
            <h3 className="text-2xl font-bold mb-4">
              למה לבחור ברולאפ שלנו?
            </h3>
            <p className="text-blue-100 mb-6">
              כי אנחנו מאמינים שאיכות לא צריכה להיות יקרה. אנו מציעים לכם מוצר מקצועי ועמיד, במחיר המשתלם ביותר בישראל, עם נוחות הרכבה עצמית.
            </p>
            <img-replace alt="רולאפ מורכב ואיכותי בתערוכה" class="rounded-xl shadow-lg mx-auto" src="https://images.unsplash.com/photo-1517048676732-d65bc9c53441?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default QualitySection;