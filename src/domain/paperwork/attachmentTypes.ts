export interface PaperworkAttachment {
  id: string;
  credentialId: string;
  fileName: string;
  mimeType: string;
  size: number;
  content: Blob;
  createdAt: string;
  updatedAt: string;
}
