// src/lib/pendingUploads.js
export const pendingUploads = {
  main: null,          // File
  additional: {},      // key -> File
};

export const setMainFile = (file) => {
  pendingUploads.main = file || null;
};

export const setAdditionalFile = (key, file) => {
  if (file) pendingUploads.additional[key] = file;
  else delete pendingUploads.additional[key];
};

export const clearAllPendingUploads = () => {
  pendingUploads.main = null;
  pendingUploads.additional = {};
};
