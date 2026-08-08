'use client'

import { useState, useEffect } from 'react';
import { Clock, Play, TrendingUp, Scissors, CircleDollarSign, LayoutDashboard, StopCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DashboardPage() {
  const [atendimentoEmAndamento, setAtendimentoEmAndamento] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [agendamentosHoje, setAgendamentosHoje] = useState<any[]>([]);
  const [proximoAgendamento, setProximoAgendamento] = useState<any>(null);
  const [lucroHoje, setLucroHoje] = useState(0);

  useEffect(() => {
    fetchDadosHoje();
  }, []);

  const fetchDadosHoje = async () => {
    setIsLoading(true);
    
    const { data: sessaoData } = await supabase.from('sessao_monitor').select('*').eq('id', 1).single();
    if (sessaoData) setAtendimentoEmAndamento(sessaoData.ativo);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const { data: agendaData } = await supabase
      .from('agendamentos')
      .select(`id, inicio, fim, tipo, clientes ( nome ), servicos ( nome, preco )`)
      .gte('inicio', hoje.toISOString())
      .lt('inicio', amanha.toISOString())
      .order('inicio', { ascending: true });

    if (agendaData && agendaData.length > 0) {
      setAgendamentosHoje(agendaData);
      
      const total = agendaData.filter(a => a.tipo === 'concluido').reduce((acc, curr) => {
        const servicos = curr.servicos as any;
        return acc + (Number(Array.isArray(servicos) ? servicos[0]?.preco : servicos?.preco) || 0);
      }, 0);
      setLucroHoje(total);

      const pendentes = agendaData.filter(a => a.tipo !== 'concluido');
      if (pendentes.length > 0) {
        setProximoAgendamento(pendentes[0]);
      } else {
        setProximoAgendamento(agendaData[agendaData.length - 1]);
      }
    }
    
    setIsLoading(false);
  };

  const iniciarAtendimento = async () => {
    if (!proximoAgendamento) return;
    setIsLoading(true);
    
    await supabase.from('sessao_monitor').update({
      ativo: true,
      cliente_nome: proximoAgendamento.clientes.nome,
      servico_nome: proximoAgendamento.servicos.nome,
      inicio: new Date().toISOString()
    }).eq('id', 1);

    // Muda o status na Agenda
    await supabase.from('agendamentos').update({ tipo: 'em_andamento' }).eq('id', proximoAgendamento.id);
    
    setAtendimentoEmAndamento(true);
    setIsLoading(false);
  };

  const encerrarAtendimento = async () => {
    if (!proximoAgendamento) return;
    setIsLoading(true);
    
    // 1. Desliga o Monitor
    await supabase.from('sessao_monitor').update({ ativo: false }).eq('id', 1);

    // 2. Conclui a sessão na Agenda
    await supabase.from('agendamentos').update({ tipo: 'concluido' }).eq('id', proximoAgendamento.id);

    // 3. REGISTRA NAS FINANÇAS E RELATÓRIOS!
    await supabase.from('transacoes').insert([{
      descricao: `Atendimento: ${proximoAgendamento.clientes.nome} - ${proximoAgendamento.servicos.nome}`,
      tipo: 'entrada',
      valor: proximoAgendamento.servicos.preco,
      categoria: 'Atendimento'
    }]);

    setAtendimentoEmAndamento(false);
    fetchDadosHoje(); // Recarrega para atualizar o lucro
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-white mb-2 flex items-center gap-3"><LayoutDashboard className="text-[#C7977D]" size={28} /> Bom dia, Débora!</h1>
        <p className="text-[#E8D3C8]">Aqui está o resumo do seu ateliê hoje.</p>
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

          {proximoAgendamento ? (
            <div className={`border p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 ${atendimentoEmAndamento ? 'bg-gradient-to-br from-[#120308] to-[#0A1A12] border-emerald-500/50' : 'bg-[#120308] border-[#DCAE96]/30'}`}>
              <div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase border ${atendimentoEmAndamento ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-[#DCAE96]/10 text-[#F8D1BE] border-[#DCAE96]/30'}`}>
                  {atendimentoEmAndamento || proximoAgendamento.tipo === 'em_andamento' ? 'Em Atendimento Agora' : 'Próxima Cliente'}
                </span>
                <h2 className="font-serif text-3xl md:text-4xl text-white mt-5 mb-3">{proximoAgendamento.clientes.nome}</h2>
                <div className="flex items-center gap-5 text-[#E8D3C8] text-sm">
                  <span className="flex items-center gap-2"><Clock size={16} className="text-[#C7977D]"/> {new Date(proximoAgendamento.inicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                  <span className="flex items-center gap-2"><Scissors size={16} className="text-[#C7977D]"/> {proximoAgendamento.servicos.nome}</span>
                </div>
              </div>

              {!atendimentoEmAndamento && proximoAgendamento.tipo !== 'concluido' ? (
                <button onClick={iniciarAtendimento} className="w-full md:w-auto bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3">
                  <Play size={20} fill="currentColor" /> Iniciar Atendimento
                </button>
              ) : proximoAgendamento.tipo !== 'concluido' ? (
                <button onClick={encerrarAtendimento} className="w-full md:w-auto bg-transparent border border-red-500 text-red-400 px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3">
                  <StopCircle size={24} /> Encerrar & Faturar
                </button>
              ) : null}
            </div>
          ) : (
             <div className="bg-[#120308]/60 border border-[#DCAE96]/20 p-8 rounded-2xl text-center"><p className="text-[#E8D3C8]">Agenda Livre hoje.</p></div>
          )}
        </>
      )}
    </div>
  );
}