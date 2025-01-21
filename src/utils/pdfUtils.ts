import { PDFDocument, rgb } from 'pdf-lib';
import { supabase } from '../lib/supabase';

interface SignaturePdfParams {
  pdfUrl: string;
  signatureData: string;
  signerRole: string;
  signerName: string;
  coordinates: { x: number; y: number };
}

export async function addSignatureToPdf({
  pdfUrl,
  signatureData,
  signerRole,
  signerName,
  coordinates
}: SignaturePdfParams): Promise<string> {
  // Fetch the PDF
  const pdfResponse = await fetch(pdfUrl);
  const pdfBytes = await pdfResponse.arrayBuffer();

  // Load the PDF document
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  // Convert signature data URL to image
  const signatureImage = await pdfDoc.embedPng(signatureData);
  
  // Add signature image to the PDF
  firstPage.drawImage(signatureImage, {
    x: coordinates.x,
    y: coordinates.y,
    width: 100, // Adjust size as needed
    height: 50,
  });

  // Add signature metadata (name and role)
  firstPage.drawText(`${signerName} (${signerRole})`, {
    x: coordinates.x,
    y: coordinates.y - 20,
    size: 10,
    color: rgb(0, 0, 0),
  });

  // Save the modified PDF
  const modifiedPdfBytes = await pdfDoc.save();

  // Convert to base64 or upload to your storage and return the URL
  // This is just an example - you'll need to implement your own storage solution
  const base64String = Buffer.from(modifiedPdfBytes).toString('base64');
  const newPdfUrl = await uploadPdfToStorage(base64String); // You'll need to implement this

  return newPdfUrl;
}

async function uploadPdfToStorage(base64Pdf: string): Promise<string> {
  try {
    // Convert base64 to Blob
    const pdfBlob = base64ToBlob(base64Pdf, 'application/pdf');
    
    // Generate a unique filename
    const filename = `signatures/${Date.now()}-signed.pdf`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filename, pdfBlob, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filename);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw new Error('Failed to upload signed PDF');
  }
}

// Helper function to convert base64 to Blob
function base64ToBlob(base64: string, type: string): Blob {
  const byteCharacters = Buffer.from(base64, 'base64').toString('binary');
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
} 