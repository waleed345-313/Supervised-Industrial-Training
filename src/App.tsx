import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Student Pages
import StudentInternships from "./pages/student/Internships";
import StudentApplications from "./pages/student/Applications";
import StudentProfile from "./pages/student/Profile";
import StudentNotifications from "./pages/student/Notifications";
import StudentDocuments from "./pages/student/Documents";

// Admin Pages
import AdminUsers from "./pages/admin/Users";
import AdminProfile from "./pages/admin/Profile";

// Placements Pages
import PlacementsCompanies from "./pages/placements/Companies";
import PlacementsReports from "./pages/placements/Reports";
import ManagerPlacementsProfile from "./pages/placements/Profile";

// University Focal Pages
import FocalCompanies from "./pages/focal/Companies";
import FocalAssignments from "./pages/focal/Assignments";
import FocalAnnouncements from "./pages/focal/Announcements";
import FocalCommunication from "./pages/focal/Communication";
import UniversityFocalProfile from "./pages/focal/Profile";

// Academic Supervisor Pages
import SupervisorStudents from "./pages/supervisor/Students";
import SupervisorProgress from "./pages/supervisor/Progress";
import SupervisorFeedback from "./pages/supervisor/Feedback";
import SupervisorCommunication from "./pages/supervisor/Communication";
import SupervisorFinalGrading from "./pages/supervisor/FinalGrading";
import AcademicSupervisorProfile from "./pages/supervisor/Profile";

// Industrial Supervisor Pages
import IndustryStudents from "./pages/industry/Students";
import IndustryEvaluations from "./pages/industry/Evaluations";
import IndustryCommunication from "./pages/industry/Communication";
import IndustrialSupervisorProfile from "./pages/industry/Profile";

// Company Focal Pages
import CompanyInternships from "./pages/company/Internships";
import CompanyApplications from "./pages/company/Applications";
import CompanyDocuments from "./pages/company/Documents";
import CompanyCommunication from "./pages/company/Communication";
import CompanyFeedback from "./pages/company/Feedback";
import CompanyFocalProfile from "./pages/company/Profile";

// Evaluation Panel Pages
import PanelEvaluations from "./pages/panel/Evaluations";
import PanelReports from "./pages/panel/Reports";
import PanelGrades from "./pages/panel/Grades";
import EvaluationPanelProfile from "./pages/panel/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Student Routes */}
            <Route path="/student/internships" element={<StudentInternships />} />
            <Route path="/student/applications" element={<StudentApplications />} />
            <Route path="/student/profile" element={<StudentProfile />} />
            <Route path="/student/notifications" element={<StudentNotifications />} />
            <Route path="/student/documents" element={<StudentDocuments />} />
            
            {/* Admin Routes */}
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
            
            {/* Manager Placements Routes */}
            <Route path="/placements/companies" element={<PlacementsCompanies />} />
            <Route path="/placements/reports" element={<PlacementsReports />} />
            <Route path="/placements/profile" element={<ManagerPlacementsProfile />} />
            
            {/* University Focal Routes */}
            <Route path="/focal/companies" element={<FocalCompanies />} />
            <Route path="/focal/assignments" element={<FocalAssignments />} />
            <Route path="/focal/announcements" element={<FocalAnnouncements />} />
            <Route path="/focal/communication" element={<FocalCommunication />} />
            <Route path="/focal/profile" element={<UniversityFocalProfile />} />
            
            {/* Academic Supervisor Routes */}
            <Route path="/supervisor/students" element={<SupervisorStudents />} />
            <Route path="/supervisor/progress" element={<SupervisorProgress />} />
            <Route path="/supervisor/final-grading" element={<SupervisorFinalGrading />} />
            <Route path="/supervisor/feedback" element={<SupervisorFeedback />} />
            <Route path="/supervisor/communication" element={<SupervisorCommunication />} />
            <Route path="/supervisor/profile" element={<AcademicSupervisorProfile />} />
            
            {/* Industrial Supervisor Routes */}
            <Route path="/industry/students" element={<IndustryStudents />} />
            <Route path="/industry/evaluations" element={<IndustryEvaluations />} />
            <Route path="/industry/communication" element={<IndustryCommunication />} />
            <Route path="/industry/profile" element={<IndustrialSupervisorProfile />} />
            
            {/* Company Focal Routes */}
            <Route path="/company/internships" element={<CompanyInternships />} />
            <Route path="/company/applications" element={<CompanyApplications />} />
            <Route path="/company/documents" element={<CompanyDocuments />} />
            <Route path="/company/feedback" element={<CompanyFeedback />} />
            <Route path="/company/communication" element={<CompanyCommunication />} />
            <Route path="/company/profile" element={<CompanyFocalProfile />} />
            
            {/* Evaluation Panel Routes */}
            <Route path="/panel/evaluations" element={<PanelEvaluations />} />
            <Route path="/panel/reports" element={<PanelReports />} />
            <Route path="/panel/grades" element={<PanelGrades />} />
            <Route path="/panel/profile" element={<EvaluationPanelProfile />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
