import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft,
  User,
  MapPin,
  Phone,
  Mail,
  TreePine,
  Target,
  GraduationCap,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Pencil,
  Save,
  X,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Submission, OcrJob } from "@shared/schema";

// Configuración de estado
const statusConfig = {
  borrador: {
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    icon: Clock,
  },
  enviado: {
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Clock,
  },
  aprobado: {
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: CheckCircle,
  },
  rechazado: {
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: XCircle,
  },
  pendiente: {
    color:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: Clock,
  },
};

export default function SubmissionDetailPage() {
  const [match, params] = useRoute("/submissions/:id");
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Submission>>({});

  // 1. Obtener el cuestionario
  const { data: submission, isLoading: submissionLoading } =
    useQuery<Submission>({
      queryKey: ["/api/submissions", params?.id],
      queryFn: async () => {
        const res = await fetch(`/api/submissions/${params?.id}`);
        if (!res.ok) throw new Error("Failed to fetch submission");
        return res.json();
      },
      enabled: !!params?.id,
    });

  // 2. Obtener trabajos OCR para encontrar el PDF (si aplica)
  // Nota: Idealmente habría un endpoint específico, pero filtramos en cliente por simplicidad actual
  const { data: ocrJobs } = useQuery<OcrJob[]>({
    queryKey: ["/api/ocr/jobs"],
    enabled: submission?.source === "ocr",
  });

  const ocrJob =
    submission?.source === "ocr" && ocrJobs
      ? ocrJobs.find((j) => j.submissionId === submission.id)
      : null;

  useEffect(() => {
    if (submission) {
      setFormData(submission);
    }
  }, [submission]);

  // Mutaciones
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest(
        "PATCH",
        `/api/submissions/${params?.id}/status`,
        { status },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/submissions", params?.id],
      });
      toast({ title: "Estado actualizado" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Submission>) => {
      const response = await apiRequest(
        "PATCH",
        `/api/submissions/${params?.id}`,
        data,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      setIsEditing(false);
      toast({ title: "Cambios guardados correctamente" });
    },
    onError: () =>
      toast({ title: "Error al guardar cambios", variant: "destructive" }),
  });

  const handleFieldChange = (field: keyof Submission, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // --- RENDERIZADO DE CAMPOS (Reutilizando lógica visual de OCR Review) ---
  const renderFieldInput = (
    label: string,
    field: keyof Submission,
    type: "text" | "enum" | "boolean" | "checkbox-array" = "text",
    options?: { value: string; label: string }[],
  ) => {
    const disabled = !isEditing;

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
                  disabled={disabled}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleFieldChange(field, [
                        ...currentValues,
                        option.value,
                      ]);
                    } else {
                      handleFieldChange(
                        field,
                        currentValues.filter((v) => v !== option.value),
                      );
                    }
                  }}
                />
                <label
                  htmlFor={`${field}-${option.value}`}
                  className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
          <Select
            value={value}
            disabled={disabled}
            onValueChange={(val) => handleFieldChange(field, val)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : type === "boolean" ? (
          <Select
            value={
              value === "true" || value === true
                ? "true"
                : value === "false" || value === false
                  ? "false"
                  : ""
            }
            disabled={disabled}
            onValueChange={(val) => handleFieldChange(field, val === "true")}
          >
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
            disabled={disabled}
            onChange={(e) => handleFieldChange(field, e.target.value)}
          />
        )}
      </div>
    );
  };

  // --- ESTRUCTURA DEL FORMULARIO (Extraída de ocr-review.tsx) ---
  const renderFormContent = () => (
    <div className="space-y-8 p-1">
      {/* Sección 1: Datos Personales */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">
              1. Datos de la Persona Interesada
            </h3>
            <p className="text-sm text-muted-foreground">
              Información de contacto y perfil
            </p>
          </div>
        </div>
        <div className="grid gap-4 pl-12">
          {renderFieldInput("Código (SV_JPXX_XXX)", "codigo")}
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
              { value: "otros", label: "Otros" },
            ])}
            {renderFieldInput("Edad", "edad", "enum", [
              { value: "menos_35", label: "<35" },
              { value: "entre_35_50", label: "35-50" },
              { value: "mas_50", label: ">50" },
            ])}
          </div>
          {renderFieldInput("Relación con la finca", "relacionFinca", "enum", [
            { value: "propietario", label: "Propietario/a" },
            { value: "arrendatario", label: "Arrendatario/a" },
            { value: "gestor", label: "Gestor/a" },
            { value: "otra", label: "Otra" },
          ])}
          {formData.relacionFinca === "otra" &&
            renderFieldInput("Especificar otra relación", "relacionFincaOtra")}
          {formData.relacionFinca === "propietario" &&
            renderFieldInput(
              "¿La finca está bajo régimen de Titularidad Compartida?",
              "titularidadCompartida",
              "enum",
              [
                { value: "si", label: "Sí" },
                { value: "no", label: "No" },
              ],
            )}
          {renderFieldInput(
            "¿Es usted agricultor/a a título principal?",
            "agricultorTituloPrincipal",
            "enum",
            [
              { value: "si", label: "Sí" },
              {
                value: "no_complementario",
                label: "No, es complementario",
              },
            ],
          )}
          {renderFieldInput(
            "¿Pertenece a alguna asociación?",
            "asociacionPertenece",
          )}
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
            <h3 className="text-lg font-bold">
              2. Información Básica de la Finca
            </h3>
            <p className="text-sm text-muted-foreground">
              Datos catastrales y características
            </p>
          </div>
        </div>
        <div className="grid gap-4 pl-12">
          <div className="space-y-1">
            <Label className="text-sm font-medium">
              Referencias catastrales o polígono y parcela
            </Label>
            <Textarea
              value={(formData.referenciasCatastrales as string) || ""}
              disabled={!isEditing}
              onChange={(e) =>
                handleFieldChange("referenciasCatastrales", e.target.value)
              }
              placeholder="Referencias catastrales..."
            />
          </div>
          {renderFieldInput(
            "Superficie aproximada disponible",
            "superficieCategoria",
            "enum",
            [
              { value: "menos_1ha", label: "Menos de 1 ha" },
              { value: "entre_1_5ha", label: "Entre 1 y 5 ha" },
              { value: "mas_5ha", label: "Más de 5 ha" },
              { value: "otra", label: "Otra" },
              { value: "no_se", label: "No lo sé" },
            ],
          )}
          {formData.superficieCategoria === "otra" &&
            renderFieldInput("Especificar superficie", "superficieOtra")}

          {renderFieldInput(
            "Tipo de finca (puede marcar varias)",
            "tipoFinca",
            "checkbox-array",
            [
              { value: "agricola", label: "Agrícola" },
              { value: "forestal", label: "Forestal" },
              { value: "mixta", label: "Mixta" },
            ],
          )}

          {renderFieldInput("Uso actual del suelo", "usoSuelo", "enum", [
            { value: "cultivo_activo", label: "Cultivo activo" },
            { value: "pasto", label: "Pasto" },
            { value: "monte", label: "Monte" },
            { value: "sin_uso", label: "Sin uso / Abandonada" },
            { value: "otro", label: "Otro" },
          ])}
          {formData.usoSuelo === "otro" &&
            renderFieldInput("Especificar otro uso", "usoSueloOtro")}
          {renderFieldInput(
            "¿Está la finca actualmente en producción?",
            "enProduccion",
            "boolean",
          )}
        </div>
      </div>

      <Separator />

      {/* Sección 3: Condiciones */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">3. Condiciones de la finca</h3>
            <p className="text-sm text-muted-foreground">
              Infraestructura y orografía
            </p>
          </div>
        </div>
        <div className="grid gap-4 pl-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderFieldInput("Acceso a la finca", "acceso", "enum", [
              { value: "bueno", label: "Bueno (con vehículo)" },
              { value: "regular", label: "Regular" },
              { value: "malo", label: "Malo" },
            ])}
            {renderFieldInput("Disponibilidad de agua", "agua", "enum", [
              { value: "si", label: "Sí" },
              { value: "no", label: "No" },
              { value: "no_se", label: "No lo sé" },
            ])}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderFieldInput("Pendiente del terreno", "pendiente", "enum", [
              { value: "baja", label: "Baja" },
              { value: "media", label: "Media" },
              { value: "alta", label: "Alta" },
            ])}
            {renderFieldInput("Pedregosidad", "pedregosidad", "enum", [
              { value: "baja", label: "Baja" },
              { value: "media", label: "Media" },
              { value: "alta", label: "Alta" },
            ])}
          </div>
        </div>
      </div>

      <Separator />

      {/* Sección 4: Necesidades y Objetivos */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">
              4. Necesidades y Objetivos de la Finca
            </h3>
          </div>
        </div>
        <div className="grid gap-4 pl-12">
          {renderFieldInput(
            "Principales necesidades",
            "necesidades",
            "checkbox-array",
            [
              {
                value: "productividad",
                label: "Mejora de la productividad",
              },
              { value: "matorral", label: "Control del matorral" },
              { value: "incendios", label: "Prevención de incendios" },
              { value: "suelo", label: "Mejora del suelo" },
              {
                value: "diversificacion",
                label: "Diversificación de usos",
              },
              {
                value: "abandonada",
                label: "Puesta en valor de finca abandonada",
              },
              { value: "otras", label: "Otras necesidades" },
            ],
          )}
          {((formData.necesidades as string[]) || []).includes("otras") && (
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                Especificar otras necesidades
              </Label>
              <Input
                value={(formData.necesidadesOtras as string) || ""}
                disabled={!isEditing}
                onChange={(e) =>
                  handleFieldChange("necesidadesOtras", e.target.value)
                }
              />
            </div>
          )}

          {renderFieldInput(
            "Modelo agroforestal deseado",
            "objetivosModelo",
            "checkbox-array",
            [
              { value: "produccion", label: "Producción" },
              {
                value: "biodiversidad",
                label: "Conservación del paisaje y biodiversidad",
              },
              {
                value: "costes",
                label: "Reducción de costes de mantenimiento",
              },
              {
                value: "social",
                label: "Nuevos modelos de impacto social",
              },
              { value: "otros", label: "Otros objetivos" },
            ],
          )}

          {((formData.objetivosModelo as string[]) || []).includes(
            "produccion",
          ) && (
            <div className="pl-6 border-l-2 border-primary/20 space-y-4 pt-2 pb-2">
              {renderFieldInput(
                "Producción Principal:",
                "produccionPrincipal",
                "checkbox-array",
                [
                  { value: "madera", label: "Madera" },
                  { value: "lena", label: "Leña" },
                  { value: "castana", label: "Castaña" },
                  { value: "vid", label: "Vid" },
                  {
                    value: "fruticola",
                    label: "Frutícola (cereza, pera, manzana)",
                  },
                  {
                    value: "horticola",
                    label: "Hortícola (pimiento, cebolla)",
                  },
                  { value: "pasto_ganadera", label: "Pasto/ganadera" },
                  {
                    value: "apicolas",
                    label: "Productos apícolas (miel, polen...)",
                  },
                ],
              )}
            </div>
          )}

          {((formData.objetivosModelo as string[]) || []).includes("otros") && (
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                Especificar otros objetivos
              </Label>
              <Input
                value={(formData.otrosObjetivosTexto as string) || ""}
                disabled={!isEditing}
                onChange={(e) =>
                  handleFieldChange("otrosObjetivosTexto", e.target.value)
                }
              />
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Sección 5: Interés */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">5. Interés y Compromiso</h3>
          </div>
        </div>
        <div className="grid gap-4 pl-12">
          {renderFieldInput("Grado de interés", "gradoInteres", "enum", [
            { value: "alto", label: "Alto" },
            { value: "medio", label: "Medio" },
            { value: "bajo", label: "Bajo" },
          ])}
          {renderFieldInput("Nivel de actuación", "nivelActuacion", "enum", [
            {
              value: "solo_diagnostico",
              label: "Solo diagnóstico y propuesta",
            },
            {
              value: "implantacion",
              label: "Implantación de actuaciones piloto",
            },
          ])}
          {renderFieldInput(
            "Disponibilidad para",
            "disponibilidad",
            "checkbox-array",
            [
              { value: "reuniones", label: "Asistir a reuniones" },
              { value: "visitas", label: "Recibir visitas técnicas" },
              {
                value: "seguimiento",
                label: "Colaborar en el seguimiento",
              },
            ],
          )}
          {renderFieldInput(
            "Relevo generacional",
            "relevoGeneracional",
            "enum",
            [
              {
                value: "si_familiares",
                label: "Sí, hay familiares interesados",
              },
              {
                value: "no_riesgo_abandono",
                label: "No, existe riesgo de abandono",
              },
              {
                value: "buscando",
                label: "Estoy buscando a alguien",
              },
            ],
          )}
        </div>
      </div>

      <Separator />

      {/* Sección 6: Formación */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">6. Necesidades Formativas</h3>
          </div>
        </div>
        <div className="grid gap-4 pl-12">
          {renderFieldInput(
            "Temáticas de formación",
            "formacion",
            "checkbox-array",
            [
              { value: "castano", label: "Cultivo del castaño" },
              { value: "agroforestal", label: "Sistemas agroforestales" },
              {
                value: "agri_regenerativa",
                label: "Agricultura regenerativa",
              },
              {
                value: "gana_regenerativa",
                label: "Ganadería regenerativa",
              },
              { value: "carbono", label: "Fijación de carbono" },
              {
                value: "comercializacion",
                label: "Comercialización",
              },
              { value: "ayudas", label: "Tramitación de ayudas" },
              { value: "legislacion", label: "Legislación y fiscalidad" },
            ],
          )}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Otra formación</Label>
            <Input
              value={(formData.formacionOtro as string) || ""}
              disabled={!isEditing}
              onChange={(e) =>
                handleFieldChange("formacionOtro", e.target.value)
              }
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Sección 7: Social */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">7. Dimensión Social</h3>
          </div>
        </div>
        <div className="grid gap-4 pl-12">
          {renderFieldInput(
            "¿Estaría dispuesto/a a participar en gestión conjunta?",
            "colaboracion",
            "enum",
            [
              {
                value: "si_agrupacion",
                label: "Sí, en agrupación",
              },
              {
                value: "si_puntuales",
                label: "Sí, acciones puntuales",
              },
              {
                value: "no_individual",
                label: "No, gestión individual",
              },
              {
                value: "no_se_asesoria",
                label: "No lo sé (asesoramiento)",
              },
            ],
          )}
          <Separator />
          {renderFieldInput(
            "¿Es el minifundio un obstáculo?",
            "minifundio",
            "enum",
            [
              { value: "si_mucho", label: "Sí, mucho" },
              { value: "si_asumible", label: "Sí, asumible" },
              { value: "no_adecuado", label: "No, es adecuado" },
            ],
          )}
          <Separator />
          {renderFieldInput(
            "Cesión al Banco de Tierras",
            "cesionTierras",
            "enum",
            [
              { value: "si_contrato", label: "Sí, bajo contrato" },
              {
                value: "si_municipio",
                label: "Sí, solo a gente del municipio",
              },
              { value: "no", label: "No me interesa" },
            ],
          )}
          <Separator />
          {renderFieldInput(
            "Gobernanza y Comunidad",
            "gobernanzaComunidad",
            "checkbox-array",
            [
              { value: "cooperativa", label: "Cooperativa local" },
              { value: "caminos", label: "Recuperar caminos" },
              { value: "hacenderas", label: "Hacenderas/Trabajo comunitario" },
              { value: "contacto", label: "Facilitar contacto propietarios" },
              { value: "otros", label: "Otros" },
            ],
          )}
          {renderFieldInput("Otras sugerencias", "gobernanzaOtro")}
        </div>
      </div>

      <Separator />

      {/* Observaciones */}
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
            disabled={!isEditing}
            onChange={(e) => handleFieldChange("observaciones", e.target.value)}
            className="min-h-[100px]"
          />
        </div>
      </div>

      <Separator />

      {/* Consentimientos */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">8. Consentimiento y RGPD</h3>
          </div>
        </div>
        <div className="grid gap-4 pl-12">
          <div className="flex items-start space-x-3 space-y-0 border p-4 rounded-md">
            <Checkbox
              id="consentimientoTratamiento"
              checked={!!formData.consentimientoTratamiento}
              disabled={!isEditing}
              onCheckedChange={(checked) =>
                handleFieldChange("consentimientoTratamiento", !!checked)
              }
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="consentimientoTratamiento">
                Acepto el tratamiento de mis datos personales
              </Label>
            </div>
          </div>
          <div className="flex items-start space-x-3 space-y-0 border p-4 rounded-md">
            <Checkbox
              id="aceptoComunicaciones"
              checked={!!formData.aceptoComunicaciones}
              disabled={!isEditing}
              onCheckedChange={(checked) =>
                handleFieldChange("aceptoComunicaciones", !!checked)
              }
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="aceptoComunicaciones">
                Acepto recibir comunicaciones sobre el proyecto
              </Label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // --- RENDERIZADO PRINCIPAL ---

  if (!match) return null;

  if (submissionLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium">Cuestionario no encontrado</h3>
        <Link href="/submissions">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al listado
          </Button>
        </Link>
      </div>
    );
  }

  const StatusIcon = statusConfig[submission.status]?.icon || Clock;
  const isOCR = submission.source === "ocr";

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      {/* Header y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/submissions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {submission.nombreApellidos || "Sin nombre"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[submission.status]?.color}`}
              >
                <StatusIcon className="h-3 w-3" />
                {submission.status}
              </span>
              <Badge variant="outline">{submission.source.toUpperCase()}</Badge>
              {submission.codigo && (
                <Badge variant="secondary" className="font-mono">
                  {submission.codigo}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Editar: Solo si es OCR */}
          {isOCR && !isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}

          {isEditing ? (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  setFormData(submission); // Reset
                }}
                disabled={saveMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" /> Cancelar
              </Button>
              <Button
                onClick={() => saveMutation.mutate(formData)}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <Save className="h-4 w-4 mr-2" /> Guardar
              </Button>
            </div>
          ) : (
            <>
              {submission.status !== "aprobado" && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => updateStatusMutation.mutate("aprobado")}
                >
                  <CheckCircle className="h-4 w-4 mr-2" /> Aprobar
                </Button>
              )}
              {submission.status !== "rechazado" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatusMutation.mutate("rechazado")}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Rechazar
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: CONDICIONAL SEGÚN FUENTE */}
      {isOCR ? (
        // VISTA PARTIDA (SPLIT VIEW) PARA OCR
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          {/* Lado Izquierdo: PDF */}
          <Card className="flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="py-3 px-4 border-b shrink-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Documento Original
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 bg-muted/30">
              {ocrJob ? (
                ocrJob.fileType.includes("pdf") ? (
                  <iframe
                    src={`${ocrJob.fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full border-0"
                    title="Visualización PDF"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full p-4">
                    <img
                      src={ocrJob.fileUrl}
                      alt="Original"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                  <FileText className="h-12 w-12 mb-2 opacity-50" />
                  <p>No se encontró el archivo original.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lado Derecho: Formulario */}
          <Card className="flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="py-3 px-4 border-b shrink-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Datos Extraídos
              </CardTitle>
              <CardDescription>
                {isEditing
                  ? "Modifica los datos si es necesario."
                  : "Vista de lectura de los datos."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-900/20">
              {renderFormContent()}
            </CardContent>
          </Card>
        </div>
      ) : (
        // VISTA ÚNICA (SINGLE VIEW) PARA WEB/GOOGLE FORMS
        <div className="flex-1 min-h-0 overflow-hidden">
          <Card className="flex flex-col h-full overflow-hidden max-w-5xl mx-auto">
            <CardHeader className="py-4 px-6 border-b shrink-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Datos del Cuestionario
              </CardTitle>
              <CardDescription>
                Cuestionario recibido a través de {submission.source}.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6 lg:p-10 bg-slate-50/50 dark:bg-slate-900/20">
              {renderFormContent()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
