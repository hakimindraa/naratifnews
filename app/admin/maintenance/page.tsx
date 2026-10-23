import { getMaintenanceMetricsAction, getPurgeCandidateItemsAction } from './actions';
import MaintenanceClientView from './MaintenanceClientView';

export const instant = false;

export default async function MaintenancePage() {
  const [initialMetrics, initialCandidates] = await Promise.all([
    getMaintenanceMetricsAction(),
    getPurgeCandidateItemsAction(),
  ]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <MaintenanceClientView
        initialMetrics={initialMetrics}
        initialCandidates={initialCandidates}
      />
    </div>
  );
}
