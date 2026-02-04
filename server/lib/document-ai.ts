import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

// The client will automatically use GOOGLE_APPLICATION_CREDENTIALS from env
const client = new DocumentProcessorServiceClient();

export async function analyzeForm(fileBuffer: Buffer, mimeType: string) {
  const name = `projects/${process.env.GOOGLE_PROJECT_ID}/locations/${process.env.GOOGLE_LOCATION}/processors/${process.env.GOOGLE_PROCESSOR_ID}`;

  const [result] = await client.processDocument({
    name,
    rawDocument: {
      content: fileBuffer.toString('base64'),
      mimeType: mimeType,
    },
  });

  const { document } = result;
  const fields: Record<string, { value: string; confidence: number }> = {};

  if (document?.pages) {
    for (const page of document.pages) {
      // 1. Extraer campos de formulario (Key-Value pairs)
      for (const field of page.formFields || []) {
        const key = field.fieldName?.textAnchor?.content?.trim().replace(/\n/g, ' ');
        const value = field.fieldValue?.textAnchor?.content?.trim().replace(/\n/g, ' ');
        const confidence = field.fieldValue?.confidence || 0.95;
        
        if (key) {
          fields[key] = { 
            value: value || "", 
            confidence: Math.round(confidence * 100) 
          };
        }
      }
    }
  }
  return fields;
}
