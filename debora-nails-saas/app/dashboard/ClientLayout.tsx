'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  CalendarDays, LayoutDashboard, Users, CircleDollarSign, Settings,
  BellRing, LogOut, Menu, Sparkles, BarChart3, Loader2, X, Download,
  Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificacaoOpen, setIsNotificacaoOpen] = useState(false); 
  
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [temNaoLida, setTemNaoLida] = useState(false);

  const [autorizado, setAutorizado] = useState(false);
  const [carregandoAuth, setCarregandoAuth] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const EMAIL_ADMIN = 'debora199917silva@gmail.com';

  useEffect(() => {
    if (window.innerWidth > 768) setIsSidebarOpen(true);

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

  useEffect(() => {
    const carregarNotificacoesIniciais = async () => {
      const { data } = await supabase
        .from('agendamentos')
        .select(`id, inicio, clientes(nome), servicos(nome)`)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (data) setNotificacoes(data);
    };

    carregarNotificacoesIniciais();

    const canalAgendamentos = supabase
      .channel('notificacoes_agenda')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agendamentos' }, async (payload) => {
        
        const { data: detalhes } = await supabase
          .from('agendamentos')
          .select(`id, inicio, clientes(nome), servicos(nome)`)
          .eq('id', payload.new.id)
          .single();

        if (detalhes) {
          setNotificacoes(prev => [detalhes, ...prev].slice(0, 10)); 
          setTemNaoLida(true); 
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(canalAgendamentos); };
  }, []);

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

  const marcarComoLidas = () => {
    setTemNaoLida(false);
    setIsNotificacaoOpen(false);
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
        <p className="text-[#E8D3C8] text-sm tracking-widest uppercase font-bold">Acessando o Sistema...</p>
      </div>
    );
  }

  if (!autorizado) return null;

  return (
    <div className="min-h-[100dvh] bg-[#120308] text-white flex font-sans overflow-hidden selection:bg-[#C7977D] selection:text-[#120308]">
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 🛡️ TRAVA NATIVA: paddingTop via style garante que a Safe Area seja respeitada sempre */}
      <aside 
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)', paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
        className={`fixed inset-y-0 left-0 h-[100dvh] border-r border-[#DCAE96]/20 bg-[#2D0A12]/95 backdrop-blur-xl flex flex-col transition-transform duration-300 z-50 md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full w-64 md:w-20'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#DCAE96]/20 shrink-0">
          {(isSidebarOpen || window.innerWidth <= 768) && (
            <div className="overflow-hidden whitespace-nowrap animate-in fade-in">
              <h2 className="font-serif text-2xl text-[#F8D1BE] drop-shadow-[0_0_10px_rgba(248,209,190,0.4)]">
                Debora Nails
              </h2>
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <X size={24} />
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:block p-2 text-[#E8D3C8] hover:text-[#F8D1BE] hover:bg-[#DCAE96]/10 rounded-lg mx-auto transition-colors">
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
                onClick={() => window.innerWidth <= 768 && setIsSidebarOpen(false)} 
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] shadow-[0_0_15px_rgba(248,209,190,0.4)] font-bold' 
                    : 'text-[#E8D3C8] hover:bg-[#DCAE96]/10 hover:text-[#F8D1BE]'
                }`}
                title={!isSidebarOpen ? item.name : ''}
              >
                <item.icon size={22} className="shrink-0" />
                {(isSidebarOpen || window.innerWidth <= 768) && <span className="whitespace-nowrap">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#DCAE96]/20 shrink-0">
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-3 w-full py-3 rounded-xl text-[#E8D3C8] hover:bg-red-500/10 hover:border-red-500/30 border border-transparent hover:text-red-400 transition-all"
            title={!isSidebarOpen ? 'Sair do Sistema' : ''}
          >
            <LogOut size={22} className="shrink-0" />
            {(isSidebarOpen || window.innerWidth <= 768) && <span className="whitespace-nowrap font-medium">Sair do Sistema</span>}
          </button>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col h-[100dvh] overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        
        {/* 🛡️ TRAVA NATIVA: Forçando a margem do topo com inline-style */}
        <header 
          style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}
          className="min-h-[5rem] shrink-0 flex items-center justify-between px-4 md:px-8 border-b md:border-none border-[#DCAE96]/20 sticky top-0 z-30 bg-[#120308]/90 backdrop-blur-md md:bg-transparent"
        >
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-[#E8D3C8] hover:text-[#F8D1BE] hover:bg-[#DCAE96]/10 rounded-lg -ml-2 transition-colors">
              <Menu size={28} />
            </button>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 relative">
            {deferredPrompt && (
              <button onClick={handleInstallClick} className="flex items-center gap-1.5 sm:gap-2 bg-[#00B1EA] text-white px-3 sm:px-4 py-2 rounded-full text-[10px] sm:text-xs font-bold shadow-[0_0_15px_rgba(0,177,234,0.4)] animate-pulse hover:scale-105 transition-transform">
                <Download size={16} className="shrink-0" /> <span className="hidden sm:inline">Instalar App</span>
              </button>
            )}
            
            <div className="relative">
              <button 
                onClick={() => {
                  setIsNotificacaoOpen(!isNotificacaoOpen);
                  if (temNaoLida && isNotificacaoOpen) setTemNaoLida(false); 
                }} 
                className="relative p-2 text-[#E8D3C8] hover:text-[#F8D1BE] hover:bg-[#DCAE96]/10 rounded-full transition-all"
              >
                <BellRing size={24} />
                {temNaoLida && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#120308] animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>}
              </button>

              {isNotificacaoOpen && (
                <div className="absolute right-0 mt-3 w-[90vw] sm:w-80 max-w-sm bg-[#120308]/95 backdrop-blur-xl border border-[#DCAE96]/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200 origin-top-right">
                  <div className="p-4 border-b border-[#DCAE96]/20 flex justify-between items-center bg-[#2D0A12]/80">
                    <h3 className="font-serif text-[#F8D1BE] text-lg">Notificações</h3>
                    <button onClick={marcarComoLidas} className="text-[10px] text-gray-400 hover:text-white uppercase tracking-wider font-bold transition-colors">Marcar Lidas</button>
                  </div>
                  
                  <div className="max-h-[60vh] sm:max-h-[350px] overflow-y-auto custom-scrollbar">
                    {notificacoes.length === 0 ? (
                      <div className="p-8 text-center text-sm text-gray-500 flex flex-col items-center">
                        <BellRing size={32} className="mb-3 opacity-20" />
                        Nenhuma notificação recente.
                      </div>
                    ) : (
                      <div className="divide-y divide-[#DCAE96]/10">
                        {notificacoes.map((notif, index) => (
                          <div key={index} className="p-4 hover:bg-[#2D0A12]/40 transition-colors flex items-start gap-3 group cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                              <CalendarDays size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-300 mb-0.5 leading-tight"><strong className="text-white">{notif.clientes?.nome}</strong> agendou um horário!</p>
                              <p className="text-xs text-[#C7977D] truncate">{notif.servicos?.nome}</p>
                              <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1 font-mono uppercase tracking-widest"><Clock size={10}/> {new Date(notif.inicio).toLocaleDateString('pt-BR')} às {new Date(notif.inicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 border-t border-[#DCAE96]/20 bg-[#2D0A12]/80 text-center">
                    <Link href="/dashboard/agenda" onClick={() => setIsNotificacaoOpen(false)} className="text-xs font-bold text-[#F8D1BE] uppercase tracking-wider hover:text-white transition-colors block w-full py-1">Ver agenda completa</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        
        {/* 🛡️ TRAVA NATIVA: Protegendo o scroll no final da página */}
        <div 
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 40px)' }}
          className="flex-1 overflow-y-auto p-4 md:p-8 pt-2 md:pt-2 custom-scrollbar relative z-10"
        >
          {children}
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(220, 174, 150, 0.3); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(220, 174, 150, 0.5); }
      `}} />
    </div>
  );
}