'use client'

import { useState, useEffect } from 'react';
import { Clock, Play, TrendingUp, Scissors, CircleDollarSign, LayoutDashboard, StopCircle, Loader2, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DashboardPage() {
  const [atendimentoEmAndamento, setAtendimentoEmAndamento] = useState(false);
  const [sessaoMonitor, setSessaoMonitor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [agendamentosHoje, setAgendamentosHoje] = useState<any[]>([]);
  const [proximoAgendamento, setProximoAgendamento] = useState<any>(null);
  const [filaAgendamentos, setFilaAgendamentos] = useState<any[]>([]); // NOVA: Fila de clientes de hoje
  
  const [lucroHoje, setLucroHoje] = useState(0);

  useEffect(() => {
    fetchDadosHoje();
  }, []);

  const fetchDadosHoje = async () => {
    setIsLoading(true);
    
    const { data: sessaoData } = await supabase.from('sessao_monitor').select('*').eq('id', 1).single();
    if (sessaoData) {
      setAtendimentoEmAndamento(sessaoData.ativo);
      setSessaoMonitor(sessaoData);
    }

    const hoje = new Date();
    const inicioDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
    const fimDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);

    const { data: agendaData, error } = await supabase
      .from('agendamentos')
      .select(`id, inicio, fim, tipo, status_pagamento, clientes ( nome, telefone ), servicos ( nome, preco )`)
      .gte('inicio', inicioDoDia.toISOString())
      .lte('inicio', fimDoDia.toISOString())
      .order('inicio', { ascending: true });
      
    if (error) console.error("Erro na busca da agenda:", error);

    if (agendaData && agendaData.length > 0) {
      setAgendamentosHoje(agendaData);
      
      const total = agendaData.filter(a => a.tipo === 'concluido').reduce((acc, curr) => {
        const servicos = curr.servicos as any;
        return acc + (Number(Array.isArray(servicos) ? servicos[0]?.preco : servicos?.preco) || 0);
      }, 0);
      setLucroHoje(total);

      // Lógica de Fila: Filtra apenas os não concluídos
      const pendentes = agendaData.filter(a => a.tipo !== 'concluido');
      
      if (pendentes.length > 0) {
        setProximoAgendamento(pendentes[0]); // O primeiro é o destaque
        setFilaAgendamentos(pendentes.slice(1)); // O resto vai para a fila
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
      cliente_nome: agendamento.clientes.nome,
      servico_nome: agendamento.servicos.nome,
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
      await supabase.from('agendamentos').update({ tipo: 'concluido' }).eq('id', proximoAgendamento.id);

      await supabase.from('transacoes').insert([{
        descricao: `Atendimento: ${proximoAgendamento.clientes.nome} - ${proximoAgendamento.servicos.nome}`,
        tipo: 'entrada',
        valor: proximoAgendamento.servicos.preco,
        categoria: 'Atendimento'
      }]);
    }

    setAtendimentoEmAndamento(false);
    fetchDadosHoje(); 
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-white mb-2 flex items-center gap-3"><LayoutDashboard className="text-[#C7977D]" size={28} /> Bom dia, Débora!</h1>
        <p className="text-[#E8D3C8]">Aqui está a sua fila de produção para hoje.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 text-[#C7977D]"><Loader2 className="animate-spin" size={40} /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#120308]/60 border border-[#DCAE96]/20 p-6 rounded-2xl shadow-lg">
              <div className="flex justify-between mb-4"><h3 className="text-[#E8D3C8] text-sm">Faturado Hoje (Concluídos)</h3><TrendingUp className="text-[#C7977D]" size={18} /></div>
              <p className="text-3xl font-bold text-white">R$ {lucroHoje.toFixed(2).replace('.', ',')}</p>
            </div>
            <div className="bg-[#120308]/60 border border-[#DCAE96]/20 p-6 rounded-2xl shadow-lg">
              <div className="flex justify-between mb-4"><h3 className="text-[#E8D3C8] text-sm">Atendimentos (Hoje)</h3><Scissors className="text-[#C7977D]" size={18} /></div>
              <p className="text-3xl font-bold text-white">{agendamentosHoje.length}</p>
            </div>
            <div className="bg-[#120308]/60 border border-[#DCAE96]/20 p-6 rounded-2xl shadow-lg">
              <div className="flex justify-between mb-4"><h3 className="text-[#E8D3C8] text-sm">Repasses (35%)</h3><CircleDollarSign className="text-[#C7977D]" size={18} /></div>
              <p className="text-3xl font-bold text-white">R$ {(lucroHoje * 0.35).toFixed(2).replace('.', ',')}</p>
            </div>
          </div>

          {/* O AGENDAMENTO ATUAL / PRÓXIMO EM DESTAQUE */}
          {proximoAgendamento || atendimentoEmAndamento ? (
            <div className={`border p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 mb-10 ${atendimentoEmAndamento ? 'bg-gradient-to-br from-[#120308] to-[#0A1A12] border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)]' : 'bg-[#120308] border-[#DCAE96]/30 shadow-xl'}`}>
              <div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase border ${atendimentoEmAndamento ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-[#DCAE96]/10 text-[#F8D1BE] border-[#DCAE96]/30'}`}>
                  {atendimentoEmAndamento || proximoAgendamento?.tipo === 'em_andamento' ? 'Em Atendimento Agora' : 'Próximo Atendimento'}
                </span>
                <h2 className="font-serif text-3xl md:text-4xl text-white mt-5 mb-3">
                  {atendimentoEmAndamento && !proximoAgendamento ? sessaoMonitor?.cliente_nome : proximoAgendamento?.clientes?.nome}
                </h2>
                <div className="flex items-center gap-5 text-[#E8D3C8] text-sm">
                  {proximoAgendamento ? (
                    <>
                      <span className="flex items-center gap-2"><Clock size={16} className="text-[#C7977D]"/> {new Date(proximoAgendamento.inicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                      <span className="flex items-center gap-2"><Scissors size={16} className="text-[#C7977D]"/> {proximoAgendamento.servicos.nome}</span>
                    </>
                  ) : (
                    <span className="flex items-center gap-2"><Scissors size={16} className="text-[#C7977D]"/> {sessaoMonitor?.servico_nome} (Finalize para liberar)</span>
                  )}
                </div>
              </div>

              {atendimentoEmAndamento ? (
                <button onClick={encerrarAtendimento} className="w-full md:w-auto bg-transparent border border-red-500 text-red-400 px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-red-500/10 transition-colors">
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

          {/* LISTA DA FILA DE HOJE */}
          {filaAgendamentos.length > 0 && (
            <div>
              <h3 className="font-serif text-xl text-[#F8D1BE] mb-4">Restante da Fila de Hoje</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filaAgendamentos.map((agendamento) => (
                  <div key={agendamento.id} className="bg-[#120308]/80 border border-[#DCAE96]/20 p-5 rounded-xl flex items-center justify-between group hover:border-[#DCAE96]/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-[#2D0A12] border border-[#DCAE96]/30 w-14 h-14 rounded-lg flex flex-col items-center justify-center shrink-0">
                        <span className="text-white font-serif text-lg leading-none">{new Date(agendamento.inicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm flex items-center gap-2 mb-1"><User size={14} className="text-[#C7977D]"/> {agendamento.clientes?.nome}</p>
                        <p className="text-gray-400 text-xs flex items-center gap-2"><Scissors size={12}/> {agendamento.servicos?.nome}</p>
                      </div>
                    </div>
                    {/* Botão de Cortesia para iniciar um fora de ordem, caso a Débora queira passar alguém na frente */}
                    {!atendimentoEmAndamento && (
                      <button 
                        onClick={() => iniciarAtendimento(agendamento)} 
                        className="text-[#DCAE96] p-2 rounded-full hover:bg-[#DCAE96]/10 transition-colors opacity-0 group-hover:opacity-100 hidden md:block"
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