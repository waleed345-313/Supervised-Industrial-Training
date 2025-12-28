import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { AdminDashboard } from '@/components/dashboards/AdminDashboard';
import { ManagerPlacementsDashboard } from '@/components/dashboards/ManagerPlacementsDashboard';
import { UniversityFocalDashboard } from '@/components/dashboards/UniversityFocalDashboard';
import { AcademicSupervisorDashboard } from '@/components/dashboards/AcademicSupervisorDashboard';
import { IndustrialSupervisorDashboard } from '@/components/dashboards/IndustrialSupervisorDashboard';
import { CompanyFocalDashboard } from '@/components/dashboards/CompanyFocalDashboard';
import { EvaluationPanelDashboard } from '@/components/dashboards/EvaluationPanelDashboard';
import { StudentDashboard } from '@/components/dashboards/StudentDashboard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const renderDashboard = () => {
    switch (user.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'manager_placements':
        return <ManagerPlacementsDashboard />;
      case 'university_focal':
        return <UniversityFocalDashboard />;
      case 'academic_supervisor':
        return <AcademicSupervisorDashboard />;
      case 'industrial_supervisor':
        return <IndustrialSupervisorDashboard />;
      case 'company_focal':
        return <CompanyFocalDashboard />;
      case 'evaluation_panel':
        return <EvaluationPanelDashboard />;
      case 'student':
        return <StudentDashboard />;
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg font-medium">Unknown user role</p>
              <p className="text-muted-foreground">Please contact administrator</p>
            </div>
          </div>
        );
    }
  };

  return <DashboardLayout>{renderDashboard()}</DashboardLayout>;
}
