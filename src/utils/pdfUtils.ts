import { PDFDocument, rgb } from "pdf-lib";
import { supabase } from "../lib/supabase";

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
  coordinates,
}: SignaturePdfParams): Promise<string> {
  try {
    // Fetch the PDF
    const pdfResponse = await fetch(pdfUrl);
    const pdfBytes = await pdfResponse.arrayBuffer();

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Convert signature data URL to image
    // Remove the data URL prefix to get just the base64 string
    const signatureBase64 = signatureData.split(",")[1];
    const signatureBytes = Uint8Array.from(atob(signatureBase64), (c) =>
      c.charCodeAt(0)
    );
    const signatureImage = await pdfDoc.embedPng(signatureBytes);

    // Add signature image to the PDF
    firstPage.drawImage(signatureImage, {
      x: coordinates.x,
      y: coordinates.y,
      width: 100,
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

    // Convert ArrayBuffer to base64 string
    const base64String = btoa(
      new Uint8Array(modifiedPdfBytes).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    // Upload the modified PDF
    const newPdfUrl = await uploadPdfToStorage(base64String);
    return newPdfUrl;
  } catch (error) {
    console.error("Error modifying PDF:", error);
    throw new Error("Failed to add signature to PDF");
  }
}

async function uploadPdfToStorage(base64Pdf: string): Promise<string> {
  try {
    // Convert base64 to Blob
    const byteCharacters = atob(base64Pdf);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const pdfBlob = new Blob([byteArray], { type: "application/pdf" });

    // Generate a unique filename
    const filename = `signatures/${Date.now()}-signed.pdf`;

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from("documents")
      .upload(filename, pdfBlob, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    // Get the public URL for the uploaded file
    const {
      data: { publicUrl },
    } = supabase.storage.from("documents").getPublicUrl(filename);

    return publicUrl;
  } catch (error) {
    console.error("Error uploading PDF:", error);
    throw new Error("Failed to upload signed PDF");
  }
}
