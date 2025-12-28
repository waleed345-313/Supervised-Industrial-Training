import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { CommunicationHub } from '@/components/shared/CommunicationHub';

export default function IndustryCommunication() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title="Communication"
          description="Communicate SIT-related issues with Academic Supervisors and Company Focal Persons"
        />
        <CommunicationHub />
      </div>
    </DashboardLayout>
  );
}
