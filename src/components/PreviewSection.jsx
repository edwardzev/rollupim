import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, Upload, FileCheck, Ruler, Image as ImageIcon, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

const PreviewSection = () => {
  const [previewImage, setPreviewImage] = useState(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [fileQuality, setFileQuality] = useState(null);
  const { toast } = useToast();

  const [assistOpen, setAssistOpen] = useState(false);
  const [assistFile, setAssistFile] = useState(null);
  const [assistNotes, setAssistNotes] = useState("");
  const [override, setOverride] = useState(false);
  const ASSIST_PRICE_ILS = 29;

  // Mockup overlay geometry constants (calibrated to banner area in background photo)
  const MOCK_LEFT = '30%';
  const MOCK_WIDTH = '40.3%';
  const MOCK_TOP = '16.0%';
  const MOCK_HEIGHT = '63%';

  // --- PDF preview via CDN-loaded pdf.js (avoids bundler issues) ---
  const PDFJS_CDN = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js';
  const PDFJS_WORKER_CDN = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

  const ensurePdfJs = () => new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN; } catch {}
      return resolve(window.pdfjsLib);
    }
    const s = document.createElement('script');
    s.src = PDFJS_CDN;
    s.async = true;
    s.onload = () => {
      if (!window.pdfjsLib) return reject(new Error('pdfjsLib not found after load'));
      try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN; } catch {}
      resolve(window.pdfjsLib);
    };
    s.onerror = () => reject(new Error('Failed to load pdf.js'));
    document.head.appendChild(s);
  });

  const renderPdfFirstPageToDataUrl = async (file, targetWidth = 850, targetHeight = 2000) => {
    const pdfjsLib = await ensurePdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    // Render PDF page to a temporary canvas
    const viewport = page.getViewport({ scale: 1.5 });
    const tempCanvas = document.createElement('canvas');
    const tctx = tempCanvas.getContext('2d');
    tempCanvas.width = Math.max(1, Math.floor(viewport.width));
    tempCanvas.height = Math.max(1, Math.floor(viewport.height));
    await page.render({ canvasContext: tctx, viewport }).promise;

    // Stretch into our mockup box size (no crop, as requested)
    const out = document.createElement('canvas');
    out.width = targetWidth;
    out.height = targetHeight;
    const octx = out.getContext('2d');
    octx.clearRect(0, 0, out.width, out.height);
    octx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
  };

  // Helper for smooth scroll to customer details with offset for sticky header
  const scrollToCustomerDetails = () => {
  const el = document.querySelector('#customer-details');
  if (!el) return;
  setTimeout(() => {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 60);
};
  
  const REQUIRED_ASPECT_RATIO = 200 / 85;
  const MIN_WIDTH = 1270; // 85cm at 150DPI
  const MIN_HEIGHT = 3000; // 200cm at 150DPI

  useEffect(() => {
    localStorage.removeItem('uploaded_file');
    const persistedOverride = localStorage.getItem('file_override') === 'true';
    setOverride(persistedOverride);
    if (persistedOverride) {
      localStorage.setItem('checkout_extra_ils', String(ASSIST_PRICE_ILS));
      window.dispatchEvent(new CustomEvent('checkout:extraFeeChanged', { detail: { type: 'file_fix', amount: ASSIST_PRICE_ILS } }));
    }
  }, []);

  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        try { URL.revokeObjectURL(previewPdfUrl); } catch {}
      }
    };
  }, [previewPdfUrl]);

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (override) {
      toast({ title: 'שירות הכנת קובץ מופעל', description: 'כבר בחרתם שנכין את הקובץ עבורכם (+' + ASSIST_PRICE_ILS + ' ₪).', variant: 'default' });
      return;
    }

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
      if (previewPdfUrl) {
        try { URL.revokeObjectURL(previewPdfUrl); } catch {}
      }
      setPreviewPdfUrl(null);
      setFileQuality({ status: 'good', message: 'הקובץ עבר בדיקה ויועלה לאחר לחיצה על "המשך לתשלום".' });
      localStorage.setItem('file_quality_status', 'good');
      localStorage.setItem('primary_file_meta', JSON.stringify({ name: file.name, size: file.size }));
      const { setMainFile } = await import('@/lib/pendingUploads');
      setMainFile(file);
      toast({ title: 'הקובץ מוכן', description: 'הקובץ יועלה בעת התשלום.' });
      return;
    }

    // PDF: queue and create a raster preview image (fallback to <object> if CDN fails)
    setFileQuality({ status: 'good', message: 'קובץ PDF התקבל. ההעלאה תתבצע לאחר לחיצה על "המשך לתשלום".' });
    localStorage.setItem('file_quality_status', 'good');
    localStorage.setItem('primary_file_meta', JSON.stringify({ name: file.name, size: file.size }));
    const { setMainFile } = await import('@/lib/pendingUploads');
    setMainFile(file);

    try {
      const imgUrl = await renderPdfFirstPageToDataUrl(file, 850, 2000);
      if (previewPdfUrl) { try { URL.revokeObjectURL(previewPdfUrl); } catch {} }
      setPreviewPdfUrl(null);
      setPreviewImage(imgUrl);
      toast({ title: 'הקובץ מוכן', description: 'נטענה תצוגה מקדימה אחידה מדף 1 של ה‑PDF.' });
      return;
    } catch (e) {
      // Fallback: embed PDF with browser viewer
      if (previewPdfUrl) { try { URL.revokeObjectURL(previewPdfUrl); } catch {} }
      const blobUrl = URL.createObjectURL(file);
      setPreviewImage(null);
      setPreviewPdfUrl(blobUrl);
      toast({ title: 'הקובץ מוכן', description: 'תצוגה מקדימה נטענת בדפדפן (חלופה).' });
      return;
    }
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
           <div className="mt-4 flex justify-center">
             <button
               type="button"
               onClick={() => setAssistOpen(true)}
               className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
             >
               צריך עזרה עם הכנת קובץ?
             </button>
           </div>
        </motion.div>
      );
    }
    
    return null;
  };

  const handleAssistFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setAssistFile(f);
  };

  const handleAssistSubmit = async () => {
    if (!assistFile) {
      toast({ title: 'בחרו קובץ', description: 'נדרש לצרף קובץ כדי שנוכל להכין אותו להדפסה.', variant: 'destructive' });
      return;
    }

    try {
      // queue assist file similarly to main file; use pendingUploads if available
      try {
        const mod = await import('@/lib/pendingUploads');
        if (mod.setAssistFile) mod.setAssistFile(assistFile);
        else if (mod.setAuxFile) mod.setAuxFile(assistFile);
        else if (mod.setMainFile) mod.setMainFile(assistFile); // fallback
      } catch {}

      localStorage.setItem('assist_file_meta', JSON.stringify({ name: assistFile.name, size: assistFile.size, notes: assistNotes }));
      localStorage.setItem('file_fix', 'true');
      localStorage.setItem('file_override', 'true');
      localStorage.setItem('file_quality_status', 'override');
      localStorage.setItem('checkout_extra_ils', String(ASSIST_PRICE_ILS));
      window.dispatchEvent(new CustomEvent('checkout:extraFeeChanged', { detail: { type: 'file_fix', amount: ASSIST_PRICE_ILS } }));

      setAssistOpen(false);
      setOverride(true);
      setPreviewImage(null);
      if (previewPdfUrl) {
        try { URL.revokeObjectURL(previewPdfUrl); } catch {}
      }
      setPreviewPdfUrl(null);

      toast({ title: 'קיבלנו את הקובץ', description: `נכין אותו להדפסה (+${ASSIST_PRICE_ILS} ₪) ותתקבל הוכחה להדפסה לפני ייצור.` });

      // Navigate to customer details
      scrollToCustomerDetails();
    } catch (e) {
      toast({ title: 'שגיאה בשליחה', description: 'נסו שוב או צרו קשר עם התמיכה.', variant: 'destructive' });
    }
  };

  const handleAssistReset = () => {
    localStorage.removeItem('assist_file_meta');
    localStorage.removeItem('file_fix');
    localStorage.removeItem('file_override');
    if (localStorage.getItem('file_quality_status') === 'override') {
      localStorage.removeItem('file_quality_status');
    }
    localStorage.removeItem('checkout_extra_ils');
    window.dispatchEvent(new CustomEvent('checkout:extraFeeChanged', { detail: { type: 'file_fix', amount: 0 } }));
    setOverride(false);
    setAssistNotes('');
    setAssistFile(null);
    if (previewPdfUrl) {
      try { URL.revokeObjectURL(previewPdfUrl); } catch {}
    }
    setPreviewPdfUrl(null);
    toast({ title: 'בוטל שירות הכנת קובץ', description: 'אפשר להעלות קובץ חדש לבדיקה.' });
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
          {override ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="w-full max-w-2xl"
            >
              <div className="bg-white rounded-2xl p-8 shadow-lg h-full">
                <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">שירות הכנת קובץ מופעל</h3>
                <p className="text-center text-gray-700 mb-4">נטפל בקובץ עבורכם (+{ASSIST_PRICE_ILS} ₪). ניתן להמשיך למילוי פרטי הלקוח.</p>
                <div className="flex justify-center gap-3">
                  <button onClick={() => {
                    scrollToCustomerDetails();
                  }} className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">המשיכו לפרטי הלקוח</button>
                  <button onClick={handleAssistReset} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">בטל שירות</button>
                </div>
              </div>
            </motion.div>
          ) : (
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
          )}

          {!override && (
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
                  <img  alt="Rollup banner mockup in a flower shop setting" src={`${import.meta.env.BASE_URL}mockups/flowershop-mockup.png`} />
                  {previewImage ? (
                    <div
                      className="absolute overflow-hidden"
                      style={{
                        top: MOCK_TOP,
                        left: MOCK_LEFT,
                        width: MOCK_WIDTH,
                        height: MOCK_HEIGHT,
                        transform: 'perspective(1500px) rotateY(-0.5deg)'
                      }}
                    >
                      <motion.img
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        src={previewImage}
                        alt="תצוגה מקדימה של הגרפיקה"
                        className="w-full h-full object-contain bg-white"
                      />
                    </div>
                  ) : previewPdfUrl ? (
                    <div
                      className="absolute overflow-hidden"
                      style={{
                        top: MOCK_TOP,
                        left: MOCK_LEFT,
                        width: MOCK_WIDTH,
                        height: MOCK_HEIGHT,
                        transform: 'perspective(1500px) rotateY(-0.5deg)'
                      }}
                    >
                      <object
                        data={`${previewPdfUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=page-fit`}
                        type="application/pdf"
                        className="w-full h-full"
                        aria-label="תצוגה מקדימה של PDF"
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-center text-gray-500 p-4">
                      <div
                        className="absolute flex items-center justify-center"
                        style={{
                          top: MOCK_TOP,
                          left: MOCK_LEFT,
                          width: MOCK_WIDTH,
                          height: MOCK_HEIGHT,
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
          )}
        </div>
      </div>
      {assistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAssistOpen(false)} />
          <div className="relative bg-white w-[92vw] max-w-lg rounded-2xl shadow-xl p-6">
            <button className="absolute top-3 left-3 text-gray-400 hover:text-gray-600" onClick={() => setAssistOpen(false)} aria-label="סגור">✕</button>
            <h4 className="text-2xl font-bold text-gray-900 mb-2 text-center">שירות הכנת קובץ להדפסה  </h4>
            <p className="text-gray-600 text-center mb-5">נבצע התאמות לקובץ (גודל, שוליים, המרה ל-PDF) ונשלח אישור לפני הדפסה. עלות השירות 29₪</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">צרפו קובץ</label>
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleAssistFileChange} className="block w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">הערות</label>
                <textarea value={assistNotes} onChange={(e)=>setAssistNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="מה חשוב שנדע…" />
              </div>
              <button onClick={handleAssistSubmit} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700">שלח קובץ</button>
              <p className="text-xs text-gray-500 text-center">עלות השירות תתווסף לתשלום הסופי. השירות אופציונלי – ניתן גם להתאים קובץ עצמאית ללא תוספת תשלום.</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PreviewSection;
     