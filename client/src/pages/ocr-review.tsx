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
import { Checkbox } from "@/components/ui/checkbox";
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

  const renderFieldInput = (label: string, field: keyof Submission, type: "text" | "enum" | "boolean" | "checkbox-array" = "text", options?: { value: string; label: string }[]) => {
    if (type === "checkbox-array" && options) {
      const currentValues = (formData[field] as string[]) || [];
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{label}</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field}-${option.value}`}
                  checked={currentValues.includes(option.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleFieldChange(field, [...currentValues, option.value]);
                    } else {
                      handleFieldChange(field, currentValues.filter((v) => v !== option.value));
                    }
                  }}
                />
                <label
                  htmlFor={`${field}-${option.value}`}
                  className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      );
    }

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
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
                    {renderFieldInput("Género", "genero", "enum", [
                      { value: "mujer", label: "Mujer" },
                      { value: "hombre", label: "Hombre" },
                      { value: "otros", label: "Otros" }
                    ])}
                    {renderFieldInput("Edad", "edad", "enum", [
                      { value: "menos_35", label: "<35" },
                      { value: "entre_35_50", label: "35-50" },
                      { value: "mas_50", label: ">50" }
                    ])}
                  </div>
                  {renderFieldInput("Relación con la finca", "relacionFinca", "enum", [
                    { value: "propietario", label: "Propietario/a" },
                    { value: "arrendatario", label: "Arrendatario/a" },
                    { value: "gestor", label: "Gestor/a" },
                    { value: "otra", label: "Otra" }
                  ])}
                  {formData.relacionFinca === "otra" && renderFieldInput("Especificar otra relación", "relacionFincaOtra")}
                  {formData.relacionFinca === "propietario" && renderFieldInput("¿La finca está bajo régimen de Titularidad Compartida?", "titularidadCompartida", "enum", [
                    { value: "si", label: "Sí" },
                    { value: "no", label: "No" }
                  ])}
                  {renderFieldInput("¿Es usted agricultor/a a título principal?", "agricultorTituloPrincipal", "enum", [
                    { value: "si", label: "Sí" },
                    { value: "no_complementario", label: "No, es complementario" }
                  ])}
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
                  {renderFieldInput("Superficie aproximada disponible", "superficieCategoria", "enum", [
                    { value: "menos_1ha", label: "Menos de 1 ha" },
                    { value: "entre_1_5ha", label: "Entre 1 y 5 ha" },
                    { value: "mas_5ha", label: "Más de 5 ha" },
                    { value: "otra", label: "Otra" },
                    { value: "no_se", label: "No lo sé" }
                  ])}
                  {formData.superficieCategoria === "otra" && renderFieldInput("Especificar superficie", "superficieOtra")}
                  
                  {renderFieldInput("Tipo de finca (puede marcar varias)", "tipoFinca", "checkbox-array", [
                    { value: "agricola", label: "Agrícola" },
                    { value: "forestal", label: "Forestal" },
                    { value: "mixta", label: "Mixta" }
                  ])}

                  {renderFieldInput("Uso actual del suelo", "usoSuelo", "enum", [
                    { value: "cultivo_activo", label: "Cultivo activo" },
                    { value: "pasto", label: "Pasto" },
                    { value: "monte", label: "Monte" },
                    { value: "sin_uso", label: "Sin uso / Abandonada" },
                    { value: "otro", label: "Otro" }
                  ])}
                  {formData.usoSuelo === "otro" && renderFieldInput("Especificar otro uso", "usoSueloOtro")}
                  {renderFieldInput("¿Está la finca actualmente en producción?", "enProduccion", "boolean")}
                </div>
              </div>

              {/* Sección 3: Condiciones de la finca */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">3. Condiciones de la finca</h3>
                    <p className="text-sm text-muted-foreground">Infraestructura y orografía</p>
                  </div>
                </div>
                <div className="grid gap-4 pl-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderFieldInput("Acceso a la finca", "acceso", "enum", [
                      { value: "bueno", label: "Bueno (con vehículo)" },
                      { value: "regular", label: "Regular" },
                      { value: "malo", label: "Malo" }
                    ])}
                    {renderFieldInput("Disponibilidad de agua", "agua", "enum", [
                      { value: "si", label: "Sí" },
                      { value: "no", label: "No" },
                      { value: "no_se", label: "No lo sé" }
                    ])}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderFieldInput("Pendiente del terreno", "pendiente", "enum", [
                      { value: "baja", label: "Baja" },
                      { value: "media", label: "Media" },
                      { value: "alta", label: "Alta" }
                    ])}
                    {renderFieldInput("Pedregosidad", "pedregosidad", "enum", [
                      { value: "baja", label: "Baja" },
                      { value: "media", label: "Media" },
                      { value: "alta", label: "Alta" }
                    ])}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Sección 4: Necesidades y Objetivos de la Finca */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">4. Necesidades y Objetivos de la Finca</h3>
                    <p className="text-sm text-muted-foreground">Identifica las necesidades y el modelo agroforestal deseado</p>
                  </div>
                </div>
                <div className="grid gap-4 pl-12">
                  {renderFieldInput("Principales necesidades de la finca (puede marcar varias)", "necesidades", "checkbox-array", [
                    { value: "productividad", label: "Mejora de la productividad" },
                    { value: "matorral", label: "Control del matorral" },
                    { value: "incendios", label: "Prevención de incendios" },
                    { value: "suelo", label: "Mejora del suelo" },
                    { value: "diversificacion", label: "Diversificación de usos" },
                    { value: "abandonada", label: "Puesta en valor de finca abandonada" },
                    { value: "otras", label: "Otras necesidades" }
                  ])}
                  {((formData.necesidades as string[]) || []).includes("otras") && (
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Especificar otras necesidades</Label>
                      <Input 
                        value={(formData.necesidadesOtras as string) || ""} 
                        onChange={(e) => handleFieldChange("necesidadesOtras", e.target.value)}
                        placeholder="Especificar..."
                      />
                    </div>
                  )}

                  {renderFieldInput("¿Qué modelo agroforestal le gustaría conseguir? (puede marcar varios)", "objetivosModelo", "checkbox-array", [
                    { value: "produccion", label: "Producción" },
                    { value: "biodiversidad", label: "Conservación del paisaje y biodiversidad" },
                    { value: "costes", label: "Reducción de costes de mantenimiento" },
                    { value: "social", label: "Nuevos modelos de impacto social" },
                    { value: "otros", label: "Otros objetivos" }
                  ])}
                  {((formData.objetivosModelo as string[]) || []).includes("otros") && (
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Especificar otros objetivos</Label>
                      <Input 
                        value={(formData.otrosObjetivosTexto as string) || ""} 
                        onChange={(e) => handleFieldChange("otrosObjetivosTexto", e.target.value)}
                        placeholder="Especificar..."
                      />
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Sección 5: Interés y Compromiso */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">5. Interés y Compromiso</h3>
                    <p className="text-sm text-muted-foreground">Nivel de participación e interés en el proyecto</p>
                  </div>
                </div>
                <div className="grid gap-4 pl-12">
                  {renderFieldInput("Grado de interés en participar en un proyecto piloto", "gradoInteres", "enum", [
                    { value: "alto", label: "Alto" },
                    { value: "medio", label: "Medio" },
                    { value: "bajo", label: "Bajo" }
                  ])}
                  {renderFieldInput("¿En qué nivel estaría dispuesto/a que actúe el proyecto?", "nivelActuacion", "enum", [
                    { value: "solo_diagnostico", label: "Solo diagnóstico y propuesta técnica" },
                    { value: "implantacion", label: "Implantación de actuaciones piloto" }
                  ])}
                  {renderFieldInput("Disponibilidad para (marcar lo que proceda)", "disponibilidad", "checkbox-array", [
                    { value: "reuniones", label: "Asistir a reuniones o talleres" },
                    { value: "visitas", label: "Recibir visitas técnicas en la finca" },
                    { value: "seguimiento", label: "Colaborar en el seguimiento del proyecto" }
                  ])}
                  {renderFieldInput("¿Existe previsión de relevo generacional en los próximos 5-10 años?", "relevoGeneracional", "enum", [
                    { value: "si_familiares", label: "Sí, hay familiares o personas interesadas" },
                    { value: "no_riesgo_abandono", label: "No, existe riesgo de abandono tras mi jubilación" },
                    { value: "buscando", label: "Estoy buscando a alguien que quiera trabajarla" }
                  ])}
                </div>
              </div>

              <Separator />

              {/* Sección 6: Necesidades Formativas */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">6. Necesidades Formativas</h3>
                    <p className="text-sm text-muted-foreground">Formación que le gustaría recibir</p>
                  </div>
                </div>
                <div className="grid gap-4 pl-12">
                  {renderFieldInput("¿En qué aspectos le gustaría recibir formación?", "formacion", "checkbox-array", [
                    { value: "castano", label: "Cultivo del castaño" },
                    { value: "agroforestal", label: "Sistemas agroforestales" },
                    { value: "agri_regenerativa", label: "Agricultura regenerativa" },
                    { value: "gana_regenerativa", label: "Ganadería regenerativa" },
                    { value: "carbono", label: "Plantaciones de fijación de carbono" },
                    { value: "comercializacion", label: "Comercialización de productos" },
                    { value: "ayudas", label: "Tramitación de ayudas" },
                    { value: "legislacion", label: "Legislación y fiscalidad" }
                  ])}
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Otra formación</Label>
                    <Input 
                      value={(formData.formacionOtro as string) || ""} 
                      onChange={(e) => handleFieldChange("formacionOtro", e.target.value)}
                      placeholder="Especificar..."
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Sección 7: Dimensión Social */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">7. Dimensión Social</h3>
                    <p className="text-sm text-muted-foreground">Capacitación y visión comunitaria</p>
                  </div>
                </div>
                <div className="grid gap-4 pl-12">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-primary">Modelos de colaboración y gestión comunitaria</p>
                    {renderFieldInput("¿Estaría dispuesto/a a participar en gestión conjunta?", "colaboracion", "enum", [
                      { value: "si_agrupacion", label: "Sí, me interesa integrarme en una agrupación" },
                      { value: "si_puntuales", label: "Sí, pero solo para acciones puntuales" },
                      { value: "no_individual", label: "No, prefiero gestión individual" },
                      { value: "no_se_asesoria", label: "No lo sé, necesitaría asesoramiento" }
                    ])}
                  </div>
                  <Separator />
                  {renderFieldInput("¿Considera que el tamaño/dispersión de sus fincas es un obstáculo?", "minifundio", "enum", [
                    { value: "si_mucho", label: "Sí, mucho" },
                    { value: "si_asumible", label: "Sí, aunque es asumible" },
                    { value: "no_adecuado", label: "No, el tamaño es adecuado" }
                  ])}
                  <Separator />
                  {renderFieldInput("¿Cedería la gestión mediante Banco de Tierras si no puede trabajarla?", "cesionTierras", "enum", [
                    { value: "si_contrato", label: "Sí, bajo contrato de arrendamiento o cesión" },
                    { value: "si_municipio", label: "Sí, pero solo a alguien del municipio" },
                    { value: "no_interes_ceder", label: "No, no tengo interés en ceder la gestión" }
                  ])}
                  <Separator />
                  {renderFieldInput("¿Cómo cree que el proyecto podría mejorar la comunidad? (puede marcar varias)", "gobernanzaComunidad", "checkbox-array", [
                    { value: "creacion_empleo_local", label: "Creación de empleo local" },
                    { value: "recuperar_tierras_abandonadas", label: "Recuperar tierras abandonadas" },
                    { value: "formacion_capacitacion", label: "Formación y capacitación" },
                    { value: "cooperativas_gestion_colectiva", label: "Cooperativas y gestión colectiva" },
                    { value: "turismo_rural", label: "Turismo rural" }
                  ])}
                  {renderFieldInput("Otras sugerencias de gobernanza", "gobernanzaOtro")}
                </div>
              </div>

              <Separator />

              {/* Sección Final: Observaciones */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Observaciones Finales</h3>
                  </div>
                </div>
                <div className="pl-12">
                  <Textarea 
                    value={(formData.observaciones as string) || ""} 
                    onChange={(e) => handleFieldChange("observaciones", e.target.value)}
                    placeholder="Observaciones finales..."
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              <Separator />

              {/* Sección 8: Consentimiento RGPD */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">8. Consentimiento y RGPD</h3>
                    <p className="text-sm text-muted-foreground">Tratamiento de datos personales</p>
                  </div>
                </div>
                <div className="grid gap-4 pl-12">
                  <div className="flex items-start space-x-3 space-y-0 border p-4 rounded-md">
                    <Checkbox
                      id="consentimientoTratamiento"
                      checked={!!formData.consentimientoTratamiento}
                      onCheckedChange={(checked) => handleFieldChange("consentimientoTratamiento", !!checked)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="consentimientoTratamiento" className="text-sm font-medium cursor-pointer">
                        Acepto el tratamiento de mis datos personales *
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Sus datos serán tratados conforme al RGPD para la gestión del proyecto Souto Vivo
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 space-y-0 border p-4 rounded-md">
                    <Checkbox
                      id="aceptoComunicaciones"
                      checked={!!formData.aceptoComunicaciones}
                      onCheckedChange={(checked) => handleFieldChange("aceptoComunicaciones", !!checked)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="aceptoComunicaciones" className="text-sm font-medium cursor-pointer">
                        Acepto recibir comunicaciones sobre el proyecto
                      </Label>
                    </div>
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
