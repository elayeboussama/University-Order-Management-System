import { Dialog } from "@headlessui/react";
import { X } from "lucide-react";
import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

interface SignaturePadProps {
  open: boolean;
  onSave: (signatureData: string) => void;
  onClose: () => void;
}

export function SignaturePad({ open, onSave, onClose }: SignaturePadProps) {
  const signaturePad = useRef<SignatureCanvas>(null);

  const handleClear = () => {
    signaturePad.current?.clear();
  };

  const handleSave = () => {
    if (signaturePad.current?.isEmpty()) {
      return;
    }

    // Get signature as PNG data URL, trimmed of white space
    const signatureData = signaturePad.current
      ?.getTrimmedCanvas()
      .toDataURL("image/png");
    if (signatureData) {
      onSave(signatureData);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-xl shadow-lg">
          <div className="flex justify-between items-center p-6 border-b">
            <Dialog.Title className="text-lg font-semibold">
              Add Your Signature
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            <div className="border rounded-lg p-2 mb-4 bg-white">
              <SignatureCanvas
                ref={signaturePad}
                canvasProps={{
                  className: "signature-canvas w-full h-[200px]",
                  style: {
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.375rem",
                    touchAction: "none",
                  },
                }}
                backgroundColor="white"
                penColor="black"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={handleClear}
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear
              </button>
              <button
                onClick={handleSave}
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save Signature
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
