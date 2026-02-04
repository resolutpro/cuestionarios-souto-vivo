import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  FileText,
  Save,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { OcrJob, OcrExtractedField } from "@shared/schema";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export default function OcrReviewPage() {
  const [, params] = useRoute("/ocr/:id/review");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});

  const { data: job, isLoading: jobLoading } = useQuery<OcrJob & { extractedFields: OcrExtractedField[] }>({
    queryKey: [`/api/ocr/jobs/${params?.id}`],
    enabled: !!params?.id,
  });

  const updateFieldMutation = useMutation({
    mutationFn: async ({ fieldId, data }: { fieldId: string, data: any }) => {
      const res = await apiRequest("PATCH", `/api/ocr/fields/${fieldId}`, data);
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      // 1. Guardar todos los campos editados
      if (job?.extractedFields) {
        for (const field of job.extractedFields) {
          const manualValue = editedFields[field.id];
          if (manualValue !== undefined) {
            await updateFieldMutation.mutateAsync({
              fieldId: field.id,
              data: { manualValue, isVerified: true, isCorrect: true }
            });
          } else {
            await updateFieldMutation.mutateAsync({
              fieldId: field.id,
              data: { isVerified: true, isCorrect: true }
            });
          }
        }
      }

      // 2. Crear la submission real
      const submissionData: any = {
        source: "ocr",
        status: "enviado",
      };

      job?.extractedFields.forEach(field => {
        const val = editedFields[field.id] !== undefined ? editedFields[field.id] : field.proposedValue;
        if (val) {
          if (field.fieldName === "tipoFinca" || field.fieldName === "necesidades" || field.fieldName === "objetivosModelo" || field.fieldName === "produccionPrincipal" || field.fieldName === "disponibilidad" || field.fieldName === "formacion" || field.fieldName === "gobernanzaComunidad") {
            submissionData[field.fieldName] = val.split(",").map(s => s.trim());
          } else if (field.fieldName === "enProduccion" || field.fieldName === "consentimientoTratamiento" || field.fieldName === "aceptoComunicaciones") {
            submissionData[field.fieldName] = val === "true";
          } else {
            submissionData[field.fieldName] = val;
          }
        }
      });

      const subRes = await apiRequest("POST", "/api/submissions", submissionData);
      const submission = await subRes.json();

      // 3. Marcar el trabajo como aprobado
      await apiRequest("PATCH", `/api/ocr/jobs/${params?.id}/status`, {
        status: "aprobado",
        submissionId: submission.id
      });

      return submission;
    },
    onSuccess: (submission) => {
      toast({ title: "Cuestionario creado correctamente" });
      queryClient.invalidateQueries({ queryKey: ["/api/ocr/jobs"] });
      setLocation(`/submissions/${submission.id}`);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al aprobar", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job) return <div>No se encontró el trabajo de OCR</div>;

  const handleFieldChange = (fieldId: string, value: string) => {
    setEditedFields(prev => ({ ...prev, [fieldId]: value }));
  };

  const renderFieldInput = (field: OcrExtractedField) => {
    const value = editedFields[field.id] !== undefined ? editedFields[field.id] : (field.proposedValue || "");
    
    // Lista de campos que son enums para mostrar selectores
    const enumFields: Record<string, string[]> = {
      genero: ["mujer", "hombre", "otros"],
      edad: ["menos_35", "entre_35_50", "mas_50"],
      relacionFinca: ["propietario", "arrendatario", "gestor", "otra"],
      titularidadCompartida: ["si", "no"],
      agricultorTituloPrincipal: ["si", "no_complementario"],
      superficieCategoria: ["menos_1ha", "entre_1_5ha", "mas_5ha", "otra", "no_se"],
      usoSuelo: ["cultivo_activo", "pasto", "monte", "sin_uso", "otro"],
      acceso: ["bueno", "regular", "malo"],
      agua: ["si", "no", "no_se"],
      pendiente: ["baja", "media", "alta"],
      pedregosidad: ["baja", "media", "alta"],
      gradoInteres: ["alto", "medio", "bajo"],
      nivelActuacion: ["solo_diagnostico", "implantacion"],
      relevoGeneracional: ["si_familiares", "no_riesgo_abandono", "buscando"],
      colaboracion: ["si_agrupacion", "si_puntuales", "no_individual", "no_se_asesoria"],
      minifundio: ["si_mucho", "si_asumible", "no_adecuado"],
      cesionTierras: ["si_contrato", "si_municipio", "no"],
      enProduccion: ["true", "false"]
    };

    if (enumFields[field.fieldName]) {
      return (
        <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
          <SelectContent>
            {enumFields[field.fieldName].map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input 
        value={value} 
        onChange={(e) => handleFieldChange(field.id, e.target.value)}
        className={field.confidence && field.confidence < 80 ? "border-orange-300 focus-visible:ring-orange-300" : ""}
      />
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/ocr">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Revisión de Propuesta OCR</h1>
            <p className="text-muted-foreground">{job.fileName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => apiRequest("PATCH", `/api/ocr/jobs/${job.id}/status`, { status: "rechazado" }).then(() => setLocation("/ocr"))}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Rechazar
          </Button>
          <Button 
            onClick={() => approveMutation.mutate()} 
            disabled={approveMutation.isPending}
          >
            {approveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Aprobar y Crear Cuestionario
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Lado Izquierdo: Formulario de Propuesta */}
        <Card className="flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Campos Extraídos
            </CardTitle>
            <CardDescription>
              Valida y corrige los datos detectados por el OCR.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Datos Personales</h3>
              <div className="grid gap-4">
                {job.extractedFields.filter(f => ["nombreApellidos", "telefono", "email", "localidad", "genero", "edad"].includes(f.fieldName)).map(field => (
                  <div key={field.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">{field.fieldName}</Label>
                      {field.confidence && (
                        <span className={`text-[10px] font-bold px-1.5 rounded ${field.confidence > 90 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                          {field.confidence}% confiable
                        </span>
                      )}
                    </div>
                    {renderFieldInput(field)}
                  </div>
                ))}
              </div>

              <Separator />
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Información de la Finca</h3>
              <div className="grid gap-4">
                {job.extractedFields.filter(f => ["referenciasCatastrales", "superficieCategoria", "usoSuelo", "enProduccion", "acceso", "agua", "pendiente", "pedregosidad"].includes(f.fieldName)).map(field => (
                  <div key={field.id} className="space-y-1">
                    <Label className="text-sm font-medium">{field.fieldName}</Label>
                    {renderFieldInput(field)}
                  </div>
                ))}
              </div>

              <Separator />
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Otros Datos</h3>
              <div className="grid gap-4">
                {job.extractedFields.filter(f => !["nombreApellidos", "telefono", "email", "localidad", "genero", "edad", "referenciasCatastrales", "superficieCategoria", "usoSuelo", "enProduccion", "acceso", "agua", "pendiente", "pedregosidad"].includes(f.fieldName)).map(field => (
                  <div key={field.id} className="space-y-1">
                    <Label className="text-sm font-medium">{field.fieldName}</Label>
                    {renderFieldInput(field)}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lado Derecho: Previsualización PDF */}
        <Card className="flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Documento Original
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 bg-muted/30">
            {job.fileType.includes("pdf") ? (
              <iframe 
                src={`${job.fileUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                className="w-full h-full border-0"
                title="Visualización PDF"
              />
            ) : (
              <div className="flex items-center justify-center h-full p-4">
                <img 
                  src={job.fileUrl} 
                  alt="Original" 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
