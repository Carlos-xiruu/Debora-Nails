'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  CalendarDays, LayoutDashboard, Users, CircleDollarSign, Settings,
  BellRing, LogOut, Menu, Sparkles, BarChart3, Loader2, X, Download
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // O menu começa fechado no celular e aberto no PC
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [autorizado, setAutorizado] = useState(false);
  const [carregandoAuth, setCarregandoAuth] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const EMAIL_ADMIN = 'contato@deboranails.com.br';

  useEffect(() => {
    // Abre a sidebar por padrão se for PC
    if (window.innerWidth > 768) setIsSidebarOpen(true);

    // Captura o evento do navegador para permitir instalar o PWA
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    const checarAutenticacao = async () => {
      setCarregandoAuth(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
      } else if (session.user.email !== EMAIL_ADMIN) {
        router.push('/');
      } else {
        setAutorizado(true);
      }
      setCarregandoAuth(false);
    };

    checarAutenticacao();
  }, [router]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

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

  if (carregandoAuth) {
    return (
      <div className="min-h-[100dvh] bg-[#120308] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-[#C7977D] mb-4" size={48} />
        <p className="text-[#E8D3C8] text-sm tracking-widest uppercase">Verificando Credenciais...</p>
      </div>
    );
  }

  if (!autorizado) return null;

  return (
    <div className="min-h-[100dvh] bg-[#120308] text-white flex font-sans overflow-hidden">
      
      {/* OVERLAY MOBILE (Fundo escuro quando menu está aberto no celular) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR DE VIDRO */}
      <aside 
        className={`fixed inset-y-0 left-0 h-[100dvh] border-r border-[#DCAE96]/30 bg-[#2D0A12]/95 backdrop-blur-xl flex flex-col transition-transform duration-300 z-50 md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 md:w-20'
        }`}
      >
        <div className="h-20 flex items-center justify-between px-4 border-b border-[#DCAE96]/30 shrink-0">
          {(isSidebarOpen || window.innerWidth <= 768) && (
            <div className="overflow-hidden whitespace-nowrap">
              <h2 className="font-serif text-2xl text-[#F8D1BE] drop-shadow-[0_0_10px_rgba(248,209,190,0.4)]">
                Debora Nails
              </h2>
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-gray-400 hover:text-white">
            <X size={24} />
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:block p-2 text-[#E8D3C8] hover:text-[#F8D1BE] hover:bg-[#DCAE96]/10 rounded-lg mx-auto">
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
                onClick={() => window.innerWidth <= 768 && setIsSidebarOpen(false)} // Fecha menu ao clicar no celular
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] shadow-[0_0_15px_rgba(248,209,190,0.4)] font-semibold' 
                    : 'text-[#E8D3C8] hover:bg-[#DCAE96]/15 hover:text-[#F8D1BE]'
                }`}
                title={!isSidebarOpen ? item.name : ''}
              >
                <item.icon size={22} className="shrink-0" />
                {(isSidebarOpen || window.innerWidth <= 768) && <span className="whitespace-nowrap">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#DCAE96]/30 shrink-0">
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-3 w-full py-3 rounded-lg text-[#E8D3C8] hover:bg-red-900/40 hover:text-red-400 transition-all"
            title={!isSidebarOpen ? 'Sair do Sistema' : ''}
          >
            <LogOut size={22} className="shrink-0" />
            {(isSidebarOpen || window.innerWidth <= 768) && <span className="whitespace-nowrap">Sair do Sistema</span>}
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className={`flex-1 flex flex-col h-[100dvh] overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        
        {/* HEADER TOP (Visível especialmente no mobile para abrir o menu) */}
        <header className="h-16 md:h-20 shrink-0 flex items-center justify-between px-4 md:px-8 border-b md:border-none border-[#DCAE96]/20 sticky top-0 z-30 bg-[#120308] md:bg-transparent">
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-[#E8D3C8] hover:text-white rounded-lg -ml-2">
              <Menu size={28} />
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            {/* BOTÃO MÁGICO DO PWA */}
            {deferredPrompt && (
              <button onClick={handleInstallClick} className="flex items-center gap-2 bg-[#00B1EA] text-white px-4 py-2 rounded-full text-xs font-bold shadow-[0_0_15px_rgba(0,177,234,0.4)] animate-pulse">
                <Download size={16} /> Instalar App
              </button>
            )}
            <button className="relative p-2 text-[#F8D1BE] hover:scale-110 transition-transform">
              <BellRing size={24} />
              <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border border-[#120308]"></span>
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 md:pt-0 pb-20 custom-scrollbar">
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