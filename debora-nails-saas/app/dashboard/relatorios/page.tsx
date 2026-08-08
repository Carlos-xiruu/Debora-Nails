'use client'

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Award, CalendarCheck, Loader2, ArrowUpRight, ArrowDownRight, Target, Percent } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function RelatoriosPage() {
  const [isLoading, setIsLoading] = useState(true);
  
  const [metricas, setMetricas] = useState({
    totalClientes: 0,
    clientesVip: 0,
    receitaBruta: 0,
    sinaisMes: 0,
    servicosMes: 0,
    repasseMes: 0,
    despesaMes: 0,
    lucroReal: 0,
    totalAgendamentos: 0,
    margemLucro: 0
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setIsLoading(true);

    try {
      const { data: clientes } = await supabase.from('clientes').select('atendimentos');
      const totalCli = clientes?.length || 0;
      const vips = clientes?.filter(c => c.atendimentos >= 10).length || 0;

      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
      
      const { data: transacoes } = await supabase
        .from('transacoes')
        .select('tipo, valor, categoria')
        .gte('data_pagamento', primeiroDiaMes);

      const receitas = transacoes?.filter(t => t.tipo === 'entrada').reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;
      const sinais = transacoes?.filter(t => t.tipo === 'entrada' && t.categoria === 'Sinal').reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;
      const servicos = transacoes?.filter(t => t.tipo === 'entrada' && t.categoria === 'Atendimento').reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;
      const despesas = transacoes?.filter(t => t.tipo === 'saida').reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;
      
      // Cálculo dos 35% de repasse
      const repasse = (sinais + servicos) * 0.35;
      
      // Lucro Real (Bolso)
      const lucro = receitas - repasse - despesas;
      
      // Margem baseada no faturamento bruto
      const margem = receitas > 0 ? Math.round((lucro / receitas) * 100) : 0;

      const { count: totalAgendamentos } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact', head: true });

      setMetricas({
        totalClientes: totalCli,
        clientesVip: vips,
        receitaBruta: receitas,
        sinaisMes: sinais,
        servicosMes: servicos,
        repasseMes: repasse,
        despesaMes: despesas,
        lucroReal: lucro,
        totalAgendamentos: totalAgendamentos || 0,
        margemLucro: margem
      });

    } catch (error) {
      console.error("Erro ao carregar relatórios", error);
    }

    setIsLoading(false);
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const pctSinais = metricas.receitaBruta > 0 ? (metricas.sinaisMes / metricas.receitaBruta) * 100 : 0;
  const pctServicos = metricas.receitaBruta > 0 ? (metricas.servicosMes / metricas.receitaBruta) * 100 : 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-white mb-2 flex items-center gap-3">
          <BarChart3 className="text-[#C7977D]" size={28} />
          Relatórios & Desempenho
        </h1>
        <p className="text-[#E8D3C8]">Visão analítica e cálculo de comissões do ateliê no mês atual.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 text-[#C7977D]"><Loader2 className="animate-spin" size={40} /></div>
      ) : (
        <div className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#120308]/60 border border-[#DCAE96]/20 p-6 rounded-2xl shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[#E8D3C8] font-medium text-sm">Faturamento Bruto</h3>
                <TrendingUp className="text-[#C7977D]" size={18} />
              </div>
              <p className="text-3xl font-bold text-white">{formatarMoeda(metricas.receitaBruta)}</p>
            </div>
            <div className="bg-[#120308]/60 border border-[#DCAE96]/20 p-6 rounded-2xl shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[#E8D3C8] font-medium text-sm">Base de Clientes</h3>
                <Users className="text-[#C7977D]" size={18} />
              </div>
              <p className="text-3xl font-bold text-white">{metricas.totalClientes}</p>
            </div>
            <div className="bg-[#120308]/60 border border-[#DCAE96]/20 p-6 rounded-2xl shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[#E8D3C8] font-medium text-sm">Clientes VIPs (10+ idas)</h3>
                <Award className="text-indigo-400" size={18} />
              </div>
              <p className="text-3xl font-bold text-indigo-400">{metricas.clientesVip}</p>
            </div>
            <div className="bg-[#120308]/60 border border-[#DCAE96]/20 p-6 rounded-2xl shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[#E8D3C8] font-medium text-sm">Agendamentos Totais</h3>
                <CalendarCheck className="text-[#C7977D]" size={18} />
              </div>
              <p className="text-3xl font-bold text-white">{metricas.totalAgendamentos}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* COMPOSIÇÃO DE SAÚDE FINANCEIRA */}
            <div className="bg-[#2D0A12]/40 border border-[#DCAE96]/20 p-8 rounded-2xl shadow-xl">
              <h2 className="text-xl font-serif text-[#F8D1BE] mb-6 border-b border-[#DCAE96]/10 pb-4 flex items-center gap-2">
                <Target size={20} /> Mapa Financeiro do Mês
              </h2>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-emerald-400 font-medium flex items-center gap-1"><ArrowUpRight size={14}/> Receitas Brutas</span>
                    <span className="text-white font-bold">{formatarMoeda(metricas.receitaBruta)}</span>
                  </div>
                  <div className="w-full bg-[#120308] rounded-full h-3 border border-[#DCAE96]/10 flex overflow-hidden">
                    <div className="bg-indigo-400 h-full" style={{ width: `${pctSinais}%` }} title="Sinais"></div>
                    <div className="bg-emerald-400 h-full" style={{ width: `${pctServicos}%` }} title="Pagamentos Finais"></div>
                  </div>
                  <div className="flex justify-between text-xs mt-2 text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400"></span> Sinais ({formatarMoeda(metricas.sinaisMes)})</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Serviços ({formatarMoeda(metricas.servicosMes)})</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-orange-400 font-medium flex items-center gap-1"><Percent size={14}/> Repasse Ateliê (35%)</span>
                    <span className="text-white font-bold text-orange-400">- {formatarMoeda(metricas.repasseMes)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-red-400 font-medium flex items-center gap-1"><ArrowDownRight size={14}/> Minhas Despesas</span>
                    <span className="text-white font-bold text-red-400">- {formatarMoeda(metricas.despesaMes)}</span>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-[#DCAE96]/10 flex justify-between items-center bg-[#120308]/40 p-4 rounded-xl">
                  <div>
                    <p className="text-gray-400 text-sm font-medium mb-1">Meu Lucro Líquido</p>
                    <p className={`text-3xl font-bold ${metricas.lucroReal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatarMoeda(metricas.lucroReal)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm font-medium mb-1">Margem de Bolso</p>
                    <p className={`text-xl font-bold px-3 py-1 rounded-full border ${metricas.margemLucro >= 40 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : metricas.margemLucro > 0 ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                      {metricas.margemLucro}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#2D0A12]/40 border border-[#DCAE96]/20 p-8 rounded-2xl shadow-xl flex flex-col justify-center items-center text-center">
              <Award size={64} className="text-[#C7977D] mb-6 opacity-80" />
              <h2 className="font-serif text-3xl text-white mb-4">Taxa de Fidelização</h2>
              <p className="text-[#E8D3C8] text-lg mb-8 max-w-sm">
                Atualmente, <strong>{metricas.totalClientes > 0 ? Math.round((metricas.clientesVip / metricas.totalClientes) * 100) : 0}%</strong> da sua base de clientes são VIPs (10 ou mais agendamentos).
              </p>
              
              <div className="w-full max-w-sm bg-[#120308]/80 border border-[#DCAE96]/20 p-4 rounded-xl flex items-center justify-between">
                <span className="text-gray-400 text-sm">Clientes Regulares</span>
                <span className="text-white font-bold">{metricas.totalClientes - metricas.clientesVip}</span>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}