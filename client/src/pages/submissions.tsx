import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Search,
  Filter,
  Download,
  Eye,
  Trash2, // Icono para borrar
  Pencil, // Icono para editar
  ChevronLeft,
  ChevronRight,
  X,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Submission, SubmissionFilter } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const statusColors: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  enviado: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  aprobado:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rechazado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  pendiente:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const sourceLabels: Record<string, string> = {
  web: "Web",
  ocr: "OCR",
  google_forms: "Google Forms",
};

export default function SubmissionsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<SubmissionFilter>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Estados para acciones
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const limit = 10;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    if (searchTerm) params.set("search", searchTerm);
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== "all") {
        params.set(key, String(value));
      }
    });
    return params.toString();
  };

  const { data, isLoading } = useQuery<{
    submissions: Submission[];
    total: number;
    pages: number;
  }>({
    queryKey: [
      "/api/submissions",
      { page, limit, search: searchTerm, ...filters },
    ],
    queryFn: async () => {
      const res = await fetch(`/api/submissions?${buildQueryString()}`);
      if (!res.ok) throw new Error("Failed to fetch submissions");
      return res.json();
    },
  });

  // Mutación para ACTUALIZAR CÓDIGO (Disponible para todos)
  const updateCodeMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      // apiRequest lanza un error automáticamente si el status no es 2xx
      await apiRequest("PATCH", `/api/submissions/${editingId}`, {
        codigo: editCode,
      });
    },
    onSuccess: () => {
      toast({ title: "Código actualizado correctamente" });
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
    },
    onError: (error: Error) => {
      // Aquí mostramos el mensaje que viene del servidor (ej: "El código ya está en uso...")
      toast({
        title: "No se pudo actualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutación para BORRAR (Solo OCR)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/submissions/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Cuestionario eliminado correctamente" });
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
    },
    onError: () => {
      toast({
        title: "Error al eliminar",
        description:
          "Solo se pueden eliminar cuestionarios importados por OCR.",
        variant: "destructive",
      });
      setDeletingId(null);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleExport = async (format: "csv" | "xlsx") => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== "all") {
        params.set(key, String(value));
      }
    });
    params.set("format", format);
    window.open(`/api/submissions/export?${params.toString()}`, "_blank");
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm("");
    setPage(1);
  };

  const hasActiveFilters =
    Object.values(filters).some((v) => v !== undefined && v !== "") ||
    searchTerm;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cuestionarios</h1>
          <p className="text-muted-foreground">
            Gestiona y consulta todas las respuestas del proyecto
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
          >
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, nombre, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="secondary">
                Buscar
              </Button>
            </form>

            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filtros
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2">
                      Activos
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filtros Avanzados</SheetTitle>
                  <SheetDescription>
                    Filtra los cuestionarios por diferentes criterios
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estado</label>
                    <Select
                      value={filters.status || ""}
                      onValueChange={(v) =>
                        setFilters({
                          ...filters,
                          status: (v as any) || undefined,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="aprobado">Aprobado</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="rechazado">Rechazado</SelectItem>
                        <SelectItem value="enviado">Enviado</SelectItem>
                        <SelectItem value="borrador">Borrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fuente</label>
                    <Select
                      value={filters.source || ""}
                      onValueChange={(v) =>
                        setFilters({
                          ...filters,
                          source: (v as any) || undefined,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="web">Web</SelectItem>
                        <SelectItem value="ocr">OCR</SelectItem>
                        <SelectItem value="google_forms">
                          Google Forms
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Localidad</label>
                    <Input
                      placeholder="Filtrar por localidad"
                      value={filters.localidad || ""}
                      onChange={(e) =>
                        setFilters({ ...filters, localidad: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={clearFilters}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Limpiar
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setPage(1);
                        setIsFilterOpen(false);
                      }}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Aplicar
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data?.submissions && data.submissions.length > 0 ? (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Localidad
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Fuente
                      </TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Fecha
                      </TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-mono font-medium text-primary">
                          {submission.codigo ? (
                            <Badge variant="outline" className="font-normal">
                              {submission.codigo}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">
                              Sin asignar
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {submission.nombreApellidos || "Sin nombre"}
                            </p>
                            <p className="text-sm text-muted-foreground md:hidden">
                              {submission.localidad || "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {submission.localidad || "-"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="secondary">
                            {sourceLabels[submission.source] ||
                              submission.source}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[submission.status]}`}
                          >
                            {submission.status}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {new Date(submission.createdAt).toLocaleDateString(
                            "es-ES",
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-1">
                            {/* Botón Editar Código (Para todos) */}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Editar Código"
                              onClick={() => {
                                setEditingId(submission.id);
                                setEditCode(submission.codigo || "");
                              }}
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>

                            <Link href={`/submissions/${submission.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Ver detalle"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>

                            {/* Botón Borrar (SOLO OCR) */}
                            {submission.source === "ocr" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Eliminar (Solo OCR)"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeletingId(submission.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Página {page} de {data.pages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                    disabled={page >= data.pages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No hay cuestionarios que coincidan con los filtros
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIÁLOGO PARA EDITAR CÓDIGO */}
      <Dialog
        open={!!editingId}
        onOpenChange={(open) => !open && setEditingId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Código</DialogTitle>
            <DialogDescription>
              Introduce el código identificativo para este cuestionario.
              Formato: SV_JPXX_XXX
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                placeholder="Ej: SV_JP01_001"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value.toUpperCase())}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => updateCodeMutation.mutate()}
              disabled={updateCodeMutation.isPending}
            >
              {updateCodeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERTA DE CONFIRMACIÓN DE BORRADO */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente este cuestionario del
              sistema. Solo se pueden eliminar cuestionarios importados vía OCR.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
