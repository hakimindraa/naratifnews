import { Metadata } from 'next';
import { getInstaboxDashboardData } from './actions';
import InstaboxClientView from './InstaboxClientView';

export const metadata: Metadata = {
  title: 'VPS Instabox & Hermes Hub | Admin Ada Fakta',
  description: 'Panel kontrol dan pemantau otomatis keep-alive Instabox VPS untuk layanan Hermes.',
};

export const instant = false;

export default async function InstaboxAdminPage() {
  const data = await getInstaboxDashboardData();

  return <InstaboxClientView initialData={data} />;
}

