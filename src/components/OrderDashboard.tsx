import React, { useEffect, useState } from 'react';
import { FileText, PlusCircle, Search, LogOut, PenTool } from 'lucide-react';
import { OrderForm } from './OrderForm';
import { SignaturePad } from './SignaturePad';
import { useOrderStore } from '../stores/orderStore';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import { addSignatureToPdf } from '../utils/pdfUtils';
 

export function OrderDashboard() {
  const { orders, loading, loadOrders, addSignature, updateOrderPdf } = useOrderStore();
  const { user, signOut } = useAuthStore();
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleSignature = async (signatureData: string) => {
    if (!selectedOrder) return;

    try {
      // Get the order's PDF URL
      const order = orders.find(o => o.id === selectedOrder);
      if (!order?.pdfUrl) {
        throw new Error('PDF not found');
      }

      // First add signature to the database
      await addSignature(selectedOrder, signatureData);

      // Then add signature to the PDF
      const updatedPdfUrl = await addSignatureToPdf({
        pdfUrl: order.pdfUrl,
        signatureData,
        signerRole: user?.role || '',
        signerName: user?.fullName || '',
        coordinates: getSignatureCoordinates(user?.role || '') // Helper to determine where to place signature
      });

      // Update the order with new PDF URL
      await updateOrderPdf(selectedOrder, updatedPdfUrl);
      
      toast.success('Signature added successfully');
      setShowSignaturePad(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Signature error:', error);
      toast.error('Failed to add signature');
    }
  };

  // Helper function to determine signature placement based on role
  const getSignatureCoordinates = (role: string): { x: number; y: number } => {
    switch (role) {
      case 'director':
        return { x: 400, y: 100 }; // Adjust these values based on your PDF layout
      case 'secretary':
        return { x: 400, y: 200 };
      case 'responsible':
        return { x: 400, y: 300 };
      default:
        return { x: 400, y: 400 };
    }
  };

  const filteredOrders = orders.filter(order =>
    order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Order Management System
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Welcome, {user?.fullName} ({user?.role})
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {user?.role === "staff" && (
                <button
                  onClick={() => setShowOrderForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusCircle className="mr-2 h-5 w-5" />
                  New Order
                </button>
              )}
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <LogOut className="mr-2 h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Signatures
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {order.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.submittedBy}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {order.department}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${
                        order.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : order.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : order.status === "processing"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {order.signatures.length} / 2
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    {["director", "secretary", "responsible"].includes(
                      user?.role || ""
                    ) && (
                      <button
                        onClick={() => {
                          setSelectedOrder(order.id);
                          setShowSignaturePad(true);
                        }}
                        className="inline-flex items-center text-blue-600 hover:text-blue-900"
                        disabled={order.status === "approved"}
                      >
                        <PenTool className="h-4 w-4 mr-1" />
                        Sign
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {showOrderForm && <OrderForm onCancel={() => setShowOrderForm(false)} />}

      {showSignaturePad && (
        <SignaturePad
          onSave={handleSignature}
          onCancel={() => {
            setShowSignaturePad(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
}