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
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Pencil,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { Submission } from "@shared/schema";

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

const labelMappings: Record<string, string> = {
  mujer: "Mujer",
  hombre: "Hombre",
  otros: "Otros",
  menos_35: "Menos de 35 años",
  entre_35_50: "Entre 35 y 50 años",
  mas_50: "Más de 50 años",
  propietario: "Propietario/a",
  arrendatario: "Arrendatario/a",
  gestor: "Gestor/a",
  otra: "Otra",
  si: "Sí",
  no_complementario: "No, es complementario",
  menos_1ha: "Menos de 1 ha",
  entre_1_5ha: "Entre 1 y 5 ha",
  mas_5ha: "Más de 5 ha",
  no_se: "No lo sé / pendiente de consultar",
  cultivo_activo: "Cultivo activo",
  pasto: "Pasto",
  monte: "Monte",
  sin_uso: "Sin uso / abandonado",
  otro: "Otro",
  bueno: "Bueno (acceso con vehículo)",
  regular: "Regular",
  malo: "Malo",
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  alto: "Alto",
  medio: "Medio",
  bajo: "Bajo",
  solo_diagnostico: "Solo diagnóstico y propuesta técnica",
  implantacion: "Implantación de actuaciones piloto",
  si_familiares: "Sí, hay familiares o personas interesadas",
  no_riesgo_abandono: "No, existe riesgo de abandono tras mi jubilación",
  buscando: "Estoy buscando a alguien que quiera trabajarla",
  si_agrupacion: "Sí, me interesa integrarme en una agrupación",
  si_puntuales: "Sí, pero solo para acciones puntuales",
  no_individual: "No, prefiero gestión individual",
  no_se_asesoria: "No lo sé, necesitaría asesoramiento",
  si_mucho: "Sí, mucho",
  si_asumible: "Sí, aunque es asumible",
  no_adecuado: "No, el tamaño es adecuado",
  si_contrato: "Sí, bajo contrato de arrendamiento o cesión",
  si_municipio: "Sí, pero solo a alguien del municipio",
  no: "No, no tengo interés en ceder la gestión",
  cooperativa: "Creando una cooperativa o agrupación de productores local",
  caminos: "Recuperando caminos y accesos que beneficien a toda la vecindad",
  hacenderas:
    'Organizando "hacenderas" o jornadas de trabajo comunitario voluntario',
  contacto:
    "Facilitando el contacto entre propietarios que no viven en el pueblo y jóvenes que quieren trabajar la tierra",
  otros_gobernanza: "Otros",
  productividad: "Mejora de la productividad",
  matorral: "Control del matorral",
  incendios: "Prevención de incendios",
  suelo: "Mejora del suelo",
  diversificacion: "Diversificación de usos",
  abandonada: "Puesta en valor de finca abandonada",
  biodiversidad: "Conservación del paisaje y la biodiversidad",
  reduccion_costes: "Reducción de costes de mantenimiento",
  impacto_social: "Nuevos modelos agroforestales de impacto social",
  madera: "Madera",
  lena: "Leña",
  castana: "Castaña",
  vid: "Vid",
  fruticola: "Frutícola (cereza, pera, manzana)",
  horticola: "Hortícola (pimiento, cebolla)",
  pasto_ganadera: "Pasto / ganadera",
  apicolas: "Productos apícolas (miel, polen, propóleo)",
  reuniones: "Asistir a reuniones o talleres",
  visitas: "Recibir visitas técnicas en la finca",
  seguimiento: "Colaborar en el seguimiento del proyecto",
  castano: "Cultivo del castaño",
  agroforestal: "Sistemas agroforestales",
  agri_regenerativa: "Agricultura regenerativa",
  gana_regenerativa: "Ganadería regenerativa",
  carbono: "Plantaciones de fijación de carbono",
  comercializacion: "Comercialización de productos",
  ayudas: "Tramitación de ayudas",
  legislacion: "Legislación y fiscalidad",
  agricola: "Agrícola",
  forestal: "Forestal",
  mixta: "Mixta",
};

