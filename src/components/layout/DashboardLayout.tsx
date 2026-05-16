import { useEffect } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { io, type Socket } from 'socket.io-client';
import { API_BASE } from '@/lib/api';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isAuthenticated, initialSessionResolved, refreshSessionUser } = useAuth();

  useEffect(() => {
    if (user?.role !== 'student') return;
    const token = localStorage.getItem('sit_portal_token');
    if (!token) return;
    const socket: Socket = io(API_BASE, { auth: { token } });
    const onStudent = () => void refreshSessionUser();
    socket.on('student:update', onStudent);
    return () => {
      socket.off('student:update', onStudent);
      socket.disconnect();
    };
  }, [user?.role, refreshSessionUser]);

  if (!initialSessionResolved) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading session" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <div className="h-4 w-px bg-border" />
              <h1 className="text-sm font-medium">Supervised Industrial Training Portal</h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            <div className="animate-fade-in">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
