import { useState, useEffect, useCallback } from 'react';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStudentNotifications, markNotificationAsRead } from '@/lib/api';
import { formatDistanceToNow } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useSocket } from '@/hooks/use-socket';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  date: string;
  read: boolean;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const socket = useSocket();

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getStudentNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time updates via socket
  useEffect(() => {
    if (!socket) return;

    const handleNotificationUpdate = () => {
      fetchNotifications();
    };

    socket.on('student:update', handleNotificationUpdate);
    socket.on('notification:new', handleNotificationUpdate);

    return () => {
      socket.off('student:update', handleNotificationUpdate);
      socket.off('notification:new', handleNotificationUpdate);
    };
  }, [socket, fetchNotifications]);

  // Poll every 30 seconds as fallback
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(unreadNotifications.map(n => markNotificationAsRead(n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast({ title: 'All notifications marked as read' });
    } catch (err) {
      toast({ title: 'Failed to mark all as read', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'warning':
        return 'border-l-4 border-yellow-500 bg-yellow-50/50';
      case 'error':
        return 'border-l-4 border-red-500 bg-red-50/50';
      case 'success':
        return 'border-l-4 border-green-500 bg-green-50/50';
      default:
        return 'border-l-4 border-blue-500 bg-blue-50/50';
    }
  };

  return (
    <>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(true)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-red-500 text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Ghost Screen Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute right-4 top-16 w-full max-w-md max-h-[80vh] bg-background rounded-lg shadow-2xl border animate-in slide-in-from-top-2 duration-200 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold text-lg">Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  {unreadCount} unread
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    disabled={loading}
                    className="text-xs"
                  >
                    <CheckCheck className="h-4 w-4 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg transition-colors ${
                      notification.read ? 'bg-muted/50' : getTypeStyles(notification.type)
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {notification.title}
                        </p>
                        <p className={`text-sm mt-1 ${notification.read ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.date))}
                        </p>
                      </div>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
