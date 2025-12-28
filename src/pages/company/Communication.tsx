import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { CommunicationHub } from '@/components/shared/CommunicationHub';

export default function CompanyCommunication() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Communication"
          description="Communicate with University Focal Person, Academic Supervisors, and Industrial Supervisors"
        />
        <CommunicationHub />
      </div>
    </DashboardLayout>
  );
}
