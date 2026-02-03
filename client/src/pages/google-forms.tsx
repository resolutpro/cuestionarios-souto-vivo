import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  FileSpreadsheet, 
  RefreshCw, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Clock,
  Link as LinkIcon,
  Loader2,
  Play,
  Pause,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import type { GoogleFormsConfig, GoogleFormsResponse, Submission } from "@shared/schema";

interface GoogleFormsStats {
  totalResponses: number;
  processedResponses: number;
  pendingResponses: number;
  lastSyncAt: string | null;
}

export default function GoogleFormsPage() {
  const [useStateValue, useStateSet] = useState(""); // Dummy for preserving useState import logic if needed
  const { toast } = useToast();
  const [newFormId, setNewFormId] = useState("");
  const [newFormUrl, setNewFormUrl] = useState("");
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);

  const { data: config, isLoading: configLoading } = useQuery<GoogleFormsConfig | null>({
    queryKey: ["/api/google-forms/config"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<GoogleFormsStats>({
    queryKey: ["/api/google-forms/stats"],
  });

  const { data: responses, isLoading: responsesLoading } = useQuery<(GoogleFormsResponse | (Submission & { isSubmission: true }))[]>({
    queryKey: ["/api/google-forms/responses-integrated"],
    queryFn: async () => {
      const [responsesRes, submissionsRes] = await Promise.all([
        fetch("/api/google-forms/responses"),
        fetch("/api/submissions?source=google_forms&limit=50")
      ]);
      const responsesData = await responsesRes.json();
      const submissionsData = await submissionsRes.json();
      
      const integrated = [
        ...responsesData.map((r: any) => ({ ...r, isSubmission: false })),
        ...submissionsData.submissions.map((s: any) => ({ ...s, isSubmission: true, responseId: `SUB-${s.id}` }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      return integrated;
    }
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (data: { formId: string; formUrl?: string }) => {
      return apiRequest("POST", "/api/google-forms/config", data);
    },
    onSuccess: () => {
      toast({ title: "Configuración guardada correctamente" });
      queryClient.invalidateQueries({ queryKey: ["/api/google-forms/config"] });
      setIsConfigDialogOpen(false);
      setNewFormId("");
      setNewFormUrl("");
    },
    onError: () => {
      toast({ title: "Error al guardar configuración", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      return apiRequest("POST", "/api/google-forms/config/toggle", { isActive });
    },
    onSuccess: () => {
      toast({ title: "Estado de sincronización actualizado" });
      queryClient.invalidateQueries({ queryKey: ["/api/google-forms/config"] });
    },
    onError: () => {
      toast({ title: "Error al actualizar estado", variant: "destructive" });
    },
  });

  const syncNowMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/google-forms/sync");
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Sincronización completada", 
        description: `Se procesaron ${data.processed || 0} respuestas nuevas.`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/google-forms/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/google-forms/responses"] });
    },
    onError: () => {
      toast({ title: "Error en la sincronización", variant: "destructive" });
    },
  });

  const handleSaveConfig = () => {
    if (!newFormId.trim()) {
      toast({ title: "El ID del formulario es requerido", variant: "destructive" });
      return;
    }
    saveConfigMutation.mutate({ formId: newFormId.trim(), formUrl: newFormUrl.trim() || undefined });
  };

  const fieldMappings = [
    { googleField: "Nombre y Apellidos", internalField: "nombreApellidos" },
    { googleField: "Teléfono", internalField: "telefono" },
    { googleField: "Email", internalField: "email" },
    { googleField: "Localidad", internalField: "localidad" },
    { googleField: "Género", internalField: "genero" },
    { googleField: "Edad", internalField: "edad" },
    { googleField: "Relación con la finca", internalField: "relacionFinca" },
    { googleField: "Referencias catastrales", internalField: "referenciasCatastrales" },
    { googleField: "Superficie", internalField: "superficieCategoria" },
    { googleField: "Uso del suelo", internalField: "usoSuelo" },
    { googleField: "Grado de interés", internalField: "gradoInteres" },
    { googleField: "Observaciones", internalField: "observaciones" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Integración Google Forms</h1>
        <p className="text-muted-foreground">
          Conecta un formulario de Google Forms para importar respuestas automáticamente.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración
            </CardTitle>
            <CardDescription>
              Configura la conexión con Google Forms.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {configLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : config ? (
              <>
                <div className="space-y-2">
                  <Label>ID del Formulario</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded text-sm">
                      {config.formId}
                    </code>
                    {config.formUrl && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={config.formUrl} target="_blank" rel="noopener noreferrer">
                          <LinkIcon className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sincronización Activa</Label>
                    <p className="text-sm text-muted-foreground">
                      {config.isActive ? "Las respuestas se importan automáticamente" : "Sincronización pausada"}
                    </p>
                  </div>
                  <Switch
                    checked={config.isActive}
                    onCheckedChange={(checked) => toggleActiveMutation.mutate(checked)}
                    disabled={toggleActiveMutation.isPending}
                    data-testid="switch-sync-active"
                  />
                </div>
                {config.lastSyncAt && (
                  <p className="text-sm text-muted-foreground">
                    Última sincronización: {new Date(config.lastSyncAt).toLocaleString("es-ES")}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button 
                    onClick={() => syncNowMutation.mutate()} 
                    disabled={syncNowMutation.isPending}
                    data-testid="button-sync-now"
                  >
                    {syncNowMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Sincronizar Ahora
                  </Button>
                  <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" data-testid="button-change-config">
                        Cambiar Configuración
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Configurar Google Forms</DialogTitle>
                        <DialogDescription>
                          Introduce el ID del formulario de Google Forms para conectar.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="formId">ID del Formulario *</Label>
                          <Input
                            id="formId"
                            value={newFormId}
                            onChange={(e) => setNewFormId(e.target.value)}
                            placeholder="1FAIpQLSc..."
                            data-testid="input-form-id"
                          />
                          <p className="text-xs text-muted-foreground">
                            Puedes encontrar el ID en la URL del formulario.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="formUrl">URL del Formulario (opcional)</Label>
                          <Input
                            id="formUrl"
                            value={newFormUrl}
                            onChange={(e) => setNewFormUrl(e.target.value)}
                            placeholder="https://docs.google.com/forms/d/..."
                            data-testid="input-form-url"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button 
                          onClick={handleSaveConfig} 
                          disabled={saveConfigMutation.isPending}
                          data-testid="button-save-config"
                        >
                          {saveConfigMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Guardar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">No hay formulario configurado.</p>
                <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-configure">
                      Configurar Google Forms
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Configurar Google Forms</DialogTitle>
                      <DialogDescription>
                        Introduce el ID del formulario de Google Forms para conectar.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="formId">ID del Formulario *</Label>
                        <Input
                          id="formId"
                          value={newFormId}
                          onChange={(e) => setNewFormId(e.target.value)}
                          placeholder="1FAIpQLSc..."
                          data-testid="input-form-id"
                        />
                        <p className="text-xs text-muted-foreground">
                          Puedes encontrar el ID en la URL del formulario.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="formUrl">URL del Formulario (opcional)</Label>
                        <Input
                          id="formUrl"
                          value={newFormUrl}
                          onChange={(e) => setNewFormUrl(e.target.value)}
                          placeholder="https://docs.google.com/forms/d/..."
                          data-testid="input-form-url"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleSaveConfig} 
                        disabled={saveConfigMutation.isPending}
                        data-testid="button-save-config"
                      >
                        {saveConfigMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Guardar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Estadísticas
            </CardTitle>
            <CardDescription>
              Resumen de respuestas importadas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : stats ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{stats.totalResponses}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.processedResponses}</p>
                  <p className="text-sm text-muted-foreground">Procesadas</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingResponses}</p>
                  <p className="text-sm text-muted-foreground">Pendientes</p>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No hay estadísticas disponibles.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mapeo de Campos</CardTitle>
          <CardDescription>
            Correspondencia entre campos de Google Forms y campos internos del cuestionario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Campo Google Forms</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Campo Interno</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fieldMappings.map((mapping, index) => (
                  <tr key={index} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm">{mapping.googleField}</td>
                    <td className="px-4 py-3 text-sm">
                      <code className="px-2 py-1 bg-muted rounded text-xs">{mapping.internalField}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            * Los campos "otros (especificar)" se mapean automáticamente a los campos de texto libre asociados.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Respuestas Recientes</CardTitle>
          <CardDescription>
            Últimas respuestas importadas desde Google Forms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {responsesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : responses && responses.length > 0 ? (
            <div className="space-y-3">
              {responses.slice(0, 20).map((item: any) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`card-response-${item.id}`}
                >
                  <div>
                    <p className="font-medium">
                      {item.isSubmission ? `Cuestionario: ${item.nombreApellidos || 'Sin nombre'}` : `Respuesta #${item.responseId.slice(-8)}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("es-ES")}
                      {item.isSubmission && ` • ${item.localidad || 'Sin localidad'}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.isSubmission ? (
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Cuestionario Creado
                      </Badge>
                    ) : item.processedAt ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Procesada
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendiente
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay respuestas importadas aún.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
