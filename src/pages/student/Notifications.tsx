import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRealtimeStudentNotifications } from '@/hooks/use-realtime-data';
import { markNotificationAsRead } from '@/lib/api';
import { Bell, Check, Info, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  date: string;
  read: boolean;
}

export default function StudentNotifications() {
  const { data: notificationsData, loading, error, refresh } = useRealtimeStudentNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Sync local state with real-time data
  useEffect(() => {
    if (notificationsData) {
      setNotifications(notificationsData);
    }
  }, [notificationsData]);

  const markAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      // Still update UI even if API fails
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Info className="h-5 w-5 text-info" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Notifications"
          description="Stay updated with your internship activities"
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
                <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
              {unreadCount > 0 && (
                <Button variant="outline" onClick={markAllAsRead}>
                  <Check className="mr-2 h-4 w-4" />
                  Mark all as read
                </Button>
              )}
            </div>
          }
        />

        {/* Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-sm text-muted-foreground">Unread notifications</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle>All Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="py-8 text-center">
                <p className="text-destructive">Failed to load notifications</p>
                <Button variant="outline" size="sm" onClick={refresh} className="mt-2">
                  Retry
                </Button>
              </div>
            )}

            {!error && (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex gap-4 rounded-lg border p-4 transition-colors",
                    !notification.read && "bg-primary/5 border-primary/20"
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {notification.date}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notification.read && (
                          <Badge variant="secondary" className="text-xs">New</Badge>
                        )}
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {notifications.length === 0 && (
                <div className="py-12 text-center">
                  <Bell className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No notifications</h3>
                  <p className="text-muted-foreground">You're all caught up!</p>
                </div>
              )}
            </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
