import { useQuery } from "@tanstack/react-query";
import { FileText, Users, CheckCircle, Clock, TrendingUp, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Submission } from "@shared/schema";

interface StatsData {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  recentLocalities: string[];
}

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  isLoading 
}: { 
  title: string; 
  value: string | number; 
  description?: string; 
  icon: typeof FileText;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<StatsData>({
    queryKey: ["/api/submissions/stats"],
  });

  const { data: recentSubmissions, isLoading: isLoadingRecent } = useQuery<Submission[]>({
    queryKey: ["/api/submissions/recent"],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel de Control</h1>
        <p className="text-muted-foreground">
          Resumen del estado de los cuestionarios del proyecto Souto Vivo
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Cuestionarios"
          value={stats?.total ?? 0}
          description="Registros en el sistema"
          icon={FileText}
          isLoading={isLoading}
        />
        <StatCard
          title="Enviados"
          value={stats?.byStatus?.enviado ?? 0}
          description="Pendientes de revisión"
          icon={Clock}
          isLoading={isLoading}
        />
        <StatCard
          title="Aprobados"
          value={stats?.byStatus?.aprobado ?? 0}
          description="Validados correctamente"
          icon={CheckCircle}
          isLoading={isLoading}
        />
        <StatCard
          title="Vía Web"
          value={stats?.bySource?.web ?? 0}
          description="Formularios completados online"
          icon={TrendingUp}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Cuestionarios Recientes
            </CardTitle>
            <CardDescription>Últimas respuestas recibidas</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRecent ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentSubmissions && recentSubmissions.length > 0 ? (
              <div className="space-y-3">
                {recentSubmissions.slice(0, 5).map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    data-testid={`submission-recent-${submission.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {submission.nombreApellidos || "Sin nombre"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {submission.localidad || "Sin localidad"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        submission.status === "aprobado"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : submission.status === "enviado"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : submission.status === "rechazado"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                      }`}>
                        {submission.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay cuestionarios registrados</p>
                <p className="text-sm">Los nuevos registros aparecerán aquí</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Localidades Activas
            </CardTitle>
            <CardDescription>Municipios con participación</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : stats?.recentLocalities && stats.recentLocalities.length > 0 ? (
              <div className="space-y-2">
                {stats.recentLocalities.map((locality, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                  >
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm">{locality}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay localidades registradas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