const OPTIONS = {
  genero: ["mujer", "hombre", "otros"],
  edad: ["menos_35", "entre_35_50", "mas_50"],
  relacionFinca: ["propietario", "arrendatario", "gestor", "otra"],
  titularidadCompartida: ["si", "no"],
  agricultorTituloPrincipal: ["si", "no_complementario"],
  superficieCategoria: ["menos_1ha", "entre_1_5ha", "mas_5ha", "otra", "no_se"],
  usoSuelo: ["cultivo_activo", "pasto", "monte", "sin_uso", "otro"],
  acceso: ["bueno", "regular", "malo"],
  agua: ["si", "no", "no_se"],
  nivel: ["baja", "media", "alta"],
  gradoInteres: ["alto", "medio", "bajo"],
  nivelActuacion: ["solo_diagnostico", "implantacion"],
  relevoGeneracional: ["si_familiares", "no_riesgo_abandono", "buscando"],
  colaboracion: [
    "si_agrupacion",
    "si_puntuales",
    "no_individual",
    "no_se_asesoria",
  ],
  minifundio: ["si_mucho", "si_asumible", "no_adecuado"],
  cesionTierras: ["si_contrato", "si_municipio", "no"],
  tipoFinca: ["agricola", "forestal", "mixta"],
};

// --- COMPONENTES AUXILIARES DEFINIDOS FUERA PARA EVITAR RE-RENDERIZADO ---

