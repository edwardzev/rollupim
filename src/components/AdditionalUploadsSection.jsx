import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, File, X, CheckCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

const AdditionalUploadsSection = ({ requiredUploads, onFilesUpdate }) => {
  const [files, setFiles] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    const initialFiles = {};
    for (let i = 2; i <= requiredUploads + 1; i++) {
        initialFiles[`file_${i}`] = null;
    }
    setFiles(initialFiles);
  }, [requiredUploads]);

  useEffect(() => {
    onFilesUpdate(files);
  }, [files, onFilesUpdate]);

  const handleFileChange = (e, key) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "קובץ גדול מדי",
          description: "אנא העלו קובץ קטן מ-10MB.",
          variant: "destructive",
        });
        return;
      }
      setFiles(prev => ({ ...prev, [key]: file }));
      toast({
          title: "הקובץ הועלה!",
          description: `${file.name}`,
      });
    }
  };

  const removeFile = (key) => {
    setFiles(prev => ({ ...prev, [key]: null }));
  };

  const renderFileInput = (key, index) => {
    const file = files[key];
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
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => handleFileChange(e, key)}
          />
          <label htmlFor={key} className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800 transition">
            {file ? "החלף קובץ" : "בחר קובץ"}
          </label>
        </div>
        {file && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
            className="flex items-center justify-between p-2 pl-3 bg-green-50 rounded-lg border border-green-200 text-sm"
          >
            <div className="flex items-center gap-2 text-green-800">
              <File className="h-4 w-4" />
              <span className="font-medium truncate max-w-xs">{file.name}</span>
            </div>
            <button onClick={() => removeFile(key)} className="p-1 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </motion.div>
    );
  };
  
  const allFilesUploaded = Object.values(files).every(f => f !== null);

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
        
        {allFilesUploaded && (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8 text-center flex items-center justify-center gap-2 text-green-600 font-semibold"
            >
                <CheckCircle className="h-5 w-5" />
                <span>כל הקבצים הועלו בהצלחה!</span>
            </motion.div>
        )}
      </div>
    </section>
  );
};

export default AdditionalUploadsSection;