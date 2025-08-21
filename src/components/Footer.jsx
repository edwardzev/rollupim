import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-bold mb-4 gradient-text">
              רולאפ להרכבה עצמית
            </h3>
            <p className="text-gray-300 leading-relaxed">
              הפתרון הכי זול ומקצועי לרולאפים בישראל. איכות גבוהה במחיר שלא תמצאו בשום מקום אחר.
            </p>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h4 className="text-lg font-semibold mb-4">יצירת קשר</h4>
            <div className="space-y-3">
              
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-blue-400 ml-3" />
                <span>info@rollup.co.il</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-blue-400 ml-3" />
                <span>האורגים 32, חולון</span>
              </div>
            </div>
          </motion.div>

          {/* Working Hours */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h4 className="text-lg font-semibold mb-4">שעות פעילות</h4>
            <div className="space-y-2">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-blue-400 ml-3" />
                <div>
                  <div>א׳-ה׳: 9:00-18:00</div>
                  
                  <div>ש׳: סגור</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <h4 className="text-lg font-semibold mb-4">מידע וקישורים</h4>
            <div className="space-y-2">
              <div>
                <Link to="/" onClick={() => window.scrollTo(0, 0)} className="text-gray-300 hover:text-white transition-colors">
                  עמוד הבית
                </Link>
              </div>
              <div>
                <Link to="/terms-of-service" className="text-gray-300 hover:text-white transition-colors">
                  תנאי שימוש
                </Link>
              </div>
              <div>
                <Link to="/privacy-policy" className="text-gray-300 hover:text-white transition-colors">
                  מדיניות פרטיות
                </Link>
              </div>
              <div>
                <Link to="/returns-policy" className="text-gray-300 hover:text-white transition-colors">
                  החזרות והחלפות
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="border-t border-gray-700 mt-12 pt-8 text-center"
        >
          <p className="text-gray-400">
            © 2024 רולאפ להרכבה עצמית. כל הזכויות שמורות.
          </p>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;