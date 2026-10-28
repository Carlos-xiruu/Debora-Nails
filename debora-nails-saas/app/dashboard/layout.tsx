import { Metadata } from 'next';
import DashboardClientLayout from './ClientLayout';

// Sobrescrevemos o manifesto da Landing Page apenas para a rota /dashboard
export const metadata: Metadata = {
  title: 'Painel Admin | Debora Nails',
  manifest: '/manifest-dashboard.json', 
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}