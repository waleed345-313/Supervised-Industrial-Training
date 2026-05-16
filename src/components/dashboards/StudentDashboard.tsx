import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, FileText, Bell, GraduationCap, ArrowRight, MapPin, Clock } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Student } from '@/types';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getReplacementEligibilityMe, getStudentApplications, getInternships, getStudentNotifications } from '@/lib/api';
import { formatDistanceToNow } from '@/lib/utils';
import { ReplacementStudentCallout } from '@/components/shared/ReplacementStudentCallout';
import { useSocket } from '@/hooks/use-socket';

interface Application {
  id: string;
  studentId: string;
  studentName: string;
  internshipId: string;
  internshipTitle: string;
  companyName: string;
  companyId: string;
  status: string;
  appliedDate: string;
  remarks?: string;
  isReplacement?: boolean;
}

interface Internship {
  id: string;
  title: string;
  company: { name: string } | string;
  location: string;
  duration: string;
  status: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  date: string;
  read: boolean;
}

export function StudentDashboard() {
  const { user } = useAuth();
  const student = user as Student;
  const socket = useSocket();

  const [applications, setApplications] = useState<Application[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [replacementEligible, setReplacementEligible] = useState<boolean | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(true);

  // Login/API user may omit fields until a Student profile is linked — avoid render crashes
  const applicationCount = applications.length;
  const maxApplications = student.maxApplications ?? 2;
  const cgpaNum = typeof student.cgpa === 'number' && !Number.isNaN(student.cgpa) ? student.cgpa : null;
  const statusLabel = (applicationCount > 0 ? 'applied' : student.currentStatus ?? 'not_applied').replace(/_/g, ' ');
  const firstName = (student.name?.trim() || 'Student').split(/\s+/)[0];

  const unreadNotifications = notifications.filter(n => !n.read).length;
  const recentInternships = internships.filter(i => i.status === 'open').slice(0, 3);
  const recentNotifications = notifications.slice(0, 3);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [apps, internList, notifs] = await Promise.all([
          getStudentApplications(),
          getInternships({ openOnly: true }),
          getStudentNotifications()
        ]);
        setApplications(apps);
        setInternships(internList.slice(0, 3));
        setNotifications(notifs);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const loadEligibility = async () => {
      try {
        setEligibilityLoading(true);
        const r = await getReplacementEligibilityMe();
        setReplacementEligible(Boolean(r?.eligible));
      } catch {
        setReplacementEligible(null);
      } finally {
        setEligibilityLoading(false);
      }
    };
    loadEligibility();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onStudent = (payload: { type?: string }) => {
      if (payload?.type === 'application') {
        void getStudentApplications()
          .then(setApplications)
          .catch(() => {});
        void getReplacementEligibilityMe()
          .then((r) => setReplacementEligible(Boolean(r?.eligible)))
          .catch(() => setReplacementEligible(null));
      }
    };
    socket.on('student:update', onStudent);
    return () => {
      socket.off('student:update', onStudent);
    };
  }, [socket]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Track your internship applications and progress"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Applications"
          value={`${applicationCount}/${maxApplications}`}
          description="Applications submitted"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          title="CGPA"
          value={cgpaNum !== null ? cgpaNum.toFixed(2) : '—'}
          description="Current standing"
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <StatCard
          title="Status"
          value={statusLabel}
          description="Application status"
          icon={<Briefcase className="h-5 w-5" />}
        />
        <StatCard
          title="Notifications"
          value={unreadNotifications}
          description="Unread messages"
          icon={<Bell className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Applications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                My Applications
              </CardTitle>
              <CardDescription>Track your application status</CardDescription>
            </div>
            <Link to="/student/applications">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <ReplacementStudentCallout eligible={replacementEligible} loading={loading || eligibilityLoading} />
            {applications.length > 0 ? (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between gap-3 rounded-lg border p-4">
                    <div className="min-w-0">
                      <p className="font-medium">{app.internshipTitle}</p>
                      <p className="text-sm text-muted-foreground">{app.companyName}</p>
                      {app.isReplacement && (
                        <p className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-200">Replacement application</p>
                      )}
                    </div>
                    <StatusBadge status={app.status} isReplacement={app.isReplacement} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No applications yet</p>
                <Link to="/student/internships">
                  <Button className="mt-4">Browse Internships</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Recent updates and alerts</CardDescription>
            </div>
            <Link to="/student/notifications">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-lg border p-4 ${!notification.read ? 'bg-primary/5 border-primary/20' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{notification.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                    </div>
                    {!notification.read && (
                      <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(notification.date))}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Internships */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Latest Internship Opportunities
            </CardTitle>
            <CardDescription>New opportunities matching your profile</CardDescription>
          </div>
          <Link to="/student/internships">
            <Button variant="ghost" size="sm">
              Browse All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentInternships.map((internship) => (
              <div key={internship.id} className="rounded-lg border p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                    {typeof internship.company === 'object' && internship.company?.name 
                      ? internship.company.name[0] 
                      : 'I'}
                  </div>
                  <StatusBadge status={internship.status} />
                </div>
                <h3 className="font-semibold mb-1">{internship.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {typeof internship.company === 'object' && internship.company?.name 
                    ? internship.company.name 
                    : typeof internship.company === 'string' 
                      ? internship.company 
                      : 'Unknown Company'}
                </p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{internship.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{internship.duration}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end">
                  <Button size="sm">Apply</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
