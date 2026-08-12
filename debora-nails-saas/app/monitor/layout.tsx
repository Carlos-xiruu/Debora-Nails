import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Monitor VIP | Debora Nails',
  manifest: '/manifest-monitor.json', // AQUI ELE SOBRESCREVE E PUXA O APP DA TV!
};

export default function MonitorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}