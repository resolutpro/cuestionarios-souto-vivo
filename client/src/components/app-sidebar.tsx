import { Link, useLocation } from "wouter";
import { 
  Leaf, 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  LogOut 
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const menuItems = [
  {
    title: "Panel de Control",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Cuestionarios",
    url: "/submissions",
    icon: FileText,
  },
  {
    title: "Nuevo Cuestionario",
    url: "/submissions/new",
    icon: PlusCircle,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
            <Leaf className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-sidebar-foreground">Souto Vivo</h2>
            <p className="text-xs text-muted-foreground">Gestión de Cuestionarios</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/" && location.startsWith(item.url) && item.url !== "/submissions/new") ||
                  (item.url === "/submissions" && location.startsWith("/submissions/") && location !== "/submissions/new");
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`link-${item.url.replace(/\//g, "-").slice(1) || "home"}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-2">
          <div className="flex items-center justify-between p-2 rounded-md bg-sidebar-accent/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user?.username?.charAt(0).toUpperCase() || "A"}
                </span>
              </div>
              <span className="text-sm font-medium">{user?.username || "Admin"}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
