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
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Submission } from "@shared/schema";

const statusConfig = {
  borrador: { color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400", icon: Clock },
  enviado: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Clock },
  aprobado: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle },
  rechazado: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
  pendiente: { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: Clock },
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
  no: "No",
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
  creacion_empleo_local: "Creación de empleo local",
  recuperar_tierras_abandonadas: "Recuperar tierras abandonadas",
  formacion_capacitacion: "Formación y capacitación",
  cooperativas_gestion_colectiva: "Cooperativas y gestión colectiva",
  turismo_rural: "Turismo rural",
};

function InfoItem({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: typeof User }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{labelMappings[value] || value}</p>
      </div>
    </div>
  );
}

function ArrayInfo({ label, values }: { label: string; values: string[] | null | undefined }) {
  if (!values || values.length === 0) return null;
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((v, i) => (
          <Badge key={i} variant="secondary">{labelMappings[v] || v}</Badge>
        ))}
      </div>
    </div>
  );
}

export default function SubmissionDetailPage() {
  const [match, params] = useRoute("/submissions/:id");
  const { toast } = useToast();

  const { data: submission, isLoading } = useQuery<Submission>({
    queryKey: ["/api/submissions", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/submissions/${params?.id}`);
      if (!res.ok) throw new Error("Failed to fetch submission");
      return res.json();
    },
    enabled: !!params?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest("PATCH", `/api/submissions/${params?.id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/submissions", params?.id] });
      toast({
        title: "Estado actualizado",
        description: "El estado del cuestionario ha sido actualizado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del cuestionario.",
        variant: "destructive",
      });
    },
  });

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/submissions">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {submission.nombreApellidos || "Sin nombre"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[submission.status]?.color}`}>
                <StatusIcon className="h-3 w-3" />
                {submission.status}
              </span>
              <Badge variant="outline">{submission.source.toUpperCase()}</Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {submission.status !== "aprobado" && (
            <Button
              variant="default"
              size="sm"
              onClick={() => updateStatusMutation.mutate("aprobado")}
              disabled={updateStatusMutation.isPending}
              data-testid="button-approve"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprobar
            </Button>
          )}
          {submission.status !== "rechazado" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateStatusMutation.mutate("rechazado")}
              disabled={updateStatusMutation.isPending}
              data-testid="button-reject"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rechazar
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Datos Personales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoItem label="Nombre y apellidos" value={submission.nombreApellidos} icon={User} />
            <InfoItem label="Teléfono" value={submission.telefono} icon={Phone} />
            <InfoItem label="Email" value={submission.email} icon={Mail} />
            <InfoItem label="Localidad" value={submission.localidad} icon={MapPin} />
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Género" value={submission.genero} />
              <InfoItem label="Edad" value={submission.edad} />
            </div>
            <InfoItem label="Relación con la finca" value={submission.relacionFinca} />
            {submission.relacionFincaOtra && (
              <InfoItem label="Otra relación" value={submission.relacionFincaOtra} />
            )}
            {submission.relacionFinca === "propietario" && (
              <InfoItem label="Titularidad compartida" value={submission.titularidadCompartida} />
            )}
            <InfoItem label="Agricultor/a a título principal" value={submission.agricultorTituloPrincipal} />
            <InfoItem label="Asociación" value={submission.asociacionPertenece} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TreePine className="h-5 w-5" />
              Información de la Finca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoItem label="Referencias catastrales" value={submission.referenciasCatastrales} />
            <InfoItem label="Superficie" value={submission.superficieCategoria} />
            {submission.superficieOtra && (
              <InfoItem label="Superficie (otra)" value={submission.superficieOtra} />
            )}
            <ArrayInfo label="Tipo de finca" values={submission.tipoFinca} />
            <InfoItem label="Uso actual del suelo" value={submission.usoSuelo} />
            {submission.usoSueloOtro && (
              <InfoItem label="Otro uso" value={submission.usoSueloOtro} />
            )}
            <InfoItem label="En producción" value={submission.enProduccion ? "Sí" : submission.enProduccion === false ? "No" : null} />
            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Condiciones de la finca</p>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Acceso" value={submission.acceso} />
              <InfoItem label="Agua" value={submission.agua} />
              <InfoItem label="Pendiente" value={submission.pendiente} />
              <InfoItem label="Pedregosidad" value={submission.pedregosidad} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Necesidades y Objetivos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ArrayInfo label="Necesidades de la finca" values={submission.necesidades} />
            {submission.necesidadesOtras && (
              <InfoItem label="Otras necesidades" value={submission.necesidadesOtras} />
            )}
            <Separator />
            <ArrayInfo label="Objetivos del modelo agroforestal" values={submission.objetivosModelo} />
            <ArrayInfo label="Producción principal" values={submission.produccionPrincipal} />
            {submission.otrosObjetivosTexto && (
              <InfoItem label="Otros objetivos" value={submission.otrosObjetivosTexto} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Interés y Compromiso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoItem label="Grado de interés" value={submission.gradoInteres} />
            <InfoItem label="Nivel de actuación" value={submission.nivelActuacion} />
            <ArrayInfo label="Disponibilidad" values={submission.disponibilidad} />
            <InfoItem label="Relevo generacional" value={submission.relevoGeneracional} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Necesidades Formativas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ArrayInfo label="Formación deseada" values={submission.formacion} />
            {submission.formacionOtro && (
              <InfoItem label="Otra formación" value={submission.formacionOtro} />
            )}
          </CardContent>
        </Card>

          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              7. Dimensión Social y Gestión Colectiva
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-primary">Modelos de colaboración y gestión comunitaria</p>
              <InfoItem label="¿Estaría dispuesto/a a participar en gestión conjunta?" value={submission.colaboracion} />
            </div>
            <Separator />
            <InfoItem label="¿Considera que el tamaño/dispersión de sus fincas es un obstáculo?" value={submission.minifundio} />
            <Separator />
            <InfoItem label="¿Cedería la gestión mediante Banco de Tierras si no puede trabajarla?" value={submission.cesionTierras} />
            <Separator />
            <ArrayInfo label="¿Cómo cree que el proyecto podría mejorar la comunidad?" values={submission.gobernanzaComunidad} />
            {submission.gobernanzaOtro && (
              <InfoItem label="Otras sugerencias de gobernanza" value={submission.gobernanzaOtro} />
            )}
          </CardContent>
        </Card>
      </div>

      {submission.observaciones && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Observaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{submission.observaciones}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Metadatos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Creado</p>
              <p className="font-medium">{new Date(submission.createdAt).toLocaleString("es-ES")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Actualizado</p>
              <p className="font-medium">{new Date(submission.updatedAt).toLocaleString("es-ES")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Fuente</p>
              <p className="font-medium">{submission.source.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Consentimiento RGPD</p>
              <p className="font-medium">{submission.consentimientoTratamiento ? "Sí" : "No"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
