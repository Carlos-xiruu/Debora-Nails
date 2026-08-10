'use client'

import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, Plus, DollarSign, X, Loader2, ArrowUpRight, ArrowDownRight, Trash2, Calendar, ShieldCheck, Percent, CircleDollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function FinancasPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [resumo, setResumo] = useState({ entradas: 0, saidas: 0, saldoReal: 0, sinais: 0, servicos: 0, repasse: 0 });

  useEffect(() => {
    fetchTransacoes();
  }, []);

  const fetchTransacoes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('transacoes')
      .select('*')
      .order('data_pagamento', { ascending: false });

    if (error) {
      console.error('Erro ao buscar finanças:', error);
    } else if (data) {
      setTransacoes(data);
      
      const totalEntradas = data.filter(t => t.tipo === 'entrada').reduce((acc, curr) => acc + Number(curr.valor), 0);
      const totalSaidas = data.filter(t => t.tipo === 'saida').reduce((acc, curr) => acc + Number(curr.valor), 0);
      
      const totalSinais = data.filter(t => t.tipo === 'entrada' && t.categoria === 'Sinal').reduce((acc, curr) => acc + Number(curr.valor), 0);
      const totalServicos = data.filter(t => t.tipo === 'entrada' && t.categoria === 'Atendimento').reduce((acc, curr) => acc + Number(curr.valor), 0);
      
      // Cálculo dos 35% do ateliê sobre os serviços e sinais
      const repasseAtelie = (totalSinais + totalServicos) * 0.35;
      
      // Lucro líquido real (Entradas - Repasse - Despesas da Débora)
      const lucroDeBolso = totalEntradas - repasseAtelie - totalSaidas;
      
      setResumo({
        entradas: totalEntradas,
        saidas: totalSaidas,
        saldoReal: lucroDeBolso,
        sinais: totalSinais,
        servicos: totalServicos,
        repasse: repasseAtelie
      });
    }
    setIsLoading(false);
  };

  const handleCriarTransacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    
    const novaTransacao = {
      descricao: formData.get('descricao') as string,
      tipo: formData.get('tipo') as string,
      categoria: formData.get('categoria') as string,
      valor: parseFloat(formData.get('valor') as string),
      data_pagamento: new Date(formData.get('data') as string).toISOString()
    };

    const { data, error } = await supabase.from('transacoes').insert([novaTransacao]).select();

    if (error) {
      alert('Erro ao registrar transação.');
    } else if (data) {
      await fetchTransacoes(); 
      setIsModalOpen(false);
    }
    setIsSaving(false);
  };

  const deletarTransacao = async (id: string) => {
    if (!window.confirm('Excluir este registro financeiro?')) return;
    await supabase.from('transacoes').delete().eq('id', id);
    await fetchTransacoes();
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl text-white mb-2 flex items-center gap-3">
            <Wallet className="text-[#C7977D]" size={28} />
            Gestão Financeira
          </h1>
          <p className="text-[#E8D3C8]">Controle seu fluxo de caixa, comissões do ateliê e lucro real.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-[0_0_15px_rgba(248,209,190,0.3)] shrink-0"
        >
          <Plus size={20} /> Lançamento
        </button>
      </div>

      {/* CARDS DE RESUMO AVANÇADOS COM REPASSE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        <div className="bg-[#120308]/60 backdrop-blur-md border border-emerald-500/20 p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><ArrowUpRight size={64} className="text-emerald-400" /></div>
          <h3 className="text-emerald-400/80 font-medium text-sm mb-4">Faturamento Bruto</h3>
          <p className="text-2xl font-bold text-emerald-400">{formatarMoeda(resumo.entradas)}</p>
          <p className="text-xs text-gray-400 mt-1">Sinais + Serviços finalizados</p>
        </div>

        <div className="bg-[#120308]/60 backdrop-blur-md border border-orange-500/20 p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Percent size={64} className="text-orange-400" /></div>
          <h3 className="text-orange-400/80 font-medium text-sm mb-4">Repasse Ateliê (35%)</h3>
          <p className="text-2xl font-bold text-orange-400">- {formatarMoeda(resumo.repasse)}</p>
          <p className="text-xs text-gray-400 mt-1">A ser pago ao salão</p>
        </div>

        <div className="bg-[#120308]/60 backdrop-blur-md border border-red-500/20 p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><ArrowDownRight size={64} className="text-red-400" /></div>
          <h3 className="text-red-400/80 font-medium text-sm mb-4">Minhas Despesas</h3>
          <p className="text-2xl font-bold text-red-400">- {formatarMoeda(resumo.saidas)}</p>
          <p className="text-xs text-gray-400 mt-1">Materiais, marketing, etc.</p>
        </div>

        <div className="bg-gradient-to-br from-[#120308] to-[#0A1A12] backdrop-blur-md border border-emerald-500/50 p-6 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20"><CircleDollarSign size={64} className="text-emerald-400" /></div>
          <h3 className="text-[#E8D3C8] font-medium text-sm mb-4">Meu Lucro Líquido</h3>
          <p className={`text-3xl font-bold ${resumo.saldoReal >= 0 ? 'text-white' : 'text-red-400'}`}>
            {formatarMoeda(resumo.saldoReal)}
          </p>
          <p className="text-xs text-emerald-400 mt-1 font-medium">Livre no seu bolso</p>
        </div>
      </div>

      <div className="bg-[#2D0A12]/40 backdrop-blur-sm border border-[#DCAE96]/20 rounded-2xl p-6 shadow-xl min-h-[400px]">
        <h2 className="text-xl font-serif text-[#F8D1BE] mb-6 flex items-center gap-2 border-b border-[#DCAE96]/10 pb-4">
          Histórico de Movimentações
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-20 text-[#C7977D]"><Loader2 className="animate-spin" size={40} /></div>
        ) : transacoes.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            Nenhuma movimentação financeira registrada.
          </div>
        ) : (
          <div className="space-y-3">
            {transacoes.map(t => {
              const isEntrada = t.tipo === 'entrada';
              const isSinal = t.categoria === 'Sinal';
              const dataFormatada = new Date(t.data_pagamento).toLocaleDateString('pt-BR');

              return (
                <div key={t.id} className="bg-[#120308]/80 border border-[#DCAE96]/10 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-[#DCAE96]/30 transition-colors">
                  
                  <div className="flex items-center gap-4 w-full md:w-auto min-w-0">
                    <div className={`p-3 rounded-lg shrink-0 ${isEntrada ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {isEntrada ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-white font-medium break-words">{t.descricao}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-1">
                        <span className={`px-2 py-0.5 rounded border whitespace-nowrap ${isSinal ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-[#2D0A12] border-[#DCAE96]/10'}`}>
                          {t.categoria}
                        </span>
                        <span className="flex items-center gap-1 shrink-0"><Calendar size={12}/> {dataFormatada}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full md:w-auto gap-6 shrink-0 mt-2 md:mt-0 pt-2 md:pt-0 border-t border-[#DCAE96]/10 md:border-none">
                    <p className={`font-bold text-lg ${isEntrada ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isEntrada ? '+' : '-'} {formatarMoeda(t.valor)}
                    </p>
                    <button onClick={() => deletarTransacao(t.id)} className="text-gray-500 hover:text-red-400 transition-colors p-2 shrink-0">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#120308] border border-[#DCAE96]/40 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_40px_rgba(199,151,125,0.2)] animate-in zoom-in-95 duration-300">
            <div className="bg-[#2D0A12] px-6 py-4 flex justify-between items-center border-b border-[#DCAE96]/20">
              <h2 className="text-xl font-serif text-[#F8D1BE] flex items-center gap-2"><DollarSign size={20}/> Novo Lançamento</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleCriarTransacao}>
              <div className="p-6 space-y-5">
                <div className="flex gap-4 p-1 bg-[#2D0A12] rounded-xl border border-[#DCAE96]/20">
                  <label className="flex-1 cursor-pointer">
                    <input type="radio" name="tipo" value="entrada" defaultChecked className="peer sr-only" />
                    <div className="py-2 text-center rounded-lg text-sm font-medium text-gray-400 peer-checked:bg-emerald-500/20 peer-checked:text-emerald-400 transition-all flex justify-center items-center gap-2">
                      <TrendingUp size={16}/> Entrada
                    </div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <input type="radio" name="tipo" value="saida" className="peer sr-only" />
                    <div className="py-2 text-center rounded-lg text-sm font-medium text-gray-400 peer-checked:bg-red-500/20 peer-checked:text-red-400 transition-all flex justify-center items-center gap-2">
                      <TrendingDown size={16}/> Saída
                    </div>
                  </label>
                </div>
                <div>
                  <label className="block text-sm text-[#E8D3C8] mb-1">Descrição *</label>
                  <input type="text" name="descricao" required placeholder="Ex: Compra de Esmaltes" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE]"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#E8D3C8] mb-1">Valor (R$) *</label>
                    <input type="number" step="0.01" name="valor" required placeholder="0.00" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE]"/>
                  </div>
                  <div>
                    <label className="block text-sm text-[#E8D3C8] mb-1">Data *</label>
                    <input type="date" name="data" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE]"/>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[#E8D3C8] mb-1">Categoria</label>
                  <select name="categoria" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE] appearance-none">
                    <option value="Sinal">Recebimento de Sinal</option>
                    <option value="Atendimento">Pagamento Final (Atendimento)</option>
                    <option value="Produtos">Produtos / Insumos</option>
                    <option value="Infraestrutura">Infraestrutura / Água / Luz</option>
                    <option value="Marketing">Marketing / Anúncios</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 bg-[#2D0A12] border-t border-[#DCAE96]/20">
                <button type="submit" disabled={isSaving} className="w-full bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-8 py-3 rounded-xl font-bold hover:scale-[1.02] transition-transform disabled:opacity-50">
                  {isSaving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}