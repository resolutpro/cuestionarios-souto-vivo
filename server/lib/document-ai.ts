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
  
  // CAMBIO IMPORTANTE: Usamos Array para preservar el orden y añadimos geometría
  const fields: Array<{ 
    key: string; 
    value: string; 
    confidence: number;
    pageNumber: number;
    normalizedVertices: { x: number; y: number }[];
    y: number; // Posición vertical promedio
    x: number; // Posición horizontal promedio
  }> = [];

  if (document?.pages) {
    document.pages.forEach((page, pageIndex) => {
      const pageNumber = pageIndex + 1;
      
      for (const field of page.formFields || []) {
        const key = field.fieldName?.textAnchor?.content?.trim().replace(/\n/g, ' ') || "";
        const value = field.fieldValue?.textAnchor?.content?.trim().replace(/\n/g, ' ') || "";
        const confidence = field.fieldValue?.confidence || 0.0;
        
        // Extraer coordenadas de fieldValue o fieldName si fieldValue no tiene
        const boundingPoly = field.fieldValue?.boundingPoly || field.fieldName?.boundingPoly;
        const normalizedVertices = boundingPoly?.normalizedVertices || [];
        
        // Calcular promedios para ordenamiento
        let avgY = 0;
        let avgX = 0;
        if (normalizedVertices.length > 0) {
          avgY = normalizedVertices.reduce((acc: number, v: any) => acc + (v.y || 0), 0) / normalizedVertices.length;
          avgX = normalizedVertices.reduce((acc: number, v: any) => acc + (v.x || 0), 0) / normalizedVertices.length;
        }

        if (key) {
          fields.push({
            key, 
            value,
            confidence: Math.round(confidence * 100),
            pageNumber,
            normalizedVertices: normalizedVertices.map((v: any) => ({ x: v.x || 0, y: v.y || 0 })),
            y: avgY,
            x: avgX
          });
        }
      }
    });
  }

  // Lógica de ordenamiento explícita: Página -> Y -> X
  return fields.sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
    if (Math.abs(a.y - b.y) > 0.005) return a.y - b.y; // Umbral de 0.5% para considerar misma línea
    return a.x - b.x;
  });
}
