import React, { useState } from 'react';
import { Upload } from "lucide-react";
import { supabase } from '../lib/supabase';
import { useOrderStore } from '../stores/orderStore';
import toast from "react-hot-toast";

interface OrderFormProps {
  onCancel: () => void;
}

export function OrderForm({ onCancel }: OrderFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error("Please upload a file");
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Upload the file first
      const { data: fileData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(`orders/${Date.now()}-${file.name}`, file);

      if (uploadError) throw uploadError;

      // Step 2: Get the public URL of the uploaded file
      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(fileData.path);

      // Step 3: Create the order with the file URL
      await useOrderStore.getState().createOrder({
        title,
        description,
        department,
        documentPath: fileData.path,
        pdfUrl: publicUrl,
      });

      toast.success("Order created successfully");
      onCancel(); // Close the form
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Department
        </label>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        >
          <option value="">Select Department</option>
          <option value="academic">Academic Affairs</option>
          <option value="admin">Administration</option>
          <option value="finance">Finance</option>
          <option value="hr">Human Resources</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Document Scan
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">
                <span>Upload a file</span>
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            {file && <p className="text-sm text-gray-500">{file.name}</p>}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Order"}
        </button>
      </div>
    </form>
  );
}