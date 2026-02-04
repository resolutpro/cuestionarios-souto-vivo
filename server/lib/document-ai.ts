import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

const client = new DocumentProcessorServiceClient({
  // Asegúrate que coincide con la región de tu procesador (us o eu)
  apiEndpoint: 'eu-documentai.googleapis.com', 
});

export async function analyzeForm(fileContent: Buffer, mimeType: string) {
  // Ajusta estas variables de entorno o pon los IDs directamente si fallan
  const name = `projects/${process.env.GOOGLE_PROJECT_ID}/locations/${process.env.GOOGLE_LOCATION}/processors/${process.env.GOOGLE_PROCESSOR_ID}`;

  const request = {
    name,
    rawDocument: {
      content: fileContent.toString('base64'),
      mimeType,
    },
  };

  const [result] = await client.processDocument(request);
  const { document } = result;
  
  // CAMBIO IMPORTANTE: Usamos Array para preservar el orden
  const fields: Array<{ key: string; value: string; confidence: number }> = [];

  if (document?.pages) {
    for (const page of document.pages) {
      // Document AI devuelve los campos ordenados visualmente (de arriba a abajo)
      for (const field of page.formFields || []) {
        const key = field.fieldName?.textAnchor?.content?.trim().replace(/\n/g, ' ') || "";
        const value = field.fieldValue?.textAnchor?.content?.trim().replace(/\n/g, ' ') || "";
        const confidence = field.fieldValue?.confidence || 0.0;

        if (key) {
          fields.push({
            key, 
            value,
            confidence: Math.round(confidence * 100)
          });
        }
      }
    }
  }
  return fields;
}
