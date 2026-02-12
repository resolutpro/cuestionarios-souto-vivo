import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  Pencil,
  X,
  SlidersHorizontal,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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
  aprobado: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rechazado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  pendiente: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const sourceLabels: Record<string, string> = {
  web: "Web",
  ocr: "OCR",
  google_forms: "Google Forms",
};

export default function SubmissionsPage() {
  // Configuración para lista continua
  const page = 1;
  const limit = 2000; // Cargamos un número alto para que se vea todo en una sola página larga

  const [filters, setFilters] = useState<SubmissionFilter & { jornada?: string }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Estados de ordenación
  const [sortConfig, setSortConfig] = useState<{
    key: "fecha" | "codigo";
    direction: "asc" | "desc";
  }>({ key: "fecha", direction: "desc" });

  // Estados para acciones
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Función para ordenar
  const handleSort = (key: "fecha" | "codigo") => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    params.set("sortBy", sortConfig.key);
    params.set("sortOrder", sortConfig.direction);

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
      { page, limit, search: searchTerm, ...filters, ...sortConfig },
    ],
    queryFn: async () => {
      const res = await fetch(`/api/submissions?${buildQueryString()}`);
      if (!res.ok) throw new Error("Failed to fetch submissions");
      return res.json();
    },
  });

  const updateCodeMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
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
      toast({
        title: "No se pudo actualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
        description: "Solo se pueden eliminar cuestionarios importados por OCR.",
        variant: "destructive",
      });
      setDeletingId(null);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  const hasActiveFilters =
    Object.values(filters).some((v) => v !== undefined && v !== "") ||
    searchTerm;

  return (
    <div className="space-y-6 pb-10">
      {/* HEMOS QUITADO 'h-[calc(100vh-6rem)]' y 'flex flex-col' 
         para que la página crezca naturalmente con el contenido.
      */}

      {/* HEADER SUPERIOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cuestionarios</h1>
          <p className="text-muted-foreground">
            Consulta total de registros ({data?.total || 0})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
        </div>
      </div>

      {/* TARJETA PRINCIPAL */}
      <Card className="shadow-sm border">
        {/* BARRA DE HERRAMIENTAS */}
        <CardHeader className="pb-4 border-b bg-card">
          <div className="flex flex-col xl:flex-row gap-4 justify-between">
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

            <div className="flex gap-2 items-center">
              <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className={hasActiveFilters ? "border-primary text-primary" : ""}>
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filtros / Jornada
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-2 bg-primary/10">
                        •
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>Filtros Avanzados</SheetTitle>
                    <SheetDescription>
                      Refina la búsqueda por jornada o características
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-4 mt-6 pb-20">

                    {/* FILTRO JORNADA */}
                    <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Filter className="h-3 w-3" /> Filtrar por Jornada
                      </h4>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Número de Jornada (XX)</label>
                        <div className="flex gap-2 items-center">
                           <span className="text-sm font-mono text-muted-foreground">SV_JP</span>
                           <Input 
                              placeholder="Ej: 01" 
                              className="w-20 font-mono"
                              maxLength={2}
                              value={filters.jornada || ""}
                              onChange={(e) => setFilters({...filters, jornada: e.target.value})}
                           />
                           <span className="text-sm font-mono text-muted-foreground">_XXX</span>
                        </div>
                      </div>
                    </div>

                    {/* RESTO DE FILTROS */}
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

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Estado</label>
                      <Select
                        value={filters.status || "all"}
                        onValueChange={(v) =>
                          setFilters({
                            ...filters,
                            status: v === "all" ? undefined : (v as any),
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
                        value={filters.source || "all"}
                        onValueChange={(v) =>
                          setFilters({
                            ...filters,
                            source: v === "all" ? undefined : (v as any),
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
                          <SelectItem value="google_forms">Google Forms</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Género</label>
                      <Select
                        value={filters.genero || "all"}
                        onValueChange={(v) =>
                          setFilters({
                            ...filters,
                            genero: v === "all" ? undefined : (v as any),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="mujer">Mujer</SelectItem>
                          <SelectItem value="hombre">Hombre</SelectItem>
                          <SelectItem value="otros">Otros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Edad</label>
                      <Select
                        value={filters.edad || "all"}
                        onValueChange={(v) =>
                          setFilters({
                            ...filters,
                            edad: v === "all" ? undefined : (v as any),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="menos_35">Menos de 35</SelectItem>
                          <SelectItem value="entre_35_50">Entre 35 y 50</SelectItem>
                          <SelectItem value="mas_50">Más de 50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Relación con la Finca</label>
                      <Select
                        value={filters.relacionFinca || "all"}
                        onValueChange={(v) =>
                          setFilters({
                            ...filters,
                            relacionFinca: v === "all" ? undefined : (v as any),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="propietario">Propietario</SelectItem>
                          <SelectItem value="arrendatario">Arrendatario</SelectItem>
                          <SelectItem value="gestor">Gestor</SelectItem>
                          <SelectItem value="otra">Otra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Agricultor Título Principal</label>
                      <Select
                        value={filters.agricultorTituloPrincipal || "all"}
                        onValueChange={(v) =>
                          setFilters({
                            ...filters,
                            agricultorTituloPrincipal: v === "all" ? undefined : (v as any),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="si">Sí</SelectItem>
                          <SelectItem value="no_complementario">No (Complementario)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Superficie</label>
                      <Select
                        value={filters.superficieCategoria || "all"}
                        onValueChange={(v) =>
                          setFilters({
                            ...filters,
                            superficieCategoria: v === "all" ? undefined : (v as any),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="menos_1ha">Menos de 1 ha</SelectItem>
                          <SelectItem value="entre_1_5ha">Entre 1 y 5 ha</SelectItem>
                          <SelectItem value="mas_5ha">Más de 5 ha</SelectItem>
                          <SelectItem value="otra">Otra</SelectItem>
                          <SelectItem value="no_se">No sabe / No contesta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Uso del Suelo</label>
                      <Select
                        value={filters.usoSuelo || "all"}
                        onValueChange={(v) =>
                          setFilters({
                            ...filters,
                            usoSuelo: v === "all" ? undefined : (v as any),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="cultivo_activo">Cultivo Activo</SelectItem>
                          <SelectItem value="pasto">Pasto</SelectItem>
                          <SelectItem value="monte">Monte</SelectItem>
                          <SelectItem value="sin_uso">Sin Uso</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Acceso</label>
                      <Select
                        value={filters.acceso || "all"}
                        onValueChange={(v) =>
                          setFilters({
                            ...filters,
                            acceso: v === "all" ? undefined : (v as any),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="bueno">Bueno</SelectItem>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="malo">Malo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Agua</label>
                      <Select
                        value={filters.agua || "all"}
                        onValueChange={(v) =>
                          setFilters({
                            ...filters,
                            agua: v === "all" ? undefined : (v as any),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="si">Sí</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="no_se">No sabe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pendiente</label>
                      <Select
                        value={filters.pendiente || "all"}
                        onValueChange={(v) =>
                          setFilters({
                            ...filters,
                            pendiente: v === "all" ? undefined : (v as any),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="baja">Baja</SelectItem>
                          <SelectItem value="media">Media</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pedregosidad</label>
                      <Select
                        value={filters.pedregosidad || "all"}
                        onValueChange={(v) =>
                          setFilters({
                            ...filters,
                            pedregosidad: v === "all" ? undefined : (v as any),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="baja">Baja</SelectItem>
                          <SelectItem value="media">Media</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Grado de Interés</label>
                      <Select
                        value={filters.gradoInteres || "all"}
                        onValueChange={(v) =>
                          setFilters({
                            ...filters,
                            gradoInteres: v === "all" ? undefined : (v as any),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="alto">Alto</SelectItem>
                          <SelectItem value="medio">Medio</SelectItem>
                          <SelectItem value="bajo">Bajo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nivel de Actuación</label>
                      <Select
                        value={filters.nivelActuacion || "all"}
                        onValueChange={(v) =>
                          setFilters({
                            ...filters,
                            nivelActuacion: v === "all" ? undefined : (v as any),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="solo_diagnostico">Solo Diagnóstico</SelectItem>
                          <SelectItem value="implantacion">Implantación</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" className="flex-1" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-2" /> Limpiar
                      </Button>
                      <Button className="flex-1" onClick={() => setIsFilterOpen(false)}>
                        <Filter className="h-4 w-4 mr-2" /> Aplicar
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </CardHeader>

        {/* CAMBIO: Quitamos 'h-full overflow-y-auto' y dejamos un div simple.
           Ahora la tabla empuja el contenido y usará el scroll del navegador.
        */}
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data?.submissions && data.submissions.length > 0 ? (

            <div>
              <Table>
                {/* La cabecera sigue siendo sticky (top-0) para que no la pierdas al bajar.
                   Asegúrate de que el fondo (bg-card) es sólido para que las filas no se vean por debajo.
                */}
                <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
                  <TableRow className="hover:bg-transparent border-b">
                    {/* CÓDIGO (Ordenable) */}
                    <TableHead
                      className="cursor-pointer hover:text-primary transition-colors w-[150px] bg-card"
                      onClick={() => handleSort("codigo")}
                    >
                      <div className="flex items-center gap-1">
                        Código
                        {sortConfig.key === "codigo" ? (
                          sortConfig.direction === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                        )}
                      </div>
                    </TableHead>

                    <TableHead className="w-[250px] bg-card">Nombre</TableHead>
                    <TableHead className="hidden md:table-cell bg-card">Localidad</TableHead>
                    <TableHead className="hidden lg:table-cell w-[100px] bg-card">Fuente</TableHead>
                    <TableHead className="w-[100px] bg-card">Estado</TableHead>

                    {/* FECHA (Ordenable) */}
                    <TableHead
                      className="hidden sm:table-cell cursor-pointer hover:text-primary transition-colors w-[120px] bg-card"
                      onClick={() => handleSort("fecha")}
                    >
                      <div className="flex items-center gap-1">
                        Fecha
                        {sortConfig.key === "fecha" ? (
                          sortConfig.direction === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-right w-[120px] bg-card">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-mono font-medium text-primary">
                        {submission.codigo ? (
                          <Badge variant="outline" className="font-normal bg-primary/5 hover:bg-primary/10">
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
                          <p className="font-medium truncate max-w-[200px]">
                            {submission.nombreApellidos || "Sin nombre"}
                          </p>
                          <p className="text-xs text-muted-foreground md:hidden">
                            {submission.localidad || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {submission.localidad || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="secondary" className="font-normal text-xs">
                          {sourceLabels[submission.source] || submission.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide ${statusColors[submission.status]}`}
                        >
                          {submission.status}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {new Date(submission.createdAt).toLocaleDateString("es-ES")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Editar Código"
                            onClick={() => {
                              setEditingId(submission.id);
                              setEditCode(submission.codigo || "");
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>

                          <Link href={`/submissions/${submission.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver detalle">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>

                          {submission.source === "ocr" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar (Solo OCR)"
                              onClick={() => setDeletingId(submission.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
               <div className="bg-muted/30 p-4 rounded-full mb-4">
                 <Search className="h-8 w-8 text-muted-foreground" />
               </div>
              <h3 className="text-lg font-medium">No se encontraron cuestionarios</h3>
              <p className="text-muted-foreground mt-1 max-w-sm">
                No hay resultados para los filtros aplicados.
              </p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>

        {/* PIE INFORMATIVO */}
        <div className="p-2 border-t text-xs text-center text-muted-foreground bg-muted/20">
             Mostrando {data?.submissions?.length || 0} registros
        </div>
      </Card>

      {/* DIÁLOGO PARA EDITAR CÓDIGO */}
      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Código</DialogTitle>
            <DialogDescription>
              Introduce el código identificativo para este cuestionario. Formato: SV_JPXX_XXX
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
            <Button onClick={() => updateCodeMutation.mutate()} disabled={updateCodeMutation.isPending}>
              {updateCodeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERTA DE CONFIRMACIÓN DE BORRADO */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente este cuestionario del sistema. Solo se pueden eliminar cuestionarios importados vía OCR.
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