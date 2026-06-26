export type StudentFileTypeCode = 'acceptance_letter' | 'offer_letter' | 'other';

export const STUDENT_FILE_TYPE_CODES: StudentFileTypeCode[] = [
  'acceptance_letter',
  'offer_letter',
  'other'
];

export function getStudentFileTypeLabel(
  fileType: string | undefined | null,
  t: {
    fileTypeAcceptanceLetter: string;
    fileTypeOfferLetter: string;
    fileTypeOther: string;
  },
  description?: string | null
): string | null {
  if (!fileType) return null;
  if (fileType === 'acceptance_letter') return t.fileTypeAcceptanceLetter;
  if (fileType === 'offer_letter') return t.fileTypeOfferLetter;
  if (fileType === 'other') {
    return description ? `${t.fileTypeOther}: ${description}` : t.fileTypeOther;
  }
  return fileType;
}