const EditableInfoItem = ({
  label,
  value,
  onChange,
  isEditing,
  icon: Icon,
  type = "text",
  options = [],
}: {
  label: string;
  value: any;
  onChange: (val: any) => void;
  isEditing: boolean;
  icon?: any;
  type?: "text" | "select" | "textarea";
  options?: string[];
}) => {
  if (isEditing) {
    return (
      <div className="space-y-2 mb-4">
        <Label>{label}</Label>
        {type === "textarea" ? (
          <Textarea
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : type === "select" ? (
          <Select value={(value as string) || ""} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {labelMappings[opt] || opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    );
  }

  if (!value && !isEditing) return null;

  return (
    <div className="flex items-start gap-3 mb-2">
      {Icon && (
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      )}
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{labelMappings[value as string] || value}</p>
      </div>
    </div>
  );
};

const EditableArray = ({
  label,
  currentValues = [],
  onChange,
  isEditing,
  options,
}: {
  label: string;
  currentValues: string[];
  onChange: (val: string, checked: boolean) => void;
  isEditing: boolean;
  options: string[];
}) => {
  if (isEditing) {
    return (
      <div className="space-y-3 mb-4">
        <Label>{label}</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 border rounded-md">
          {options.map((opt) => (
            <div key={opt} className="flex items-center space-x-2">
              <Checkbox
                id={`${label}-${opt}`}
                checked={currentValues.includes(opt)}
                onCheckedChange={(checked) => onChange(opt, checked as boolean)}
              />
              <label
                htmlFor={`${label}-${opt}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {labelMappings[opt] || opt}
              </label>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!currentValues || currentValues.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {currentValues.map((v, i) => (
          <Badge key={i} variant="secondary">
            {labelMappings[v] || v}
          </Badge>
        ))}
      </div>
    </div>
  );
};

// --- FIN COMPONENTES AUXILIARES ---

export default function SubmissionDetailPage() {
  const [match, params] = useRoute("/submissions/:id");
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Submission>>({});

  const { data: submission, isLoading } = useQuery<Submission>({
    queryKey: ["/api/submissions", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/submissions/${params?.id}`);
      if (!res.ok) throw new Error("Failed to fetch submission");
      return res.json();
    },
    enabled: !!params?.id,
  });

  useEffect(() => {
    if (submission) {
      setEditForm(submission);
    }
  }, [submission, isEditing]);

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

  const handleEditChange = (field: keyof Submission, value: any) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (
    field: keyof Submission,
    value: string,
    checked: boolean,
  ) => {
    setEditForm((prev) => {
      const currentArray = (prev[field] as string[]) || [];
      if (checked) {
        return { ...prev, [field]: [...currentArray, value] };
      } else {
        return {
          ...prev,
          [field]: currentArray.filter((item) => item !== value),
        };
      }
    });
  };

  // Funciones helper para renderizar los componentes externos pasando las props correctas
  const renderItem = (
    label: string,
    field: keyof Submission,
    icon?: any,
    type: "text" | "select" | "textarea" = "text",
    options: string[] = [],
  ) => (
    <EditableInfoItem
      key={field}
      label={label}
      value={isEditing ? editForm[field] : submission?.[field]}
      onChange={(val) => handleEditChange(field, val)}
      isEditing={isEditing}
      icon={icon} // CORREGIDO: Se pasa la variable 'icon' (minúscula) que viene como argumento
      type={type}
      options={options}
    />
  );

  const renderArray = (
    label: string,
    field: keyof Submission,
    options: string[],
  ) => (
    <EditableArray
      key={field}
      label={label}
      currentValues={
        ((isEditing ? editForm[field] : submission?.[field]) as string[]) || []
      }
      onChange={(val, checked) => handleArrayChange(field, val, checked)}
      isEditing={isEditing}
      options={options}
    />
  );

  if (!match) return null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
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

  return (
    <div className="space-y-6">
      {/* Header y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          {/* Botones de Edición (Solo OCR) */}
          {submission.source === "ocr" && !isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}

          {isEditing ? (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setIsEditing(false)}
                disabled={saveMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" /> Cancelar
              </Button>
              <Button
                onClick={() => saveMutation.mutate(editForm)}
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Datos Personales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Datos Personales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing && renderItem("Código (SV_JPXX_XXX)", "codigo")}
            {renderItem("Nombre y apellidos", "nombreApellidos", User)}
            {renderItem("Teléfono", "telefono", Phone)}
            {renderItem("Email", "email", Mail)}
            {renderItem("Localidad", "localidad", MapPin)}
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              {renderItem(
                "Género",
                "genero",
                undefined,
                "select",
                OPTIONS.genero,
              )}
              {renderItem("Edad", "edad", undefined, "select", OPTIONS.edad)}
            </div>
            {renderItem(
              "Relación con la finca",
              "relacionFinca",
              undefined,
              "select",
              OPTIONS.relacionFinca,
            )}
            {renderItem("Otra relación", "relacionFincaOtra")}
            {renderItem(
              "Titularidad compartida",
              "titularidadCompartida",
              undefined,
              "select",
              OPTIONS.titularidadCompartida,
            )}
            {renderItem(
              "Agricultor/a principal",
              "agricultorTituloPrincipal",
              undefined,
              "select",
              OPTIONS.agricultorTituloPrincipal,
            )}
            {renderItem("Asociación", "asociacionPertenece")}
          </CardContent>
        </Card>

        {/* Información Finca */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TreePine className="h-5 w-5" /> Información de la Finca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderItem(
              "Referencias catastrales",
              "referenciasCatastrales",
              undefined,
              "textarea",
            )}
            {renderItem(
              "Superficie",
              "superficieCategoria",
              undefined,
              "select",
              OPTIONS.superficieCategoria,
            )}
            {renderItem("Superficie (otra)", "superficieOtra")}

            {renderArray("Tipo de finca", "tipoFinca", OPTIONS.tipoFinca)}

            {renderItem(
              "Uso actual del suelo",
              "usoSuelo",
              undefined,
              "select",
              OPTIONS.usoSuelo,
            )}
            {renderItem("Otro uso", "usoSueloOtro")}

            {/* Boolean manual para "enProduccion" */}
            {isEditing ? (
              <div className="space-y-2 mb-4">
                <Label>En producción</Label>
                <Select
                  value={
                    editForm.enProduccion === true
                      ? "true"
                      : editForm.enProduccion === false
                        ? "false"
                        : ""
                  }
                  onValueChange={(val) =>
                    handleEditChange("enProduccion", val === "true")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sí</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              renderItem("En producción", "enProduccion")
            )}

            <Separator />
            <p className="text-sm font-medium text-muted-foreground">
              Condiciones de la finca
            </p>
            <div className="grid grid-cols-2 gap-4">
              {renderItem(
                "Acceso",
                "acceso",
                undefined,
                "select",
                OPTIONS.acceso,
              )}
              {renderItem("Agua", "agua", undefined, "select", OPTIONS.agua)}
              {renderItem(
                "Pendiente",
                "pendiente",
                undefined,
                "select",
                OPTIONS.nivel,
              )}
              {renderItem(
                "Pedregosidad",
                "pedregosidad",
                undefined,
                "select",
                OPTIONS.nivel,
              )}
            </div>
          </CardContent>
        </Card>

        {/* Necesidades y Objetivos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" /> Necesidades y Objetivos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderArray("Necesidades", "necesidades", [
              "productividad",
              "matorral",
              "incendios",
              "suelo",
              "diversificacion",
              "abandonada",
              "otras",
            ])}
            {renderItem("Otras necesidades", "necesidadesOtras")}

            <Separator />
            {renderArray("Objetivos del modelo", "objetivosModelo", [
              "castano",
              "agroforestal",
              "agri_regenerativa",
              "gana_regenerativa",
              "carbono",
              "biodiversidad",
              "reduccion_costes",
              "impacto_social",
              "otros",
            ])}

            <Separator />
            {renderArray("Producción principal", "produccionPrincipal", [
              "madera",
              "lena",
              "castana",
              "vid",
              "fruticola",
              "horticola",
              "pasto_ganadera",
              "apicolas",
            ])}

            {renderItem(
              "Otros objetivos (Texto)",
              "otrosObjetivosTexto",
              undefined,
              "textarea",
            )}
          </CardContent>
        </Card>

        {/* Interés y Social */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" /> Interés y Compromiso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderItem(
              "Grado de interés",
              "gradoInteres",
              undefined,
              "select",
              OPTIONS.gradoInteres,
            )}
            {renderItem(
              "Nivel de actuación",
              "nivelActuacion",
              undefined,
              "select",
              OPTIONS.nivelActuacion,
            )}
            {renderArray("Disponibilidad", "disponibilidad", [
              "reuniones",
              "visitas",
              "seguimiento",
            ])}
            {renderItem(
              "Relevo generacional",
              "relevoGeneracional",
              undefined,
              "select",
              OPTIONS.relevoGeneracional,
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> Necesidades Formativas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderArray("Formación deseada", "formacion", [
              "castano",
              "agroforestal",
              "agri_regenerativa",
              "gana_regenerativa",
              "carbono",
              "comercializacion",
              "ayudas",
              "legislacion",
            ])}
            {renderItem("Otra formación", "formacionOtro")}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Dimensión Social
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderItem(
              "Colaboración",
              "colaboracion",
              undefined,
              "select",
              OPTIONS.colaboracion,
            )}
            {renderItem(
              "Minifundio",
              "minifundio",
              undefined,
              "select",
              OPTIONS.minifundio,
            )}
            {renderItem(
              "Cesión de Tierras",
              "cesionTierras",
              undefined,
              "select",
              OPTIONS.cesionTierras,
            )}

            <Separator />
            {renderArray("Gobernanza y Comunidad", "gobernanzaComunidad", [
              "cooperativa",
              "caminos",
              "hacenderas",
              "contacto",
              "otros_gobernanza",
            ])}
            {renderItem(
              "Otra sugerencia gobernanza",
              "gobernanzaOtro",
              undefined,
              "textarea",
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Observaciones finales
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderItem("", "observaciones", undefined, "textarea")}
        </CardContent>
      </Card>

      {/* Footer Metadata - Read Only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Metadatos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Creado</p>
              <p className="font-medium">
                {new Date(submission.createdAt).toLocaleString("es-ES")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Actualizado</p>
              <p className="font-medium">
                {new Date(submission.updatedAt).toLocaleString("es-ES")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Fuente</p>
              <p className="font-medium">{submission.source.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Consentimiento RGPD</p>
              <p className="font-medium">
                {submission.consentimientoTratamiento ? "Sí" : "No"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
