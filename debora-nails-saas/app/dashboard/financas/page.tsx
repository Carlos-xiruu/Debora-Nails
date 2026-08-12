'use client'

import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, Plus, DollarSign, X, Loader2, ArrowUpRight, ArrowDownRight, Trash2, Calendar, ShieldCheck, Percent, CircleDollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Caminho corrigido

export default function FinancasPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [resumo, setResumo] = useState({ entradas: 0, saidas: 0, saldoReal: 0, sinais: 0, servicos: 0, repasseTotal: 0, repassePendente: 0 });
  
  // Estado para o formulário dinâmico
  const [tipoTransacao, setTipoTransacao] = useState<'entrada' | 'saida'>('entrada');

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
      
      // Lógica Contábil Blindada (Sem dupla dedução)
      const repasseTotalDevido = (totalSinais + totalServicos) * 0.35;
      const repasseJaPago = data.filter(t => t.tipo === 'saida' && t.categoria === 'Repasse Ateliê').reduce((acc, curr) => acc + Number(curr.valor), 0);
      const repassePendente = Math.max(0, repasseTotalDevido - repasseJaPago);
      
      // Lucro Real = O que entrou - O que já saiu - O que ainda estou devendo de repasse
      const lucroDeBolso = totalEntradas - totalSaidas - repassePendente;
      
      setResumo({
        entradas: totalEntradas,
        saidas: totalSaidas,
        saldoReal: lucroDeBolso,
        sinais: totalSinais,
        servicos: totalServicos,
        repasseTotal: repasseTotalDevido,
        repassePendente: repassePendente
      });
    }
    setIsLoading(false);
  };

  const handleCriarTransacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    
    // Converte vírgula para ponto se o usuário digitar errado
    const valorTratado = (formData.get('valor') as string).replace(',', '.');

    const novaTransacao = {
      descricao: formData.get('descricao') as string,
      tipo: tipoTransacao,
      categoria: formData.get('categoria') as string,
      valor: parseFloat(valorTratado),
      data_pagamento: new Date(`${formData.get('data')}T12:00:00`).toISOString() // Evita erro de fuso horário
    };

    const { data, error } = await supabase.from('transacoes').insert([novaTransacao]).select();

    if (error) {
      alert('Erro ao registrar transação.');
    } else if (data) {
      await fetchTransacoes(); 
      setIsModalOpen(false);
      setTipoTransacao('entrada'); // Reseta o form
    }
    setIsSaving(false);
  };

  const deletarTransacao = async (id: string) => {
    if (!window.confirm('Excluir este registro financeiro permanentemente?')) return;
    await supabase.from('transacoes').delete().eq('id', id);
    await fetchTransacoes();
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* CABEÇALHO */}
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
          className="w-full sm:w-auto bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-[0_0_15px_rgba(248,209,190,0.3)] shrink-0"
        >
          <Plus size={20} /> Lançamento
        </button>
      </div>

      {/* CARDS DE RESUMO AVANÇADOS COM REPASSE CORRIGIDO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        <div className="bg-[#120308]/60 backdrop-blur-md border border-emerald-500/20 p-6 rounded-2xl shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><ArrowUpRight size={64} className="text-emerald-400" /></div>
          <h3 className="text-emerald-400/80 font-medium text-sm mb-4 uppercase tracking-wider text-[10px]">Faturamento Bruto</h3>
          <p className="text-2xl font-bold text-emerald-400">{formatarMoeda(resumo.entradas)}</p>
          <p className="text-[10px] text-gray-400 mt-1">Sinais + Serviços finalizados</p>
        </div>

        <div className="bg-[#120308]/60 backdrop-blur-md border border-orange-500/20 p-6 rounded-2xl shadow-lg relative overflow-hidden group hover:border-orange-500/40 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Percent size={64} className="text-orange-400" /></div>
          <h3 className="text-orange-400/80 font-medium text-sm mb-4 uppercase tracking-wider text-[10px]">Repasse Ateliê (Pendente)</h3>
          <p className="text-2xl font-bold text-orange-400">- {formatarMoeda(resumo.repassePendente)}</p>
          <p className="text-[10px] text-gray-400 mt-1">O que ainda falta pagar ao salão</p>
        </div>

        <div className="bg-[#120308]/60 backdrop-blur-md border border-red-500/20 p-6 rounded-2xl shadow-lg relative overflow-hidden group hover:border-red-500/40 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><ArrowDownRight size={64} className="text-red-400" /></div>
          <h3 className="text-red-400/80 font-medium text-sm mb-4 uppercase tracking-wider text-[10px]">Minhas Despesas Reais</h3>
          <p className="text-2xl font-bold text-red-400">- {formatarMoeda(resumo.saidas)}</p>
          <p className="text-[10px] text-gray-400 mt-1">Materiais, repasses pagos, etc.</p>
        </div>

        <div className="bg-gradient-to-br from-[#120308] to-[#0A1A12] backdrop-blur-md border border-emerald-500/50 p-6 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.15)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform"><CircleDollarSign size={64} className="text-emerald-400" /></div>
          <h3 className="text-[#E8D3C8] font-medium text-sm mb-4 uppercase tracking-wider text-[10px]">Meu Lucro Líquido</h3>
          <p className={`text-3xl font-bold ${resumo.saldoReal >= 0 ? 'text-white' : 'text-red-400'}`}>
            {formatarMoeda(resumo.saldoReal)}
          </p>
          <p className="text-[10px] text-emerald-400 mt-1 font-bold tracking-widest uppercase">Livre no seu bolso</p>
        </div>
      </div>

      {/* HISTÓRICO */}
      <div className="bg-[#2D0A12]/40 backdrop-blur-sm border border-[#DCAE96]/20 rounded-2xl p-6 shadow-xl min-h-[400px]">
        <h2 className="text-xl font-serif text-[#F8D1BE] mb-6 flex items-center gap-2 border-b border-[#DCAE96]/10 pb-4">
          Histórico de Movimentações
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-20 text-[#C7977D]"><Loader2 className="animate-spin" size={40} /></div>
        ) : transacoes.length === 0 ? (
          <div className="text-center py-20 text-gray-400 border border-dashed border-[#DCAE96]/20 rounded-xl bg-[#120308]/40">
            Nenhuma movimentação financeira registrada no momento.
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {transacoes.map(t => {
              const isEntrada = t.tipo === 'entrada';
              const isSinal = t.categoria === 'Sinal';
              const isRepasse = t.categoria === 'Repasse Ateliê';
              const dataFormatada = new Date(t.data_pagamento).toLocaleDateString('pt-BR', {timeZone: 'UTC'});

              return (
                <div key={t.id} className="bg-[#120308]/80 border border-[#DCAE96]/10 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-[#DCAE96]/30 transition-colors">
                  
                  <div className="flex items-center gap-4 w-full md:w-auto min-w-0">
                    <div className={`p-3 rounded-lg shrink-0 ${isEntrada ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {isEntrada ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-white font-medium break-words leading-tight mb-1">{t.descricao}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <span className={`px-2 py-0.5 rounded border whitespace-nowrap text-[10px] font-bold tracking-wider uppercase ${isSinal ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : isRepasse ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' : 'bg-[#2D0A12] border-[#DCAE96]/10'}`}>
                          {t.categoria}
                        </span>
                        <span className="flex items-center gap-1 shrink-0 bg-black/30 px-2 py-0.5 rounded text-[10px]"><Calendar size={10}/> {dataFormatada}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full md:w-auto gap-6 shrink-0 mt-2 md:mt-0 pt-2 md:pt-0 border-t border-[#DCAE96]/10 md:border-none">
                    <p className={`font-bold text-lg md:text-xl font-mono ${isEntrada ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isEntrada ? '+' : '-'} {formatarMoeda(t.valor)}
                    </p>
                    <button onClick={() => deletarTransacao(t.id)} className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors p-2 shrink-0">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: NOVO LANÇAMENTO (COM CATEGORIAS DINÂMICAS) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#120308] border border-[#DCAE96]/40 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_40px_rgba(199,151,125,0.2)] animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="bg-[#2D0A12] px-6 py-4 flex justify-between items-center border-b border-[#DCAE96]/20 shrink-0">
              <h2 className="text-xl font-serif text-[#F8D1BE] flex items-center gap-2"><DollarSign size={20}/> Novo Lançamento</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleCriarTransacao} className="flex flex-col overflow-hidden">
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                
                {/* SELECTOR DE TIPO */}
                <div className="flex gap-4 p-1 bg-[#2D0A12] rounded-xl border border-[#DCAE96]/20">
                  <label className="flex-1 cursor-pointer">
                    <input type="radio" name="tipo" value="entrada" checked={tipoTransacao === 'entrada'} onChange={() => setTipoTransacao('entrada')} className="peer sr-only" />
                    <div className="py-2.5 text-center rounded-lg text-sm font-bold text-gray-500 peer-checked:bg-emerald-500/20 peer-checked:text-emerald-400 peer-checked:border border-emerald-500/30 transition-all flex justify-center items-center gap-2 uppercase tracking-wider text-[10px]">
                      <TrendingUp size={16}/> Entrada
                    </div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <input type="radio" name="tipo" value="saida" checked={tipoTransacao === 'saida'} onChange={() => setTipoTransacao('saida')} className="peer sr-only" />
                    <div className="py-2.5 text-center rounded-lg text-sm font-bold text-gray-500 peer-checked:bg-red-500/20 peer-checked:text-red-400 peer-checked:border border-red-500/30 transition-all flex justify-center items-center gap-2 uppercase tracking-wider text-[10px]">
                      <TrendingDown size={16}/> Saída
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-[#E8D3C8] mb-1.5 uppercase tracking-wider font-bold text-[10px]">Descrição *</label>
                  <input type="text" name="descricao" required placeholder={tipoTransacao === 'entrada' ? "Ex: Alongamento F1" : "Ex: Compra de Esmaltes"} className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F8D1BE] transition-colors"/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#E8D3C8] mb-1.5 uppercase tracking-wider font-bold text-[10px]">Valor (R$) *</label>
                    <input type="number" step="0.01" min="0" name="valor" required placeholder="0.00" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F8D1BE] transition-colors font-mono"/>
                  </div>
                  <div>
                    <label className="block text-[#E8D3C8] mb-1.5 uppercase tracking-wider font-bold text-[10px]">Data *</label>
                    <input type="date" name="data" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F8D1BE] transition-colors color-scheme-dark"/>
                  </div>
                </div>

                <div>
                  <label className="block text-[#E8D3C8] mb-1.5 uppercase tracking-wider font-bold text-[10px]">Categoria</label>
                  <select name="categoria" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F8D1BE] appearance-none transition-colors">
                    {tipoTransacao === 'entrada' ? (
                      <>
                        <option value="Atendimento">Pagamento Final (Atendimento)</option>
                        <option value="Sinal">Recebimento de Sinal (Reserva)</option>
                        <option value="Venda">Venda de Produto Físico</option>
                        <option value="Outros">Outras Entradas</option>
                      </>
                    ) : (
                      <>
                        <option value="Produtos">Produtos / Insumos de Unhas</option>
                        <option value="Marketing">Marketing / Tráfego Pago</option>
                        <option value="Infraestrutura">Infraestrutura / Água / Luz / Aluguel</option>
                        <option value="Repasse Ateliê">Pagamento de Repasse (35% Salão)</option>
                        <option value="Outros">Outras Saídas</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-[#2D0A12] border-t border-[#DCAE96]/20 shrink-0">
                <button type="submit" disabled={isSaving} className={`w-full text-[#120308] px-8 py-3.5 rounded-xl font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg ${tipoTransacao === 'entrada' ? 'bg-emerald-400 hover:bg-emerald-300' : 'bg-red-400 hover:bg-red-300'}`}>
                  {isSaving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Salvar Registro Financeiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(220, 174, 150, 0.3); border-radius: 10px; }
      `}} />
    </div>
  );
}