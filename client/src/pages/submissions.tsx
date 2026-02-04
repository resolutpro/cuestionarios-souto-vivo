import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  X,
  SlidersHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { Submission, SubmissionFilter } from "@shared/schema";

const statusColors: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  enviado: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  aprobado: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rechazado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
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
  const limit = 10;

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

  const { data, isLoading } = useQuery<{ submissions: Submission[]; total: number; pages: number }>({
    queryKey: ["/api/submissions", { page, limit, search: searchTerm, ...filters }],
    queryFn: async () => {
      const res = await fetch(`/api/submissions?${buildQueryString()}`);
      if (!res.ok) throw new Error("Failed to fetch submissions");
      return res.json();
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

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== "") || searchTerm;

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
            data-testid="button-export-csv"
          >
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleExport("xlsx")}
            data-testid="button-export-xlsx"
          >
            <Download className="h-4 w-4 mr-2" />
            Excel
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
                  data-testid="input-search"
                  placeholder="Buscar por nombre, email, localidad..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="secondary" data-testid="button-search">
                Buscar
              </Button>
            </form>

            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" data-testid="button-open-filters">
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
                      onValueChange={(value) => setFilters({ ...filters, status: value as any || undefined })}
                    >
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="Todos los estados" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="borrador">Borrador</SelectItem>
                        <SelectItem value="enviado">Enviado</SelectItem>
                        <SelectItem value="aprobado">Aprobado</SelectItem>
                        <SelectItem value="rechazado">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fuente</label>
                    <Select
                      value={filters.source || ""}
                      onValueChange={(value) => setFilters({ ...filters, source: value as any || undefined })}
                    >
                      <SelectTrigger data-testid="select-source">
                        <SelectValue placeholder="Todas las fuentes" />
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
                      value={filters.genero || ""}
                      onValueChange={(value) => setFilters({ ...filters, genero: value as any || undefined })}
                    >
                      <SelectTrigger data-testid="select-genero">
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
                      value={filters.edad || ""}
                      onValueChange={(value) => setFilters({ ...filters, edad: value as any || undefined })}
                    >
                      <SelectTrigger data-testid="select-edad">
                        <SelectValue placeholder="Todas las edades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="menos_35">Menos de 35 años</SelectItem>
                        <SelectItem value="entre_35_50">Entre 35 y 50 años</SelectItem>
                        <SelectItem value="mas_50">Más de 50 años</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Grado de Interés</label>
                    <Select
                      value={filters.gradoInteres || ""}
                      onValueChange={(value) => setFilters({ ...filters, gradoInteres: value as any || undefined })}
                    >
                      <SelectTrigger data-testid="select-grado-interes">
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
                    <label className="text-sm font-medium">Superficie</label>
                    <Select
                      value={filters.superficieCategoria || ""}
                      onValueChange={(value) => setFilters({ ...filters, superficieCategoria: value as any || undefined })}
                    >
                      <SelectTrigger data-testid="select-superficie">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="menos_1ha">Menos de 1 ha</SelectItem>
                        <SelectItem value="entre_1_5ha">Entre 1 y 5 ha</SelectItem>
                        <SelectItem value="mas_5ha">Más de 5 ha</SelectItem>
                        <SelectItem value="otra">Otra</SelectItem>
                        <SelectItem value="no_se">No lo sé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Uso del Suelo</label>
                    <Select
                      value={filters.usoSuelo || ""}
                      onValueChange={(value) => setFilters({ ...filters, usoSuelo: value as any || undefined })}
                    >
                      <SelectTrigger data-testid="select-uso-suelo">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="cultivo_activo">Cultivo activo</SelectItem>
                        <SelectItem value="pasto">Pasto</SelectItem>
                        <SelectItem value="monte">Monte</SelectItem>
                        <SelectItem value="sin_uso">Sin uso / abandonado</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Relación con la Finca</label>
                    <Select
                      value={filters.relacionFinca || ""}
                      onValueChange={(value) => setFilters({ ...filters, relacionFinca: value as any || undefined })}
                    >
                      <SelectTrigger data-testid="select-relacion-finca">
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
                      value={filters.agricultorTituloPrincipal || ""}
                      onValueChange={(value) => setFilters({ ...filters, agricultorTituloPrincipal: value as any || undefined })}
                    >
                      <SelectTrigger data-testid="select-agricultor-principal">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="si">Sí</SelectItem>
                        <SelectItem value="no_complementario">No (complementario)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Acceso</label>
                    <Select
                      value={filters.acceso || ""}
                      onValueChange={(value) => setFilters({ ...filters, acceso: value as any || undefined })}
                    >
                      <SelectTrigger data-testid="select-acceso">
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
                      value={filters.agua || ""}
                      onValueChange={(value) => setFilters({ ...filters, agua: value as any || undefined })}
                    >
                      <SelectTrigger data-testid="select-agua">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="si">Sí</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="no_se">No lo sé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pendiente</label>
                    <Select
                      value={filters.pendiente || ""}
                      onValueChange={(value) => setFilters({ ...filters, pendiente: value as any || undefined })}
                    >
                      <SelectTrigger data-testid="select-pendiente">
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
                      value={filters.pedregosidad || ""}
                      onValueChange={(value) => setFilters({ ...filters, pedregosidad: value as any || undefined })}
                    >
                      <SelectTrigger data-testid="select-pedregosidad">
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
                    <label className="text-sm font-medium">Nivel de Actuación</label>
                    <Select
                      value={filters.nivelActuacion || ""}
                      onValueChange={(value) => setFilters({ ...filters, nivelActuacion: value as any || undefined })}
                    >
                      <SelectTrigger data-testid="select-nivel-actuacion">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="solo_diagnostico">Solo diagnóstico</SelectItem>
                        <SelectItem value="implantacion">Implantación</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={clearFilters}
                      data-testid="button-clear-filters"
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
                      data-testid="button-apply-filters"
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
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data?.submissions && data.submissions.length > 0 ? (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="hidden md:table-cell">Localidad</TableHead>
                      <TableHead className="hidden lg:table-cell">Fuente</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.submissions.map((submission) => (
                      <TableRow key={submission.id} data-testid={`row-submission-${submission.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{submission.nombreApellidos || "Sin nombre"}</p>
                            <p className="text-sm text-muted-foreground md:hidden">
                              {submission.localidad || "Sin localidad"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {submission.localidad || "-"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="outline">
                            {sourceLabels[submission.source] || submission.source}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[submission.status]}`}>
                            {submission.status}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {new Date(submission.createdAt).toLocaleDateString("es-ES")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/submissions/${submission.id}`}>
                            <Button variant="ghost" size="icon" data-testid={`button-view-${submission.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, data.total)} de {data.total} resultados
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Página {page} de {data.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                    disabled={page >= data.pages}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium">No hay cuestionarios</h3>
              <p className="text-muted-foreground">
                {hasActiveFilters
                  ? "No se encontraron resultados con los filtros aplicados"
                  : "Los cuestionarios enviados aparecerán aquí"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
