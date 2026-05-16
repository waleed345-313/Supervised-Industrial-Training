import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { roleLabels } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Briefcase,
  ClipboardCheck,
  Bell,
  Settings,
  LogOut,
  GraduationCap,
  UserCheck,
  BarChart3,
  Upload,
  Send,
  Eye,
  Calendar,
  User,
  Award,
  RefreshCw,
} from 'lucide-react';

const menuItemsByRole: Record<UserRole, Array<{ title: string; url: string; icon: React.ElementType }>> = {
  admin: [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'User Management', url: '/admin/users', icon: Users },
    { title: 'My Profile', url: '/admin/profile', icon: User },
  ],
  manager_placements: [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Company Pool', url: '/placements/companies', icon: Building2 },
    { title: 'Replacement Management', url: '/placements/replacement', icon: RefreshCw },
    { title: 'Reports', url: '/placements/reports', icon: BarChart3 },
    { title: 'My Profile', url: '/placements/profile', icon: User },
  ],
  university_focal: [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Companies', url: '/focal/companies', icon: Building2 },
    { title: 'Supervisor Assignment', url: '/focal/assignments', icon: UserCheck },
    { title: 'Final Grading', url: '/focal/final-grading', icon: Calendar },
    { title: 'Documents', url: '/focal/documents', icon: FileText },
    { title: 'Announcements', url: '/focal/announcements', icon: Bell },
    { title: 'Communication', url: '/focal/communication', icon: Send },
    { title: 'My Profile', url: '/focal/profile', icon: User },
  ],
  academic_supervisor: [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'My Students', url: '/supervisor/students', icon: GraduationCap },
    { title: 'Progress Reports', url: '/supervisor/progress', icon: FileText },
    { title: 'Final Grading', url: '/supervisor/final-grading', icon: Calendar },
    { title: 'Feedback', url: '/supervisor/feedback', icon: Send },
    { title: 'Documents', url: '/supervisor/documents', icon: FileText },
    { title: 'Communication', url: '/supervisor/communication', icon: Send },
    { title: 'My Profile', url: '/supervisor/profile', icon: User },
  ],
  industrial_supervisor: [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Assigned Students', url: '/industry/students', icon: GraduationCap },
    { title: 'Monthly Evaluations', url: '/industry/evaluations', icon: ClipboardCheck },
    { title: 'Communication', url: '/industry/communication', icon: Send },
    { title: 'My Profile', url: '/industry/profile', icon: User },
  ],
  company_focal: [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Post Internships', url: '/company/internships', icon: Briefcase },
    { title: 'Assignments', url: '/company/assignments', icon: UserCheck },
    { title: 'Applications', url: '/company/applications', icon: FileText },
    { title: 'Feedback', url: '/company/feedback', icon: Send },
    { title: 'Documents', url: '/company/documents', icon: Upload },
    { title: 'Communication', url: '/company/communication', icon: Send },
    { title: 'My Profile', url: '/company/profile', icon: User },
  ],
  evaluation_panel: [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Student Reports', url: '/panel/reports', icon: FileText },
    { title: 'Evaluations', url: '/panel/evaluations', icon: ClipboardCheck },
    { title: 'Final Grading', url: '/panel/grades', icon: Calendar },
    { title: 'My Profile', url: '/panel/profile', icon: User },
  ],
  student: [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Browse Internships', url: '/student/internships', icon: Briefcase },
    { title: 'My Applications', url: '/student/applications', icon: FileText },
    { title: 'My Profile', url: '/student/profile', icon: User },
    { title: 'Documents', url: '/student/documents', icon: FileText },
    { title: 'Notifications', url: '/student/notifications', icon: Bell },
  ],
};

export function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  if (!user) return null;

  const menuItems = menuItemsByRole[user.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Sidebar side="left" className="border-l-0" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold">
            SIT
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground">SIT Portal</span>
              <span className="text-xs text-sidebar-foreground/70">Supervised Industrial Training</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <NavLink to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-sm">
              {user.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</span>
              <span className="truncate text-xs text-sidebar-foreground/70">{roleLabels[user.role]}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
