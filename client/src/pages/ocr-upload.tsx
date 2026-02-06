import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Upload,
  FileText,
  Image,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  Loader2,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { OcrJob } from "@shared/schema";

const statusLabels: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pendiente_ocr: {
    label: "Pendiente OCR",
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    icon: <Clock className="h-3 w-3" />,
  },
  ocr_completado: {
    label: "OCR Completado",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  pendiente_revision: {
    label: "Pendiente Revisión",
    color:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    icon: <Eye className="h-3 w-3" />,
  },
  aprobado: {
    label: "Aprobado",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  rechazado: {
    label: "Rechazado",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    icon: <XCircle className="h-3 w-3" />,
  },
};

export default function OcrUploadPage() {
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { data: ocrJobs, isLoading } = useQuery<OcrJob[]>({
    queryKey: ["/api/ocr/jobs"],
    // CORRECCIÓN: Usamos el estado real 'pendiente_ocr' definido en tu esquema
    refetchInterval: (query) => {
      const data = query.state.data as OcrJob[] | undefined;
      // Si hay algún trabajo en estado 'pendiente_ocr', refrescar cada 2000ms
      const hayTrabajosPendientes = data?.some(
        (job) => job.status === "pendiente_ocr",
      );
      return hayTrabajosPendientes ? 2000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/ocr/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error al subir archivos");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Archivos subidos correctamente" });
      queryClient.invalidateQueries({ queryKey: ["/api/ocr/jobs"] });
      setSelectedFiles(null);
    },
    onError: () => {
      toast({ title: "Error al subir archivos", variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUpload = () => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const formData = new FormData();
    Array.from(selectedFiles).forEach((file) => {
      formData.append("files", file);
    });

    uploadMutation.mutate(formData);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf"))
      return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes("image"))
      return <Image className="h-5 w-5 text-blue-500" />;
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          Subida de PDFs/Imágenes + OCR
        </h1>
        <p className="text-muted-foreground">
          Sube documentos escaneados para extraer datos mediante OCR y
          validarlos antes de crear cuestionarios.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir Archivos
          </CardTitle>
          <CardDescription>
            Arrastra y suelta archivos PDF, JPG o PNG, o haz clic para
            seleccionarlos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <Label htmlFor="file-upload" className="cursor-pointer">
              <Input
                id="file-upload"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-file-upload"
              />
              <Button type="button" variant="outline" asChild>
                <span>Seleccionar Archivos</span>
              </Button>
            </Label>
          </div>

          {selectedFiles && selectedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="font-medium">
                Archivos seleccionados ({selectedFiles.length}):
              </p>
              <ul className="space-y-1">
                {Array.from(selectedFiles).map((file, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    {getFileIcon(file.type)}
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </li>
                ))}
              </ul>
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="mt-4"
                data-testid="button-upload"
              >
                {uploadMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Subir y Procesar OCR
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trabajos de OCR</CardTitle>
          <CardDescription>
            Lista de archivos procesados o pendientes de procesamiento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : ocrJobs && ocrJobs.length > 0 ? (
            <div className="space-y-3">
              {ocrJobs.map((job) => {
                const statusInfo =
                  statusLabels[job.status] || statusLabels.pendiente_ocr;
                return (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                    data-testid={`card-ocr-job-${job.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {getFileIcon(job.fileType)}
                      <div>
                        <p className="font-medium">{job.fileName}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(job.createdAt).toLocaleString("es-ES")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {job.duplicateWarning && (
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Posible duplicado
                        </Badge>
                      )}
                      <Badge className={statusInfo.color}>
                        {statusInfo.icon}
                        <span className="ml-1">{statusInfo.label}</span>
                      </Badge>
                      {(job.status === "ocr_completado" ||
                        job.status === "pendiente_revision") && (
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/ocr/${job.id}/review`}
                            data-testid={`link-review-${job.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Revisar
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay trabajos de OCR. Sube archivos para comenzar.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
