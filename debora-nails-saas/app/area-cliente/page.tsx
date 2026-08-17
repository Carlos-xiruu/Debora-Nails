'use client'

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CalendarDays, Crown, ArrowLeft, LogOut, Loader2, Sparkles, Clock, History, Award, Gift, HeartHandshake, CheckCircle2, AlertTriangle, CalendarX, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function AreaClientePage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [clienteBanco, setClienteBanco] = useState<any>(null);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }
      setUsuario(session.user);

      const telefone = session.user.user_metadata?.telefone;
      let clienteId = null;
      let clienteStats = null;
      
      if (telefone) {
          const { data: cData } = await supabase.from('clientes').select('*').eq('telefone', telefone).single();
          if (cData) {
              clienteId = cData.id;
              clienteStats = cData;
          }
      } else {
          const { data: cData } = await supabase.from('clientes').select('*').eq('nome', session.user.user_metadata?.nome_completo).limit(1).single();
          if (cData) {
              clienteId = cData.id;
              clienteStats = cData;
          }
      }

      setClienteBanco(clienteStats);

      if (clienteId) {
        // Ignora agendamentos já cancelados para limpar a tela
        const { data: agendaData } = await supabase
          .from('agendamentos')
          .select(`*, servicos ( nome, preco, duracao )`)
          .eq('cliente_id', clienteId)
          .neq('tipo', 'cancelado')
          .order('inicio', { ascending: false });
          
        if (agendaData) setAgendamentos(agendaData);
      }
    } catch (error) {
      console.error("Erro ao carregar dados VIP:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // 🛡️ AÇÃO: CANCELAR COM MAIS DE 48H (ESTORNO 100%)
  const cancelarComEstorno = async (ag: any) => {
    if (!window.confirm('Deseja realmente cancelar este agendamento? Como você está avisando com mais de 48h de antecedência, o valor do seu sinal será estornado.')) return;
    
    setIsLoading(true);
    try {
      // 1. Cancela na agenda
      await supabase.from('agendamentos').update({ tipo: 'cancelado' }).eq('id', ag.id);
      
      // 2. Notifica a Débora no WhatsApp
      const dataFormatada = new Date(ag.inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      const mensagemDebora = `🚨 *CANCELAMENTO VIP (Requer Estorno)* 🚨\n\nA cliente *${clienteBanco?.nome}* acabou de cancelar pelo aplicativo o agendamento de *${ag.servicos?.nome}* do dia *${dataFormatada}*.\n\n✅ *Aviso feito com mais de 48h de antecedência.*\n💰 *Ação Necessária:* Realizar o estorno do sinal para a cliente. A vaga já foi liberada automaticamente na agenda online!`;
      
      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: '5547996987519', mensagem: mensagemDebora }) 
      });

      alert('Cancelamento realizado com sucesso! A Débora foi notificada e entrará em contato para realizar o estorno do seu sinal.');
      await carregarDados();
    } catch (error) {
      console.error(error);
      alert('Erro ao cancelar. Tente novamente.');
      setIsLoading(false);
    }
  };

  // 🛡️ AÇÃO: REAGENDAR ENTRE 24H E 48H (RETÉM SINAL)
  const solicitarReagendamento = (ag: any) => {
    const dataFormatada = new Date(ag.inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const mensagem = `Olá Débora! Preciso reagendar meu horário de *${ag.servicos?.nome}* marcado para o dia *${dataFormatada}*.\n\nComo estou avisando com antecedência (entre 24h e 48h), gostaria de manter o meu sinal retido para a nova data. Podemos ver um novo horário?`;
    window.open(`https://wa.me/5547996987519?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0204] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#C7977D]" size={40} />
      </div>
    );
  }

  const atendimentosFeitos = clienteBanco?.atendimentos || 0;
  const faltamParaVip = Math.max(10 - atendimentosFeitos, 0);
  const isVip = atendimentosFeitos >= 10;
  const progressoFidelidade = Math.min((atendimentosFeitos / 10) * 100, 100);

  return (
    <div className="min-h-screen bg-[#0a0204] text-white font-sans selection:bg-[#C7977D] selection:text-[#120308] pb-20">
      
      <div className="fixed inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(199, 151, 125, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(199, 151, 125, 0.15) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#DCAE96]/5 rounded-full blur-[150px] pointer-events-none"></div>

      <header className="bg-[#120308]/80 backdrop-blur-xl border-b border-[#3a2522] sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft size={16} /> <span className="hidden md:inline">Voltar ao Início</span>
          </Link>
          <div className="flex items-center gap-4">
            <button onClick={handleLogout} className="flex items-center gap-2 text-red-400/80 hover:text-red-400 text-sm font-bold bg-red-500/10 px-4 py-2 rounded-full transition-colors border border-red-500/20">
              <LogOut size={14} /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-12 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="flex flex-col md:flex-row items-center gap-6 mb-12 bg-gradient-to-r from-[#180A0D] to-[#120308] border border-[#3a2522] p-8 rounded-[32px] shadow-2xl relative overflow-hidden">
          {isVip && <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-500/20 blur-[50px] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '4s' }}></div>}
          
          <div className="w-24 h-24 bg-[#0a0204] border border-[#C7977D]/40 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(199,151,125,0.2)] shrink-0 relative">
            {isVip && <Crown size={24} className="absolute -top-3 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />}
            <span className="text-3xl font-serif text-[#F8D1BE] uppercase">{usuario?.user_metadata?.nome_completo?.charAt(0) || 'L'}</span>
          </div>
          
          <div className="text-center md:text-left flex-1">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
              <h1 className="font-serif text-3xl text-white">Olá, {usuario?.user_metadata?.nome_completo?.split(' ')[0] || 'Linda'}</h1>
              {isVip && <span className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md flex items-center gap-1"><Sparkles size={12}/> VIP</span>}
            </div>
            <p className="text-gray-400 text-sm">{usuario?.email}</p>
          </div>
          
          <div className="w-full md:w-auto mt-4 md:mt-0 flex justify-center">
            <Link href="/#servicos" className="bg-gradient-to-r from-[#DCAE96] to-[#C7977D] text-[#120308] px-8 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(220,174,150,0.3)] hover:scale-105 transition-transform text-sm whitespace-nowrap">
              Novo Agendamento
            </Link>
          </div>
        </div>

        {/* CLUBE DE FIDELIDADE (MANTIDO INTACTO) */}
        <div className="bg-[#120308]/60 backdrop-blur-md border border-[#3a2522] rounded-[24px] p-6 md:p-8 mb-12 shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="font-serif text-2xl text-[#F8D1BE] flex items-center gap-2"><Award size={24}/> Clube de Fidelidade</h2>
            <span className={`border px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${isVip ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-[#180A0D] border-[#3a2522] text-gray-300'}`}>
              {isVip ? 'Status VIP Ativo' : `${atendimentosFeitos} / 10 Visitas`}
            </span>
          </div>
          
          <div className="relative w-full h-4 bg-[#0a0204] rounded-full overflow-hidden border border-[#3a2522] mb-4 shadow-inner">
            <div 
              className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out ${isVip ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' : 'bg-gradient-to-r from-[#DCAE96] to-[#C7977D]'}`}
              style={{ width: `${progressoFidelidade}%` }}
            ></div>
          </div>
          
          <p className="text-sm text-gray-400 text-center md:text-left mb-8">
            {isVip 
              ? 'Você alcançou o status máximo! Fique de olho em mimos exclusivos nas suas próximas visitas. ✨' 
              : `Faltam apenas ${faltamParaVip} ${faltamParaVip === 1 ? 'visita' : 'visitas'} para você desbloquear suas recompensas exclusivas.`}
          </p>

          <div className="border-t border-[#3a2522] pt-8">
            <h3 className="font-serif text-lg text-white mb-5 flex items-center gap-2">
              <Sparkles size={18} className="text-[#C7977D]" /> Recompensas VIP
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`bg-[#0a0204] border ${isVip ? 'border-yellow-500/30 shadow-[0_0_15px_rgba(250,204,21,0.1)]' : 'border-[#DCAE96]/20 shadow-lg'} p-5 rounded-2xl flex items-start gap-4 transition-colors group`}>
                <div className={`w-12 h-12 rounded-full ${isVip ? 'bg-yellow-500/20' : 'bg-[#DCAE96]/10'} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  <Gift className={isVip ? 'text-yellow-400' : 'text-[#DCAE96]'} size={22} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm mb-1.5 flex items-center gap-2">
                    Kit de Auto cuidado <span className={`text-[9px] px-2 py-0.5 rounded uppercase tracking-wider font-bold ${isVip ? 'bg-yellow-500/20 text-yellow-400' : 'bg-[#C7977D]/20 text-[#DCAE96]'}`}>{isVip ? 'Desbloqueado' : '11ª Visita'}</span>
                  </h4>
                  <p className="text-gray-400 text-xs leading-relaxed">Na sua 11ª visita, você recebe um kit exclusivo contendo uma canetinha de óleo hidratante de cutículas personalizada e um mini creme de mãos de alta qualidade.</p>
                </div>
              </div>

              <div className="bg-[#0a0204] border border-[#DCAE96]/20 p-5 rounded-2xl flex items-start gap-4 hover:border-[#DCAE96]/50 transition-colors group shadow-lg">
                <div className="w-12 h-12 rounded-full bg-[#DCAE96]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <HeartHandshake className="text-[#DCAE96]" size={22} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm mb-1.5 flex items-center gap-2">
                    Indique e Ganhe <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 font-bold"><CheckCircle2 size={8}/> Ilimitado</span>
                  </h4>
                  <p className="text-gray-400 text-xs leading-relaxed">Indique uma amiga para o Studio e, quando ela realizar o primeiro atendimento, você ganha uma <strong className="text-[#F8D1BE] font-medium">Plástica dos Pés</strong> para relaxar e renovar.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HISTÓRICO E GESTÃO DE AGENDAMENTOS */}
        <h3 className="font-serif text-2xl text-white mb-6 flex items-center gap-2"><History className="text-[#C7977D]"/> Seus Agendamentos</h3>
        
        {agendamentos.length === 0 ? (
          <div className="bg-[#120308]/60 border border-[#3a2522] border-dashed rounded-[24px] p-12 text-center flex flex-col items-center">
            <CalendarDays size={48} className="text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">Você ainda não possui agendamentos ativos.</p>
            <p className="text-gray-500 text-sm mt-2">Agende o seu primeiro momento de beleza e ele aparecerá aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {agendamentos.map((ag) => {
              const dataObj = new Date(ag.inicio);
              const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
              const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              
              const isFuture = dataObj > new Date();
              // Calcula as horas de diferença do momento atual até o agendamento
              const hoursDifference = isFuture ? (dataObj.getTime() - new Date().getTime()) / (1000 * 60 * 60) : 0;
              
              const statusCor = ag.tipo === 'concluido' ? 'text-gray-500 bg-gray-900/50 border-gray-800' : ag.tipo === 'em_andamento' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-[#F8D1BE] bg-[#DCAE96]/10 border-[#DCAE96]/30';

              return (
                <div key={ag.id} className="bg-[#180A0D] border border-[#3a2522] rounded-2xl p-6 hover:border-[#DCAE96]/30 transition-colors flex flex-col shadow-lg relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded border ${statusCor} mb-3 inline-block`}>
                        {ag.tipo.replace('_', ' ')}
                      </span>
                      <h4 className="font-serif text-xl text-white leading-tight">{ag.servicos?.nome || 'Serviço Personalizado'}</h4>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm mb-5">
                    <div className="flex items-center gap-2 text-gray-300 font-medium bg-[#120308] px-3 py-1.5 rounded-lg border border-[#3a2522]">
                      <Clock size={14} className="text-[#C7977D]"/> {dataFormatada} às {horaFormatada}
                    </div>
                    {ag.servicos?.preco && (
                      <span className="font-bold text-xl text-[#DCAE96]">R$ {ag.servicos.preco.toFixed(2).replace('.', ',')}</span>
                    )}
                  </div>

                  {/* 🛡️ REGRAS DE CANCELAMENTO PARA AGENDAMENTOS FUTUROS */}
                  {ag.tipo === 'agendado' && isFuture && (
                    <div className="mt-auto pt-4 border-t border-[#3a2522]">
                      {hoursDifference >= 48 ? (
                        <div className="flex flex-col gap-2">
                          <p className="text-[10px] text-emerald-400 font-medium mb-1">✅ Estorno garantido (Mais de 48h restantes)</p>
                          <button onClick={() => cancelarComEstorno(ag)} className="w-full bg-red-500/10 text-red-400 border border-red-500/30 py-2.5 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-colors flex justify-center items-center gap-2">
                            <CalendarX size={16}/> Cancelar e Solicitar Estorno
                          </button>
                        </div>
                      ) : hoursDifference >= 24 ? (
                        <div className="flex flex-col gap-2">
                          <p className="text-[10px] text-orange-400 font-medium mb-1">⚠️ Prazo de estorno encerrado (Menos de 48h). Permite apenas remarcação.</p>
                          <button onClick={() => solicitarReagendamento(ag)} className="w-full bg-orange-500/10 text-orange-400 border border-orange-500/30 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-500/20 transition-colors flex justify-center items-center gap-2">
                            <MessageCircle size={16}/> Reagendar Via WhatsApp
                          </button>
                        </div>
                      ) : (
                        <div className="bg-red-900/10 border border-red-500/20 p-3 rounded-xl">
                          <p className="text-xs text-red-400 font-bold mb-1 flex items-center gap-1.5"><AlertTriangle size={14} /> Cancelamento Bloqueado</p>
                          <p className="text-[10px] text-gray-400 leading-relaxed">Faltam menos de 24h para o seu horário. Em caso de falta ou desistência agora, o valor integral (restante) do serviço será cobrado na sua próxima visita.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}