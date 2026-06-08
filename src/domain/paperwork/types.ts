export interface PaperworkCredential {
  id: string;
  type: 'license' | 'permit' | 'clubMembership' | 'medicalCertificate' | 'matchDocument' | 'other';
  title: string;
  referenceNumber?: string;
  issuingAuthority?: string;
  validFrom?: string;
  validUntil?: string;
  reminderDate?: string;
  notes?: string;
  attachmentIds?: string[];
  createdAt: string;
  updatedAt: string;
}
