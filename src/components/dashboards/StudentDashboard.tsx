import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { mockApplications, mockInternships, mockNotifications } from '@/data/mockData';
import { Briefcase, FileText, Bell, GraduationCap, ArrowRight, Building2, MapPin, Clock } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Student } from '@/types';
import { Link } from 'react-router-dom';

export function StudentDashboard() {
  const { user } = useAuth();
  const student = user as Student;
  
  const myApplications = mockApplications.filter(a => a.studentId === student.id);
  const unreadNotifications = mockNotifications.filter(n => !n.read).length;
  const recentInternships = mockInternships.filter(i => i.status === 'open').slice(0, 3);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${student.name.split(' ')[0]}`}
        description="Track your internship applications and progress"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Applications"
          value={`${student.applicationCount}/${student.maxApplications}`}
          description="Applications submitted"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          title="CGPA"
          value={student.cgpa.toFixed(2)}
          description="Current standing"
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <StatCard
          title="Status"
          value={student.currentStatus.replace('_', ' ')}
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
            {myApplications.length > 0 ? (
              <div className="space-y-4">
                {myApplications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">{app.internshipTitle}</p>
                      <p className="text-sm text-muted-foreground">{app.companyName}</p>
                    </div>
                    <StatusBadge status={app.status} />
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
              {mockNotifications.slice(0, 3).map((notification) => (
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
                  <p className="text-xs text-muted-foreground mt-2">{notification.date}</p>
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
                    {internship.company.name[0]}
                  </div>
                  <StatusBadge status={internship.status} />
                </div>
                <h3 className="font-semibold mb-1">{internship.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{internship.company.name}</p>
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
