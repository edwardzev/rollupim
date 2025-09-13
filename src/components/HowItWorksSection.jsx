import React from 'react';
import { motion } from 'framer-motion';
import { Upload, Package, Wrench } from 'lucide-react';

const HowItWorksSection = () => {
  const steps = [
    {
      icon: Upload,
      title: 'מעלים קובץ גרפי',
      description: 'מעלים את הקובץ הגרפי שלכם (JPG, PNG, PDF) מאשרים תצוגה מקדימה',
      color: 'bg-blue-500'
    },
    {
      icon: Package,
      title: 'מקבלים סטנד והדפסה בנפרד',
      description: 'אנחנו שולחים לכם את הסטנד והבד המודפס בנפרד עם הוראות הרכבה',
      color: 'bg-green-500'
    },
    {
      icon: Wrench,
      title: 'הרכבה עצמית פשוטה',
      description: 'הרכיבו את הרולאפ בעצמכם תוך 5 דקות עם ההוראות הפשוטות',
      color: 'bg-purple-500'
    }
  ];

  return (
    <section id="how" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            איך זה עובד?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            תהליך פשוט ומהיר שחוסך לכם כסף ונותן לכם שליטה מלאה
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-center h-full">
                <div className={`${step.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6`}>
                  <step.icon className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {step.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
                
                {/* Step number */}
                <div className="absolute -top-4 -right-4 bg-gray-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 left-full w-8 h-0.5 bg-gray-300 transform -translate-y-1/2 z-0"></div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Videos: two side-by-side within same width */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="bg-white rounded-2xl p-6 shadow-lg max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Video 1: Assembly */}
              <div className="rounded-xl overflow-hidden">
                <h3 className="text-lg font-bold text-gray-900 mb-2">התקנת רולאפ</h3>
                <div className="aspect-video rounded-xl overflow-hidden">
                  <video
                    src="/rollup-assembly.mp4"
                    controls
                    className="w-full h-full object-cover rounded-xl"
                  >
                    הדפדפן שלך לא תומך בווידאו
                  </video>
                </div>
              </div>

              {/* Video 2: Canva file prep */}
              <div className="rounded-xl overflow-hidden">
                <h3 className="text-lg font-bold text-gray-900 mb-2">הכנת קובץ</h3>
                <div className="aspect-video rounded-xl overflow-hidden">
                  <video
                    src={`${import.meta.env.BASE_URL}file-prepare.mp4`}
                    controls
                    className="w-full h-full object-cover rounded-xl"
                  >
                    הדפדפן שלך לא תומך בווידאו
                  </video>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
