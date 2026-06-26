import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { STUDENT_FILE_TYPE_CODES, type StudentFileTypeCode } from '../constants/studentFileTypes';

interface StaffTypedFileUploadProps {
  onUpload: (file: File, fileType: StudentFileTypeCode, description: string) => Promise<boolean>;
  disabled?: boolean;
}

export const StaffTypedFileUpload: React.FC<StaffTypedFileUploadProps> = ({ onUpload, disabled }) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<StudentFileTypeCode | ''>('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setSelectedFile(null);
    setFileType('');
    setDescription('');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleUpload = async () => {
    setError('');
    if (!selectedFile) {
      setError(t.selectFileFirst);
      return;
    }
    if (!fileType) {
      setError(t.selectFileType);
      return;
    }
    if (fileType === 'other' && !description.trim()) {
      setError(t.fileTypeDescriptionRequired);
      return;
    }
    setUploading(true);
    try {
      const ok = await onUpload(selectedFile, fileType, description.trim());
      if (ok) reset();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-3 space-y-3">
      <p className="text-[11px] font-semibold text-blue-800">{t.uploadTypedDocument}</p>
      <div>
        <label className="block text-[11px] text-gray-600 mb-1">{t.fileTypeLabel}</label>
        <select
          value={fileType}
          onChange={(e) => setFileType(e.target.value as StudentFileTypeCode | '')}
          disabled={disabled || uploading}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">{t.selectFileType}</option>
          {STUDENT_FILE_TYPE_CODES.map((code) => (
            <option key={code} value={code}>
              {code === 'acceptance_letter'
                ? t.fileTypeAcceptanceLetter
                : code === 'offer_letter'
                  ? t.fileTypeOfferLetter
                  : t.fileTypeOther}
            </option>
          ))}
        </select>
      </div>
      {fileType === 'other' && (
        <div>
          <label className="block text-[11px] text-gray-600 mb-1">{t.fileTypeDescription}</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={disabled || uploading}
            placeholder={t.fileTypeDescription}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        className="w-full flex flex-col items-center justify-center border border-dashed border-blue-200 rounded-xl p-3 hover:border-blue-400 hover:bg-blue-50/50 transition-all disabled:opacity-50"
      >
        <span className="text-[11px] font-bold text-blue-600">
          {selectedFile ? selectedFile.name : t.selectDocumentFile}
        </span>
      </button>
      <button
        type="button"
        onClick={handleUpload}
        disabled={disabled || uploading || !selectedFile || !fileType}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-30 flex items-center justify-center gap-2"
      >
        <Upload size={14} />
        {uploading ? t.loading : t.uploadTypedDocument}
      </button>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
};
