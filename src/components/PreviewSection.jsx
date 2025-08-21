import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, Upload, FileCheck, Ruler, Image as ImageIcon, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

const PreviewSection = () => {
  const [previewImage, setPreviewImage] = useState(null);
  const [fileQuality, setFileQuality] = useState(null);
  const { toast } = useToast();
  
  const REQUIRED_ASPECT_RATIO = 200 / 85;
  const MIN_WIDTH = 1270; // 85cm at 150DPI
  const MIN_HEIGHT = 3000; // 200cm at 150DPI

  useEffect(() => {
    localStorage.removeItem('uploaded_file');
    localStorage.removeItem('file_quality_status');
  }, []);

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Type & size
    const ALLOWED = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf'];
    const MAX_MB = 10;
    if (!ALLOWED.includes(file.type)) {
      setFileQuality({ status: 'bad', issues: ['פורמט הקובץ אינו נתמך (PDF, JPG, PNG, WEBP).'] });
      localStorage.setItem('file_quality_status', 'bad');
      setPreviewImage(null);
      toast({ title: 'קובץ לא נתמך', description: 'PDF, JPG, PNG, WEBP בלבד.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setFileQuality({ status: 'bad', issues: [`קובץ גדול מדי (מקס׳ ${MAX_MB}MB).`] });
      localStorage.setItem('file_quality_status', 'bad');
      setPreviewImage(null);
      toast({ title: 'קובץ גדול מדי', description: `מקס׳ ${MAX_MB}MB`, variant: 'destructive' });
      return;
    }

    // Image checks (AR + resolution) and preview
    const REQUIRED_AR = 200/85;
    const TOL = 0.10;
    const MIN_W = 1270, MIN_H = 3000;

    if (file.type.startsWith('image/')) {
      const dataUrl = await new Promise((ok, err) => {
        const fr = new FileReader();
        fr.onload = () => ok(fr.result);
        fr.onerror = () => err(new Error('שגיאה בקריאת הקובץ'));
        fr.readAsDataURL(file);
      });

      const dims = await new Promise((ok) => {
        const img = new Image();
        img.onload = () => ok({ w: img.width, h: img.height });
        img.onerror = () => ok(null);
        img.src = dataUrl;
      });

      const issues = [];
      if (!dims) {
        issues.push('שגיאת קריאה – לא ניתן לקרוא את התמונה');
      } else {
        if (dims.w < MIN_W || dims.h < MIN_H) {
          issues.push(`הרזולוציה נמוכה מדי (נדרש לפחות ‎${MIN_W}×${MIN_H} פיקסלים)`);
        }
        const ar = dims.h / dims.w;
        if (ar < REQUIRED_AR*(1-TOL) || ar > REQUIRED_AR*(1+TOL)) {
          issues.push('הפרופורציות לא מתאימות (צריך יחס של ‎200/85)');
        }
      }

      if (issues.length) {
        setFileQuality({ status: 'bad', issues });
        localStorage.setItem('file_quality_status', 'bad');
        setPreviewImage(null);
        return;
      }

      // Passed: show preview and queue for checkout
      setPreviewImage(dataUrl);
      setFileQuality({ status: 'good', message: 'הקובץ עבר בדיקה ויועלה לאחר לחיצה על "המשך לתשלום".' });
      localStorage.setItem('file_quality_status', 'good');
      localStorage.setItem('primary_file_meta', JSON.stringify({ name: file.name, size: file.size }));
      const { setMainFile } = await import('@/lib/pendingUploads');
      setMainFile(file);
      toast({ title: 'הקובץ מוכן', description: 'הקובץ יועלה בעת התשלום.' });
      return;
    }

    // PDF: queue without preview
    setFileQuality({ status: 'good', message: 'קובץ PDF התקבל. ההעלאה תתבצע לאחר לחיצה על "המשך לתשלום".' });
    localStorage.setItem('file_quality_status', 'good');
    localStorage.setItem('primary_file_meta', JSON.stringify({ name: file.name, size: file.size }));
    const { setMainFile } = await import('@/lib/pendingUploads');
    setMainFile(file);
    setPreviewImage(null);
    toast({ title: 'הקובץ מוכן', description: 'קובץ PDF יועלה בעת התשלום.' });
  };

  const fileInstructions = [
    { icon: Ruler, text: "גודל: 85 ס\"מ רוחב, 200 ס\"מ גובה" },
    { icon: FileCheck, text: "רזולוציה: 150 DPI לפחות" },
    { icon: ImageIcon, text: "פורמט: PDF, JPG, PNG" }
  ];
  
  const QualityReport = () => {
    if (!fileQuality) return null;

    if (fileQuality.status === 'good') {
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 rounded-lg bg-green-100 border border-green-300 text-green-800 flex items-start">
          <CheckCircle2 className="h-5 w-5 ml-3 flex-shrink-0 mt-1" />
          <div>
            <p className="font-bold">הקובץ מתאים!</p>
            <p>{fileQuality.message}</p>
          </div>
        </motion.div>
      );
    }
    
    if (fileQuality.status === 'bad') {
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 rounded-lg bg-red-100 border border-red-300 text-red-800">
           <div className="flex items-start">
            <XCircle className="h-5 w-5 ml-3 flex-shrink-0 mt-1" />
            <div>
              <p className="font-bold">הקובץ לא מתאים</p>
              <ul className="list-disc list-inside mt-1">
                {fileQuality.issues.map((issue, i) => <li key={i}>{issue}</li>)}
              </ul>
            </div>
           </div>
           <div className="mt-3 pt-3 border-t border-red-200 flex items-start text-sm">
             <AlertTriangle className="h-4 w-4 ml-2 flex-shrink-0 mt-0.5" />
             <p>אנו ממליצים בחום להחליף את הקובץ. קובץ איכותי יותר יוביל לתוצאה טובה יותר.</p>
           </div>
        </motion.div>
      );
    }
    
    return null;
  };


  return (
    <section id="preview" className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            2. העלו גרפיקה וצפו בתצוגה מקדימה
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            העלו את הגרפיקה שלכם וראו איך היא תיראה על הרולאפ בגדול ובברור.
          </p>
        </motion.div>

        <div className="flex flex-col items-center gap-12">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="w-full max-w-2xl"
          >
            <div className="bg-white rounded-2xl p-8 shadow-lg h-full">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                הוראות להכנת הקובץ
              </h3>
              <ul className="space-y-4 mb-8">
                {fileInstructions.map((item, index) => (
                  <li key={index} className="flex items-center text-lg">
                    <item.icon className="h-6 w-6 text-blue-600 ml-4 flex-shrink-0" />
                    <span className="text-gray-700">{item.text}</span>
                  </li>
                ))}
              </ul>
              
              <div className="file-upload-area rounded-xl p-8 text-center border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors flex flex-col justify-center">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="preview-upload"
                />
                <label htmlFor="preview-upload" className="cursor-pointer">
                  <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg text-gray-600 mb-2">
                    {previewImage ? "החלף קובץ" : "לחצו להעלאת תמונה"}
                  </p>
                  <p className="text-sm text-gray-500">
                    PDF, JPG, PNG עד 10MB
                  </p>
                </label>
              </div>
               <QualityReport />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="w-full"
          >
            <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center flex items-center justify-center">
                <Eye className="ml-2 h-6 w-6" />
                תצוגה מקדימה
              </h3>
              
              <div className="relative w-full max-w-2xl mx-auto">
                <img  alt="Rollup banner mockup in a flower shop setting" src="https://horizons-cdn.hostinger.com/9ecc1982-6818-4569-adec-da0cfff42911/adcd3a03c0be670e8bf9cb07340156e1.png" />
                
                {previewImage ? (
                  <div 
                    className="absolute overflow-hidden" 
                    style={{ 
                      top: '13.89%', 
                      left: '36.52%', 
                      width: '26.23%', 
                      height: '76.58%',
                      transform: 'perspective(1500px) rotateY(-0.5deg)'
                    }}
                  >
                    <motion.img
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      src={previewImage}
                      alt="תצוגה מקדימה של הגרפיקה"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-center text-gray-500 p-4">
                     <div 
                      className="absolute flex items-center justify-center" 
                      style={{ 
                        top: '13.89%', 
                        left: '36.52%', 
                        width: '26.23%', 
                        height: '76.58%',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)'
                      }}
                     >
                       <p className="font-semibold text-gray-600 px-4">הגרפיקה שלכם תופיע כאן</p>
                     </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PreviewSection;