import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Order } from '../types';

interface OrderState {
  orders: Order[];
  loading: boolean;
  loadOrders: () => Promise<void>;
  createOrder: (data: {
    title: string;
    description: string;
    department: string;
    documentPath: string;
    pdfUrl: string;
  }) => Promise<void>;
  addSignature: (orderId: string, signatureData: string) => Promise<void>;
  updateOrderPdf: (orderId: string, newPdfUrl: string) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  loading: false,

  loadOrders: async () => {
    set({ loading: true });
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          signatures (
            id,
            user_id,
            signature_data,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({
        orders: orders.map(order => ({
          id: order.id,
          title: order.title,
          description: order.description,
          submittedBy: order.submitted_by,
          submittedAt: order.submitted_at,
          status: order.status,
          documentPath: order.document_path,
          department: order.department,
          notes: order.notes,
          signatures: order.signatures.map((sig: any) => ({
            id: sig.id,
            orderId: order.id,
            userId: sig.user_id,
            signatureData: sig.signature_data,
            createdAt: sig.created_at
          }))
        }))
      });
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      set({ loading: false });
    }
  },

  createOrder: async (formData) => {
    try {
      const { error: orderError } = await supabase.from('orders').insert({
        title: formData.title,
        description: formData.description,
        department: formData.department,
        document_path: formData.documentPath,
        pdf_url: formData.pdfUrl,
        status: 'pending'
      });

      if (orderError) throw orderError;

      // Reload orders
      await get().loadOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  addSignature: async (orderId: string, signatureData: string) => {
    const { error } = await supabase.from('signatures').insert({
      order_id: orderId,
      signature_data: signatureData
    });

    if (error) throw error;

    // Reload orders to get updated status
    await get().loadOrders();
  },

  updateOrderPdf: async (orderId: string, newPdfUrl: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ pdfUrl: newPdfUrl })
        .eq('id', orderId);

      if (error) throw error;

      set((state) => ({
        orders: state.orders.map(order =>
          order.id === orderId
            ? { ...order, pdfUrl: newPdfUrl }
            : order
        )
      }));
    } catch (error) {
      console.error('Error updating PDF:', error);
      throw error;
    }
  }
}));