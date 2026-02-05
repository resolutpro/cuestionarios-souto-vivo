import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  FileText,
  Info,
  User,
  MapPin,
  Phone,
  Mail,
  TreePine,
  Target,
  GraduationCap,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { OcrJob, Submission } from "@shared/schema";
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
  const [formData, setFormData] = useState<Partial<Submission>>({});

  const { data: job, isLoading: jobLoading } = useQuery<OcrJob>({
    queryKey: [`/api/ocr/jobs/${params?.id}`],
    enabled: !!params?.id,
  });

  const { data: submission, isLoading: submissionLoading } = useQuery<Submission>({
    queryKey: ["/api/submissions", job?.submissionId],
    enabled: !!job?.submissionId,
  });

  useEffect(() => {
    if (submission) {
      setFormData(submission);
    }
  }, [submission]);

  const updateSubmissionMutation = useMutation({
    mutationFn: async (data: Partial<Submission>) => {
      const res = await apiRequest("PATCH", `/api/submissions/${submission?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions", submission?.id] });
      toast({ title: "Cambios guardados correctamente" });
    }
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      // 1. Guardar cambios finales
      await apiRequest("PATCH", `/api/submissions/${submission?.id}`, {
        ...formData,
        status: "aprobado"
      });

      // 2. Marcar el trabajo como aprobado
      await apiRequest("PATCH", `/api/ocr/jobs/${params?.id}/status`, {
        status: "aprobado",
        submissionId: submission?.id
      });
    },
    onSuccess: () => {
      toast({ title: "Cuestionario aprobado correctamente" });
      queryClient.invalidateQueries({ queryKey: ["/api/ocr/jobs"] });
      setLocation(`/submissions/${submission?.id}`);
    }
  });

  if (jobLoading || submissionLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job || !submission) return <div>No se encontró la información del trabajo o cuestionario</div>;

  const handleFieldChange = (field: keyof Submission, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderFieldInput = (label: string, field: keyof Submission, type: "text" | "enum" | "boolean" = "text", options?: string[]) => {
    const value = (formData[field] as string) || "";

    return (
      <div className="space-y-1">
        <Label className="text-sm font-medium">{label}</Label>
        {type === "enum" && options ? (
          <Select value={value} onValueChange={(val) => handleFieldChange(field, val)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {options.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : type === "boolean" ? (
          <Select value={value?.toString()} onValueChange={(val) => handleFieldChange(field, val === "true")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Sí</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input 
            value={value} 
            onChange={(e) => handleFieldChange(field, e.target.value)}
          />
        )}
      </div>
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
            <h1 className="text-2xl font-bold">Revisión de Cuestionario OCR</h1>
            <p className="text-muted-foreground">{job.fileName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => updateSubmissionMutation.mutate(formData)}
            disabled={updateSubmissionMutation.isPending}
          >
            Guardar Borrador
          </Button>
          <Button 
            onClick={() => approveMutation.mutate()} 
            disabled={approveMutation.isPending}
          >
            {approveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Aprobar Cuestionario
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Lado Izquierdo: Previsualización PDF */}
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

        {/* Lado Derecho: Formulario siguiendo orden del cuestionario */}
        <Card className="flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Datos del Cuestionario
            </CardTitle>
            <CardDescription>
              Valida los datos siguiendo el orden del documento original.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-8">
            <div className="space-y-8">
              {/* Sección 1: Datos Personales */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">1. Datos de la Persona Interesada</h3>
                    <p className="text-sm text-muted-foreground">Información de contacto y perfil del solicitante</p>
                  </div>
                </div>
                <div className="grid gap-4 pl-12">
                  {renderFieldInput("Nombre y apellidos *", "nombreApellidos")}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderFieldInput("Teléfono de contacto", "telefono")}
                    {renderFieldInput("Correo electrónico", "email")}
                  </div>
                  {renderFieldInput("Localidad", "localidad")}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderFieldInput("Género", "genero", "enum", ["mujer", "hombre", "otros"])}
                    {renderFieldInput("Edad", "edad", "enum", ["menos_35", "entre_35_50", "mas_50"])}
                  </div>
                  {renderFieldInput("Relación con la finca", "relacionFinca", "enum", ["propietario", "arrendatario", "gestor", "otra"])}
                  {formData.relacionFinca === "otra" && renderFieldInput("Especificar otra relación", "relacionFincaOtra")}
                  {formData.relacionFinca === "propietario" && renderFieldInput("¿La finca está bajo régimen de Titularidad Compartida?", "titularidadCompartida", "enum", ["si", "no"])}
                  {renderFieldInput("¿Es usted agricultor/a a título principal?", "agricultorTituloPrincipal", "enum", ["si", "no_complementario"])}
                  {renderFieldInput("¿Pertenece a alguna asociación?", "asociacionPertenece")}
                </div>
              </div>

              <Separator />

              {/* Sección 2: Información de la Finca */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <TreePine className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">2. Información Básica de la Finca</h3>
                    <p className="text-sm text-muted-foreground">Datos catastrales y características de la finca</p>
                  </div>
                </div>
                <div className="grid gap-4 pl-12">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Referencias catastrales o polígono y parcela</Label>
                    <Textarea 
                      value={(formData.referenciasCatastrales as string) || ""} 
                      onChange={(e) => handleFieldChange("referenciasCatastrales", e.target.value)}
                      placeholder="Introduzca las referencias catastrales..."
                    />
                  </div>
                  {renderFieldInput("Superficie aproximada disponible", "superficieCategoria", "enum", ["menos_1ha", "entre_1_5ha", "mas_5ha", "otra", "no_se"])}
                  {formData.superficieCategoria === "otra" && renderFieldInput("Especificar superficie", "superficieOtra")}
                  {renderFieldInput("Uso actual del suelo", "usoSuelo", "enum", ["cultivo_activo", "pasto", "monte", "sin_uso", "otro"])}
                  {formData.usoSuelo === "otro" && renderFieldInput("Especificar otro uso", "usoSueloOtro")}
                  {renderFieldInput("¿Está la finca actualmente en producción?", "enProduccion", "boolean")}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderFieldInput("Acceso a la finca", "acceso", "enum", ["bueno", "regular", "malo"])}
                    {renderFieldInput("Disponibilidad de agua", "agua", "enum", ["si", "no", "no_se"])}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderFieldInput("Grado de pendiente", "pendiente", "enum", ["baja", "media", "alta"])}
                    {renderFieldInput("Grado de pedregosidad", "pedregosidad", "enum", ["baja", "media", "alta"])}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Sección 3: Necesidades y Objetivos */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">3. Necesidades y Objetivos</h3>
                    <p className="text-sm text-muted-foreground">Intereses y planes para la explotación</p>
                  </div>
                </div>
                <div className="grid gap-4 pl-12">
                  {renderFieldInput("Grado de interés en el modelo de gestión", "gradoInteres", "enum", ["alto", "medio", "bajo"])}
                  {renderFieldInput("Nivel de actuación deseado", "nivelActuacion", "enum", ["solo_diagnostico", "implantacion"])}
                  {renderFieldInput("Situación respecto al relevo generacional", "relevoGeneracional", "enum", ["si_familiares", "no_riesgo_abandono", "buscando"])}
                </div>
              </div>

              <Separator />

              {/* Sección 4: Formación y Social */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">4. Formación y Dimensión Social</h3>
                    <p className="text-sm text-muted-foreground">Capacitación y visión comunitaria</p>
                  </div>
                </div>
                <div className="grid gap-4 pl-12">
                  {renderFieldInput("Preferencia de colaboración", "colaboracion", "enum", ["si_agrupacion", "si_puntuales", "no_individual", "no_se_asesoria"])}
                  {renderFieldInput("¿Considera el minifundio un problema?", "minifundio", "enum", ["si_mucho", "si_asumible", "no_adecuado"])}
                  {renderFieldInput("¿Estaría dispuesto/a a la cesión de tierras?", "cesionTierras", "enum", ["si_contrato", "si_municipio", "no"])}
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Observaciones adicionales</Label>
                    <Textarea 
                      value={(formData.observaciones as string) || ""} 
                      onChange={(e) => handleFieldChange("observaciones", e.target.value)}
                      placeholder="Cualquier otra información relevante..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
