export type StudentFileTypeCode = 'acceptance_letter' | 'offer_letter' | 'receipt' | 'other';

export const STUDENT_FILE_TYPE_CODES: StudentFileTypeCode[] = [
  'acceptance_letter',
  'offer_letter',
  'receipt',
  'other'
];

export function getStudentFileTypeLabel(
  fileType: string | undefined | null,
  t: {
    fileTypeAcceptanceLetter: string;
    fileTypeOfferLetter: string;
    fileTypeReceipt: string;
    fileTypeOther: string;
  },
  description?: string | null
): string | null {
  if (!fileType) return null;
  if (fileType === 'acceptance_letter') return t.fileTypeAcceptanceLetter;
  if (fileType === 'offer_letter') return t.fileTypeOfferLetter;
  if (fileType === 'receipt') return t.fileTypeReceipt;
  if (fileType === 'other') {
    return description ? `${t.fileTypeOther}: ${description}` : t.fileTypeOther;
  }
  return fileType;
}
