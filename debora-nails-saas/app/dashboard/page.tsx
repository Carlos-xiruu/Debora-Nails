'use client'

import { useState, useEffect } from 'react';
import { Clock, Play, TrendingUp, Scissors, CircleDollarSign, LayoutDashboard, StopCircle, Loader2, User, Ban, X, UserX, RefreshCcw, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase'; 

export default function DashboardPage() {
  const [atendimentoEmAndamento, setAtendimentoEmAndamento] = useState(false);
  const [sessaoMonitor, setSessaoMonitor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [agendamentosHoje, setAgendamentosHoje] = useState<any[]>([]);
  const [proximoAgendamento, setProximoAgendamento] = useState<any>(null);
  const [filaAgendamentos, setFilaAgendamentos] = useState<any[]>([]); 
  
  const [lucroHoje, setLucroHoje] = useState(0);
  const [saudacao, setSaudacao] = useState('Bom dia'); 

  // 🛡️ ESTADOS DO MOTOR DE CANCELAMENTO
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [agendamentoCancelar, setAgendamentoCancelar] = useState<any>(null);
  const [isProcessando, setIsProcessando] = useState(false);

  useEffect(() => {
    const horaAtual = new Date().getHours();
    if (horaAtual >= 12 && horaAtual < 18) {
      setSaudacao('Boa tarde');
    } else if (horaAtual >= 18 || horaAtual < 5) {
      setSaudacao('Boa noite');
    }

    fetchDadosHoje();
  }, []);

  const fetchDadosHoje = async () => {
    setIsLoading(true);
    
    const { data: sessaoData } = await supabase.from('sessao_monitor').select('*').eq('id', 1).single();
    if (sessaoData) {
      setAtendimentoEmAndamento(sessaoData.ativo);
      setSessaoMonitor(sessaoData);
    }

    const dataLocalStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const inicioDoDia = `${dataLocalStr}T00:00:00-03:00`;
    const fimDoDia = `${dataLocalStr}T23:59:59-03:00`;

    // 🛡️ Busca atualizada: Traz dados de multas e ignora os já cancelados
    const { data: agendaData, error } = await supabase
      .from('agendamentos')
      .select(`id, inicio, fim, tipo, status_pagamento, clientes ( id, nome, telefone, faltas ), servicos ( id, nome, preco, taxa_sinal )`)
      .gte('inicio', inicioDoDia)
      .lte('inicio', fimDoDia)
      .neq('tipo', 'cancelado') 
      .order('inicio', { ascending: true });
      
    if (error) console.error("Erro na busca da agenda:", error);

    if (agendaData && agendaData.length > 0) {
      setAgendamentosHoje(agendaData);
      
      const totalProduzido = agendaData.filter(a => a.tipo === 'concluido').reduce((acc, curr) => {
        const servicos = curr.servicos as any;
        return acc + (Number(Array.isArray(servicos) ? servicos[0]?.preco : servicos?.preco) || 0);
      }, 0);
      setLucroHoje(totalProduzido);

      const pendentes = agendaData.filter(a => a.tipo !== 'concluido');
      const emAndamento = pendentes.find(a => a.tipo === 'em_andamento');
      
      if (emAndamento) {
        setProximoAgendamento(emAndamento);
        setFilaAgendamentos(pendentes.filter(a => a.id !== emAndamento.id));
      } else if (pendentes.length > 0) {
        setProximoAgendamento(pendentes[0]);
        setFilaAgendamentos(pendentes.slice(1));
      } else {
        setProximoAgendamento(null);
        setFilaAgendamentos([]);
      }
    } else {
      setAgendamentosHoje([]);
      setProximoAgendamento(null);
      setFilaAgendamentos([]);
      setLucroHoje(0);
    }
    
    setIsLoading(false);
  };

  const iniciarAtendimento = async (agendamento: any = proximoAgendamento) => {
    if (!agendamento) return;
    setIsLoading(true);
    
    await supabase.from('sessao_monitor').update({
      ativo: true,
      cliente_nome: agendamento.clientes?.nome || 'Cliente não identificado',
      servico_nome: agendamento.servicos?.nome || 'Serviço não identificado',
      inicio: new Date().toISOString(),
      status_pagamento: agendamento.status_pagamento || 'pendente' 
    }).eq('id', 1);

    await supabase.from('agendamentos').update({ tipo: 'em_andamento' }).eq('id', agendamento.id);
    
    setAtendimentoEmAndamento(true);
    fetchDadosHoje(); 
  };

  const encerrarAtendimento = async () => {
    setIsLoading(true);
    
    await supabase.from('sessao_monitor').update({ ativo: false }).eq('id', 1);

    if (proximoAgendamento && proximoAgendamento.tipo === 'em_andamento') {
      if (proximoAgendamento.status_pagamento !== 'pago') {
        const precoServico = Number(proximoAgendamento.servicos?.preco || 0);
        const taxaSinal = Number(proximoAgendamento.servicos?.taxa_sinal || 0);
        const valorRestante = precoServico - (precoServico * (taxaSinal / 100));

        if (valorRestante > 0) {
          await supabase.from('transacoes').insert([{
            descricao: `Atendimento (Manual): ${proximoAgendamento.clientes?.nome || 'Cliente'} - ${proximoAgendamento.servicos?.nome || 'Serviço'}`,
            tipo: 'entrada',
            valor: valorRestante,
            categoria: 'Atendimento',
            data_pagamento: new Date().toISOString()
          }]);
        }
      }

      await supabase.from('agendamentos').update({ 
        tipo: 'concluido',
        status_pagamento: 'pago' 
      }).eq('id', proximoAgendamento.id);
    }

    setAtendimentoEmAndamento(false);
    fetchDadosHoje(); 
  };

  // 🛡️ MOTOR DE CANCELAMENTO INTELIGENTE COM DÍVIDA
  const processarCancelamento = async (tipo: 'falta' | 'reembolso_total' | 'reembolso_parcial') => {
    setIsProcessando(true);
    try {
      const clienteId = agendamentoCancelar.clientes?.id;
      const preco = agendamentoCancelar.servicos?.preco || 0;
      const taxa = agendamentoCancelar.servicos?.taxa_sinal || 0;
      const valorSinal = preco * (taxa / 100);
      const valorRestante = preco - valorSinal; // ⚠️ A Dívida gerada!

      // 1. Marca agendamento como Cancelado
      await supabase.from('agendamentos').update({ tipo: 'cancelado' }).eq('id', agendamentoCancelar.id);

      // 2. Executa a regra financeira e de CRM
      if (tipo === 'falta' && clienteId) {
        const faltasAtuais = agendamentoCancelar.clientes?.faltas || 0;
        const { data: cData } = await supabase.from('clientes').select('divida_pendente').eq('id', clienteId).single();
        const dividaAtual = cData?.divida_pendente || 0;

        await supabase.from('clientes').update({ 
          faltas: faltasAtuais + 1,
          divida_pendente: dividaAtual + valorRestante
        }).eq('id', clienteId);
      } 
      else if (tipo === 'reembolso_total' && valorSinal > 0) {
        // Devolve 100%
        await supabase.from('transacoes').insert([{
          descricao: `Reembolso 100% (+48h) - ${agendamentoCancelar.clientes?.nome}`,
          tipo: 'saida', valor: valorSinal, categoria: 'Reembolso', data_pagamento: new Date().toISOString()
        }]);
      } 
      else if (tipo === 'reembolso_parcial' && clienteId) {
        // Desistência Tardia: Perde o sinal e gera dívida do restante
        const { data: cData } = await supabase.from('clientes').select('divida_pendente').eq('id', clienteId).single();
        const dividaAtual = cData?.divida_pendente || 0;
        
        await supabase.from('clientes').update({ 
          divida_pendente: dividaAtual + valorRestante
        }).eq('id', clienteId);
      }

      setCancelModalOpen(false);
      setAgendamentoCancelar(null);
      await fetchDadosHoje();
      
    } catch (e) {
      console.error(e);
      alert("Erro ao processar o cancelamento.");
    }
    setIsProcessando(false);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-white mb-2 flex items-center gap-3"><LayoutDashboard className="text-[#C7977D]" size={28} /> {saudacao}, Débora!</h1>
        <p className="text-[#E8D3C8]">Aqui está a sua fila de produção para hoje.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 text-[#C7977D]"><Loader2 className="animate-spin" size={40} /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#120308]/60 border border-[#DCAE96]/20 p-6 rounded-2xl shadow-lg hover:border-[#DCAE96]/40 transition-colors">
              <div className="flex justify-between mb-4"><h3 className="text-[#E8D3C8] text-sm font-bold uppercase tracking-wider text-[10px]">Produzido Hoje</h3><TrendingUp className="text-[#C7977D]" size={18} /></div>
              <p className="text-3xl font-bold text-white">R$ {lucroHoje.toFixed(2).replace('.', ',')}</p>
            </div>
            <div className="bg-[#120308]/60 border border-[#DCAE96]/20 p-6 rounded-2xl shadow-lg hover:border-[#DCAE96]/40 transition-colors">
              <div className="flex justify-between mb-4"><h3 className="text-[#E8D3C8] text-sm font-bold uppercase tracking-wider text-[10px]">Atendimentos da Agenda</h3><Scissors className="text-[#C7977D]" size={18} /></div>
              <p className="text-3xl font-bold text-white">{agendamentosHoje.length}</p>
            </div>
            <div className="bg-[#120308]/60 border border-[#DCAE96]/20 p-6 rounded-2xl shadow-lg hover:border-[#DCAE96]/40 transition-colors">
              <div className="flex justify-between mb-4"><h3 className="text-[#E8D3C8] text-sm font-bold uppercase tracking-wider text-[10px]">Repasse Total do Dia</h3><CircleDollarSign className="text-orange-400 opacity-80" size={18} /></div>
              <p className="text-3xl font-bold text-orange-400">R$ {(lucroHoje * 0.35).toFixed(2).replace('.', ',')}</p>
            </div>
          </div>

          {proximoAgendamento || atendimentoEmAndamento ? (
            <div className={`border p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 mb-10 transition-all duration-500 ${atendimentoEmAndamento ? 'bg-gradient-to-br from-[#120308] to-[#0A1A12] border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)]' : 'bg-[#120308] border-[#DCAE96]/30 shadow-xl'}`}>
              <div className="w-full md:w-auto text-center md:text-left flex flex-col items-center md:items-start">
                <span className={`text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest border ${atendimentoEmAndamento ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 animate-pulse' : 'bg-[#DCAE96]/10 text-[#F8D1BE] border-[#DCAE96]/30'}`}>
                  {atendimentoEmAndamento || proximoAgendamento?.tipo === 'em_andamento' ? 'Em Atendimento Agora' : 'Próximo Atendimento'}
                </span>
                <h2 className="font-serif text-3xl md:text-4xl text-white mt-5 mb-3">
                  {atendimentoEmAndamento && !proximoAgendamento ? sessaoMonitor?.cliente_nome : proximoAgendamento?.clientes?.nome || 'Cliente Desconhecido'}
                </h2>
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-[#E8D3C8] text-sm bg-black/40 px-4 py-2 rounded-xl border border-[#DCAE96]/10">
                  {proximoAgendamento ? (
                    <>
                      <span className="flex items-center gap-2"><Clock size={16} className="text-[#C7977D]"/> {new Date(proximoAgendamento.inicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                      <span className="hidden sm:block text-gray-600">|</span>
                      <span className="flex items-center gap-2"><Scissors size={16} className="text-[#C7977D]"/> {proximoAgendamento.servicos?.nome || 'Serviço excluído'}</span>
                    </>
                  ) : (
                    <span className="flex items-center gap-2"><Scissors size={16} className="text-[#C7977D]"/> {sessaoMonitor?.servico_nome} (Finalize para liberar)</span>
                  )}
                </div>
              </div>

              {atendimentoEmAndamento ? (
                <button onClick={encerrarAtendimento} className="w-full md:w-auto bg-red-500/10 border border-red-500/50 text-red-400 px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-colors shadow-lg">
                  <StopCircle size={24} /> {proximoAgendamento && proximoAgendamento.tipo === 'em_andamento' ? 'Encerrar & Faturar' : 'Parar Atendimento'}
                </button>
              ) : proximoAgendamento && proximoAgendamento.tipo !== 'concluido' ? (
                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
                  <button onClick={() => { setAgendamentoCancelar(proximoAgendamento); setCancelModalOpen(true); }} className="w-full sm:w-auto bg-transparent border border-red-500/30 text-red-400 px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors">
                    <Ban size={20} /> Cancelar / Falta
                  </button>
                  <button onClick={() => iniciarAtendimento(proximoAgendamento)} className="w-full sm:w-auto bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-[0_0_20px_rgba(220,174,150,0.3)]">
                    <Play size={20} fill="currentColor" /> Iniciar Atendimento
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
             <div className="bg-[#120308]/60 border border-[#DCAE96]/20 p-8 rounded-2xl text-center mb-10"><p className="text-[#E8D3C8]">Nenhum agendamento pendente para hoje.</p></div>
          )}

          {filaAgendamentos.length > 0 && (
            <div>
              <h3 className="font-serif text-xl text-[#F8D1BE] mb-4 border-b border-[#DCAE96]/10 pb-2">Restante da Fila de Hoje</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filaAgendamentos.map((agendamento) => (
                  <div key={agendamento.id} className="bg-[#120308]/80 border border-[#DCAE96]/20 p-4 rounded-xl flex items-center justify-between group hover:border-[#DCAE96]/50 transition-colors shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="bg-gradient-to-br from-[#2D0A12] to-[#120308] border border-[#DCAE96]/30 w-14 h-14 rounded-lg flex flex-col items-center justify-center shrink-0 shadow-inner">
                        <span className="text-[#F8D1BE] font-serif text-lg leading-none">{new Date(agendamento.inicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-bold text-sm flex items-center gap-2 mb-1 truncate"><User size={14} className="text-[#C7977D] shrink-0"/> {agendamento.clientes?.nome || 'Cliente'}</p>
                        <p className="text-gray-400 text-xs flex items-center gap-2 truncate"><Scissors size={12} className="shrink-0"/> {agendamento.servicos?.nome || 'Serviço'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setAgendamentoCancelar(agendamento); setCancelModalOpen(true); }} 
                        className="text-red-400 p-2 rounded-full hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors"
                        title="Informar Falta ou Cancelar"
                      >
                        <Ban size={18} />
                      </button>
                      {!atendimentoEmAndamento && (
                        <button 
                          onClick={() => iniciarAtendimento(agendamento)} 
                          className="text-[#DCAE96] p-2 rounded-full hover:bg-[#DCAE96]/10 transition-colors border border-transparent hover:border-[#DCAE96]/30"
                          title="Passar na frente e iniciar"
                        >
                          <Play size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🛡️ MODAL: MOTOR DE CANCELAMENTO */}
          {cancelModalOpen && agendamentoCancelar && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-[#120308] border border-red-500/40 rounded-3xl w-full max-w-md shadow-[0_0_40px_rgba(239,68,68,0.2)] flex flex-col overflow-hidden animate-in zoom-in-95">
                <div className="bg-[#2D0A12] px-6 py-4 border-b border-red-500/20 flex justify-between items-center">
                  <h2 className="text-xl font-serif text-red-400 flex items-center gap-2"><Ban size={20}/> Cancelar Atendimento</h2>
                  <button onClick={() => setCancelModalOpen(false)} className="text-gray-400 hover:text-white bg-[#120308] p-2 rounded-full"><X size={20}/></button>
                </div>
                
                <div className="p-6">
                  <p className="text-white mb-1">Cliente: <strong>{agendamentoCancelar.clientes?.nome}</strong></p>
                  <p className="text-gray-400 text-sm mb-6">O que aconteceu com este agendamento?</p>

                  <div className="space-y-3">
                    <button onClick={() => processarCancelamento('falta')} disabled={isProcessando} className="w-full bg-[#2D0A12] border border-red-500/30 p-4 rounded-xl text-left hover:bg-red-900/20 transition-all group disabled:opacity-50">
                      <strong className="text-red-400 block mb-1 flex items-center gap-2"><UserX size={16}/> Faltou (Sem Aviso)</strong>
                      <span className="text-xs text-gray-400 block leading-relaxed">Penaliza a cliente com +1 Falta no CRM e GERA DÍVIDA do valor restante. A vaga volta para a agenda online.</span>
                    </button>

                    <button onClick={() => processarCancelamento('reembolso_total')} disabled={isProcessando} className="w-full bg-[#2D0A12] border border-emerald-500/30 p-4 rounded-xl text-left hover:bg-emerald-900/20 transition-all group disabled:opacity-50">
                      <strong className="text-emerald-400 block mb-1 flex items-center gap-2"><RefreshCcw size={16}/> Cancelou Correto (+48h)</strong>
                      <span className="text-xs text-gray-400 block leading-relaxed">Não penaliza a cliente. Registra saída de 100% do sinal no financeiro como "Reembolso". Vaga liberada.</span>
                    </button>

                    <button onClick={() => processarCancelamento('reembolso_parcial')} disabled={isProcessando} className="w-full bg-[#2D0A12] border border-orange-500/30 p-4 rounded-xl text-left hover:bg-orange-900/20 transition-all group disabled:opacity-50">
                      <strong className="text-orange-400 block mb-1 flex items-center gap-2"><AlertTriangle size={16}/> Cancelou em cima da hora (-48h)</strong>
                      <span className="text-xs text-gray-400 block leading-relaxed">Perde o sinal e GERA DÍVIDA do valor restante na conta da cliente. Vaga liberada.</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
}