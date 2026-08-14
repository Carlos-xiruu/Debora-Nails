'use client'

import { useState, useEffect } from 'react';
import { Clock, Play, TrendingUp, Scissors, CircleDollarSign, LayoutDashboard, StopCircle, Loader2, User } from 'lucide-react';
import { supabase } from '../lib/supabase'; // Caminho padronizado

export default function DashboardPage() {
  const [atendimentoEmAndamento, setAtendimentoEmAndamento] = useState(false);
  const [sessaoMonitor, setSessaoMonitor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [agendamentosHoje, setAgendamentosHoje] = useState<any[]>([]);
  const [proximoAgendamento, setProximoAgendamento] = useState<any>(null);
  const [filaAgendamentos, setFilaAgendamentos] = useState<any[]>([]); 
  
  const [lucroHoje, setLucroHoje] = useState(0);
  const [saudacao, setSaudacao] = useState('Bom dia'); 

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

    const { data: agendaData, error } = await supabase
      .from('agendamentos')
      .select(`id, inicio, fim, tipo, status_pagamento, clientes ( nome, telefone ), servicos ( nome, preco, taxa_sinal )`)
      .gte('inicio', inicioDoDia)
      .lte('inicio', fimDoDia)
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
    
    // 🛡️ Blindado com Optional Chaining
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
        // 🛡️ Blindado com Optional Chaining
        const precoServico = Number(proximoAgendamento.servicos?.preco || 0);
        const taxaSinal = Number(proximoAgendamento.servicos?.taxa_sinal || 0);
        const valorRestante = precoServico - (precoServico * (taxaSinal / 100));

        if (valorRestante > 0) {
          await supabase.from('transacoes').insert([{
            descricao: `Atendimento (Manual): ${proximoAgendamento.clientes?.nome || 'Cliente'} - ${proximoAgendamento.servicos?.nome || 'Serviço'}`,
            tipo: 'entrada',
            valor: valorRestante,
            categoria: 'Atendimento'
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
                  {/* 🛡️ Blindado */}
                  {atendimentoEmAndamento && !proximoAgendamento ? sessaoMonitor?.cliente_nome : proximoAgendamento?.clientes?.nome || 'Cliente Desconhecido'}
                </h2>
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-[#E8D3C8] text-sm bg-black/40 px-4 py-2 rounded-xl border border-[#DCAE96]/10">
                  {proximoAgendamento ? (
                    <>
                      <span className="flex items-center gap-2"><Clock size={16} className="text-[#C7977D]"/> {new Date(proximoAgendamento.inicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                      <span className="hidden sm:block text-gray-600">|</span>
                      {/* 🛡️ Blindado */}
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
                <button onClick={() => iniciarAtendimento(proximoAgendamento)} className="w-full md:w-auto bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-[0_0_20px_rgba(220,174,150,0.3)]">
                  <Play size={20} fill="currentColor" /> Iniciar Atendimento
                </button>
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
                        {/* 🛡️ Blindado */}
                        <p className="text-white font-bold text-sm flex items-center gap-2 mb-1 truncate"><User size={14} className="text-[#C7977D] shrink-0"/> {agendamento.clientes?.nome || 'Cliente'}</p>
                        <p className="text-gray-400 text-xs flex items-center gap-2 truncate"><Scissors size={12} className="shrink-0"/> {agendamento.servicos?.nome || 'Serviço'}</p>
                      </div>
                    </div>
                    
                    {!atendimentoEmAndamento && (
                      <button 
                        onClick={() => iniciarAtendimento(agendamento)} 
                        className="text-[#DCAE96] p-2 rounded-full hover:bg-[#DCAE96]/10 transition-colors md:opacity-0 group-hover:opacity-100 border border-transparent hover:border-[#DCAE96]/30 shrink-0"
                        title="Passar na frente e iniciar"
                      >
                        <Play size={20} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
}