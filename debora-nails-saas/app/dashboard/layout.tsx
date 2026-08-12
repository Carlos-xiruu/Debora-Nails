'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  CalendarDays, LayoutDashboard, Users, CircleDollarSign, Settings,
  BellRing, LogOut, Menu, Sparkles, BarChart3, Loader2, X, Download
} from 'lucide-react';
import { supabase } from '../lib/supabase';
manifest: '/manifest-dashboard.json'; // O PADRÃO É O DAS CLIENTES

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificacaoOpen, setIsNotificacaoOpen] = useState(false); 
  
  // ESTADOS DO SINO INTELIGENTE
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

  // CANAL DE ESCUTA PARA NOTIFICAÇÕES EM TEMPO REAL
  useEffect(() => {
    const carregarNotificacoesIniciais = async () => {
      // Busca os últimos 5 agendamentos para popular o sino inicialmente
      const { data } = await supabase
        .from('agendamentos')
        .select(`id, inicio, clientes(nome), servicos(nome)`)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (data) setNotificacoes(data);
    };

    carregarNotificacoesIniciais();

    // Fica vigiando o banco de dados. Se alguém agendar, o sino avisa!
    const canalAgendamentos = supabase
      .channel('notificacoes_agenda')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agendamentos' }, async (payload) => {
        
        // Quando entra um novo agendamento, busca o nome do cliente e serviço para exibir
        const { data: detalhes } = await supabase
          .from('agendamentos')
          .select(`id, inicio, clientes(nome), servicos(nome)`)
          .eq('id', payload.new.id)
          .single();

        if (detalhes) {
          setNotificacoes(prev => [detalhes, ...prev].slice(0, 10)); // Mantém as 10 mais recentes
          setTemNaoLida(true); // Acende a bolinha vermelha
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
        <p className="text-[#E8D3C8] text-sm tracking-widest uppercase">Verificando Credenciais...</p>
      </div>
    );
  }

  if (!autorizado) return null;

  return (
    <div className="min-h-[100dvh] bg-[#120308] text-white flex font-sans overflow-hidden">
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

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
                onClick={() => window.innerWidth <= 768 && setIsSidebarOpen(false)} 
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

      <main className={`flex-1 flex flex-col h-[100dvh] overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        
        <header className="h-16 md:h-20 shrink-0 flex items-center justify-between px-4 md:px-8 border-b md:border-none border-[#DCAE96]/20 sticky top-0 z-30 bg-[#120308] md:bg-transparent">
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-[#E8D3C8] hover:text-white rounded-lg -ml-2">
              <Menu size={28} />
            </button>
          </div>
          
          <div className="flex items-center gap-4 relative">
            {deferredPrompt && (
              <button onClick={handleInstallClick} className="flex items-center gap-2 bg-[#00B1EA] text-white px-4 py-2 rounded-full text-xs font-bold shadow-[0_0_15px_rgba(0,177,234,0.4)] animate-pulse">
                <Download size={16} /> Instalar App
              </button>
            )}
            
            <div className="relative">
              <button 
                onClick={() => {
                  setIsNotificacaoOpen(!isNotificacaoOpen);
                  if (temNaoLida && isNotificacaoOpen) setTemNaoLida(false); 
                }} 
                className="relative p-2 text-[#F8D1BE] hover:scale-110 transition-transform"
              >
                <BellRing size={24} />
                {temNaoLida && <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border border-[#120308] animate-pulse"></span>}
              </button>

              {isNotificacaoOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-[#120308] border border-[#DCAE96]/30 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-[#DCAE96]/30 flex justify-between items-center bg-[#2D0A12]">
                    <h3 className="font-medium text-white">Notificações</h3>
                    <button onClick={marcarComoLidas} className="text-xs text-[#DCAE96] hover:text-white transition-colors">Marcar como lidas</button>
                  </div>
                  
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    {notificacoes.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-500">
                        <BellRing size={32} className="mx-auto mb-3 opacity-20" />
                        Nenhuma notificação no momento.
                      </div>
                    ) : (
                      <div className="divide-y divide-[#DCAE96]/10">
                        {notificacoes.map((notif, index) => (
                          <div key={index} className="p-4 hover:bg-[#2D0A12]/50 transition-colors flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                              <CalendarDays size={16} />
                            </div>
                            <div>
                              <p className="text-sm text-white mb-0.5"><strong className="text-[#F8D1BE]">{notif.clientes?.nome}</strong> agendou um horário!</p>
                              <p className="text-xs text-gray-400">{notif.servicos?.nome}</p>
                              <p className="text-[10px] text-[#C7977D] mt-1">{new Date(notif.inicio).toLocaleDateString('pt-BR')} às {new Date(notif.inicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 border-t border-[#DCAE96]/30 bg-[#2D0A12] text-center">
                    <Link href="/dashboard/agenda" onClick={() => setIsNotificacaoOpen(false)} className="text-xs text-[#F8D1BE] hover:underline">Ver agenda completa</Link>
                  </div>
                </div>
              )}
            </div>

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