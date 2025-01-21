export type UserRole = 'staff' | 'director' | 'secretary' | 'responsible';
export type OrderStatus = 'pending' | 'processing' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
}

export interface Order {
  id: string;
  title: string;
  description: string;
  submittedBy: string;
  submittedAt: string;
  status: OrderStatus;
  documentPath: string;
  department: string;
  notes?: string;
  signatures: Signature[];
  pdfUrl?: string;
}

export interface Signature {
  id: string;
  orderId: string;
  userId: string;
  signatureData: string;
  createdAt: string;
}