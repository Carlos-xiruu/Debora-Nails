'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  CalendarDays, 
  LayoutDashboard, 
  Users, 
  CircleDollarSign, 
  Settings,
  BellRing,
  LogOut,
  Menu,
  Sparkles,
  BarChart3,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Controle de Segurança
  const [autorizado, setAutorizado] = useState(false);
  const [carregandoAuth, setCarregandoAuth] = useState(true);

  // E-mail da Dona (Substitua se precisar)
  const EMAIL_ADMIN = 'debora199917silva@gmail.com';

  useEffect(() => {
    const checarAutenticacao = async () => {
      setCarregandoAuth(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
      } else if (session.user.email !== EMAIL_ADMIN) {
        // Se alguém logar mas não for a Débora, joga pro site principal
        router.push('/');
      } else {
        setAutorizado(true);
      }
      setCarregandoAuth(false);
    };

    checarAutenticacao();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const menuItems = [
    { name: 'Visão Geral', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Agenda', icon: CalendarDays, path: '/dashboard/agenda' },
    { name: 'Serviços', icon: Sparkles, path: '/dashboard/servicos' },
    { name: 'Clientes', icon: Users, path: '/dashboard/clientes' },
    { name: 'Finanças', icon: CircleDollarSign, path: '/dashboard/financas' },
    { name: 'Relatórios', icon: BarChart3, path: '/dashboard/relatorios' },
    { name: 'Configurações', icon: Settings, path: '/dashboard/configuracoes' },
  ];

  // Tela de Carregamento enquanto verifica a segurança
  if (carregandoAuth) {
    return (
      <div className="min-h-screen bg-[#120308] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-[#C7977D] mb-4" size={48} />
        <p className="text-[#E8D3C8] text-sm tracking-widest uppercase">Verificando Credenciais...</p>
      </div>
    );
  }

  // Se não foi autorizado (e está redirecionando), não renderiza nada para evitar piscar tela
  if (!autorizado) return null;

  return (
    <div className="min-h-screen bg-[#120308] text-white flex font-sans">
      
      {/* SIDEBAR DE VIDRO */}
      <aside 
        className={`fixed h-full border-r border-[#DCAE96]/30 bg-[#2D0A12]/80 backdrop-blur-xl flex flex-col transition-all duration-300 z-50 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="h-20 flex items-center justify-between px-4 border-b border-[#DCAE96]/30">
          {isSidebarOpen && (
            <div className="overflow-hidden whitespace-nowrap">
              <h2 className="font-serif text-2xl text-[#F8D1BE] drop-shadow-[0_0_10px_rgba(248,209,190,0.4)]">
                Debora Nails
              </h2>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-[#E8D3C8] hover:text-[#F8D1BE] hover:bg-[#DCAE96]/10 rounded-lg transition-colors mx-auto"
          >
            <Menu size={24} />
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.name} 
                href={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] shadow-[0_0_15px_rgba(248,209,190,0.4)] font-semibold' 
                    : 'text-[#E8D3C8] hover:bg-[#DCAE96]/15 hover:text-[#F8D1BE]'
                }`}
                title={!isSidebarOpen ? item.name : ''}
              >
                <item.icon size={22} className="shrink-0" />
                {isSidebarOpen && <span className="whitespace-nowrap">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#DCAE96]/30">
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-3 w-full py-3 rounded-lg text-[#E8D3C8] hover:bg-red-900/40 hover:text-red-400 transition-all"
            title={!isSidebarOpen ? 'Sair do Sistema' : ''}
          >
            <LogOut size={22} className="shrink-0" />
            {isSidebarOpen && <span className="whitespace-nowrap">Sair do Sistema</span>}
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL DINÂMICA */}
      <main 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        <header className="h-20 flex items-center justify-end px-8">
          <button className="relative p-2 text-[#F8D1BE] hover:scale-110 transition-transform">
            <BellRing size={24} />
            <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border border-[#120308]"></span>
          </button>
        </header>
        
        <div className="p-8 pt-0">
          {children}
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(220, 174, 150, 0.2); border-radius: 10px; }
      `}} />
    </div>
  );
}