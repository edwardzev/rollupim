import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, File, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { setAdditionalFile } from '@/lib/pendingUploads';

// יעד רולאפ: 85×200 ס״מ
const ROLLUP_W_CM = 85;
const ROLLUP_H_CM = 200;
const REQUIRED_AR_H_OVER_W = ROLLUP_H_CM / ROLLUP_W_CM; // ≈ 2.3529
const AR_TOLERANCE = 0.10; // ±10%

// דרישות מינימום (להתיישר עם ההעלאה הראשונה)
const MIN_W_PX = 1270;
const MIN_H_PX = 3000;
const MAX_MB = 10;

const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'application/pdf'
];

const AdditionalUploadsSection = ({ requiredUploads, onFilesUpdate }) => {
  // UI state only (no Cloudinary URL here anymore)
  // value: { original_name, size, pending: true } | null
  const [files, setFiles] = useState({});
  // validation feedback per slot
  // { file_2: {status:'ok'|'error', issues:[], details:[], dims:{w,h}, ar:number} }
  const [results, setResults] = useState({});
  const { toast } = useToast();

  // initialize slots: file_2 .. file_{requiredUploads+1}
  useEffect(() => {
    const initial = {};
    for (let i = 2; i <= requiredUploads + 1; i++) initial[`file_${i}`] = null;
    setFiles(initial);
    setResults({});
  }, [requiredUploads]);

  // bubble up (for parent summary etc.)
  useEffect(() => {
    onFilesUpdate && onFilesUpdate(files);
  }, [files, onFilesUpdate]);

  const getImageDims = (file) =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve({ w: img.width, h: img.height });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });

  const fail = (key, msgs) => {
    setResults(prev => ({ ...prev, [key]: { status: 'error', issues: Array.isArray(msgs) ? msgs : [msgs] } }));
  };

  const ok = (key, details, dims = null, ar = null) => {
    setResults(prev => ({ ...prev, [key]: { status: 'ok', details, issues: [], dims, ar } }));
  };

  const handleFileChange = async (e, key) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResults(prev => ({ ...prev, [key]: undefined })); // reset panel

    const issues = [];

    // 1) FILE TYPE
    if (!ALLOWED_TYPES.includes(file.type)) {
      issues.push('פורמט לא נתמך (PDF, JPG, PNG, WEBP)');
    }

    // 2) FILE SIZE
    if (file.size > MAX_MB * 1024 * 1024) {
      issues.push(`קובץ גדול מדי (מקס׳ ${MAX_MB}MB)`);
    }

    // 3) (Images only) RESOLUTION + ASPECT RATIO
    let dims = null;
    let ar = null;
    if (file.type.startsWith('image/')) {
      dims = await getImageDims(file);
      if (!dims) {
        issues.push('שגיאת קריאה – לא ניתן לקרוא את התמונה');
      } else {
        if (dims.w < MIN_W_PX || dims.h < MIN_H_PX) {
          issues.push(`הרזולוציה נמוכה מדי (נדרש לפחות ‎${MIN_W_PX}×${MIN_H_PX} פיקסלים)`);
        }
        ar = dims.h / dims.w;
        const minAR = REQUIRED_AR_H_OVER_W * (1 - AR_TOLERANCE);
        const maxAR = REQUIRED_AR_H_OVER_W * (1 + AR_TOLERANCE);
        if (ar < minAR || ar > maxAR) {
          issues.push(`הפרופורציות לא מתאימות (צריך יחס של ‎${ROLLUP_H_CM}/${ROLLUP_W_CM})`);
        }
      }
    }

    if (issues.length) {
      fail(key, issues);
      // remove from queue if previously set
      setAdditionalFile(key, null);
      setFiles(prev => ({ ...prev, [key]: null }));
      return;
    }

    // ✅ Valid: put the raw File into the in-memory queue; UI shows “ready”
    setAdditionalFile(key, file);
    setFiles(prev => ({
      ...prev,
      [key]: { original_name: file.name, size: file.size, pending: true }
    }));

    if (file.type.startsWith('image/')) {
      ok(
        key,
        [
          'פורמט תקין',
          `רזולוציה מספקת: ‎${dims.w}×${dims.h}px`,
          `יחס פרופורציות תקין: ${ar.toFixed(2)} ≈ ‎${ROLLUP_H_CM}/${ROLLUP_W_CM}`,
          'הקובץ יועלה לאחר לחיצה על "המשך לתשלום".'
        ],
        dims,
        ar
      );
    } else {
      ok(key, [
        'פורמט PDF תקין',
        'לתשומת לב: בדיקת רזולוציה/יחס ל-PDF תבוצע בשלבי העימוד.',
        'הקובץ יועלה לאחר לחיצה על "המשך לתשלום".'
      ]);
    }
  };

  const removeFile = (key) => {
    setAdditionalFile(key, null);
    setFiles(prev => ({ ...prev, [key]: null }));
    setResults(prev => ({ ...prev, [key]: undefined }));
    toast({ title: 'הקובץ הוסר', description: `הוסר קובץ עבור ${key}` });
  };

  const FeedbackPanel = ({ result }) => {
    if (!result) return null;

    if (result.status === 'error') {
      return (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">הקובץ לא מתאים</span>
          </div>
          <ul className="list-disc mr-5 space-y-1">
            {result.issues.map((msg, i) => <li key={i}>{msg}</li>)}
          </ul>
          <div className="mt-3 text-xs text-red-700">
            אנו ממליצים בתחום להחליף את הקובץ. קובץ איכותי יותר יוביל לתוצאה טובה יותר.
          </div>
        </div>
      );
    }

    return (
      <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="h-5 w-5" />
          <span className="font-semibold">הקובץ עבר בדיקה ומוכן להעלאה בתשלום</span>
        </div>
        <ul className="list-disc mr-5 space-y-1">
          {result.details.map((msg, i) => <li key={i}>{msg}</li>)}
        </ul>
      </div>
    );
  };

  const renderFileInput = (key, index) => {
    const item = files[key];       // null or { original_name, size, pending: true }
    const result = results[key];

    return (
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="bg-white p-4 rounded-xl border border-gray-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <UploadCloud className="h-5 w-5 text-blue-600" />
            </div>
            <span className="font-semibold text-gray-800">קובץ לרולאפ מספר {index + 2}</span>
          </div>

          <input
            type="file"
            id={key}
            className="hidden"
            accept={ALLOWED_TYPES.join(',')}
            onChange={(e) => handleFileChange(e, key)}
          />
          <label htmlFor={key} className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800 transition">
            {item ? "החלף קובץ" : "בחר קובץ"}
          </label>
        </div>

        {item && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
            className="flex items-center justify-between p-2 pl-3 bg-slate-50 rounded-lg border border-slate-200 text-sm"
          >
            <div className="flex items-center gap-2 text-slate-800">
              <File className="h-4 w-4" />
              <span className="font-medium truncate max-w-xs">{item.original_name}</span>
            </div>
            <button
              type="button"
              onClick={() => removeFile(key)}
              className="p-1 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {/* ▼ משוב מתחת לאזור ההעלאה – כמו בהעלאה הראשונה */}
        <FeedbackPanel result={result} />
      </motion.div>
    );
  };

  const allFilesReady = Object.values(files).every(v => !v || v.pending);

  return (
    <section id="additional-uploads" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            העלאת קבצים נוספים
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            אנא העלו קובץ גרפי עבור כל יחידה נוספת שהזמנתם.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto space-y-4">
          {Object.keys(files).map((key, index) => renderFileInput(key, index))}
        </div>

       
      </div>
    </section>
  );
};

export default AdditionalUploadsSection;
