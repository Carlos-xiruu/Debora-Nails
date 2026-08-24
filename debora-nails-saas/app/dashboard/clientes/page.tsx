'use client'

import { useState, useEffect } from 'react';
import { Plus, Search, Calendar, ShieldAlert, X, Users, Loader2, Ban, MessageCircle, Clock, Edit2, FileText, Sparkles, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase'; 

export default function ClientesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoricoModalOpen, setIsHistoricoModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busca, setBusca] = useState('');
  const [telefoneInput, setTelefoneInput] = useState('');
  
  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteEditando, setClienteEditando] = useState<any>(null);
  const [historicoCliente, setHistoricoCliente] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Erro ao buscar clientes:', error);
    else if (data) setClientes(data);
    setIsLoading(false);
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value.replace(/\D/g, ''); 
    if (valor.length > 11) valor = valor.slice(0, 11); 
    
    if (valor.length > 2) valor = `(${valor.slice(0, 2)}) ${valor.slice(2)}`;
    if (valor.length > 10) valor = `${valor.slice(0, 10)}-${valor.slice(10)}`;
    
    setTelefoneInput(valor);
  };

  const handleCriarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.target as HTMLFormElement);
    
    const novoCliente = {
      nome: formData.get('nome') as string,
      telefone: telefoneInput,
      comportamento: formData.get('comportamento') as string,
      observacoes: formData.get('observacoes') as string,
      status: 'Novo',
      atendimentos: 0, 
      faltas: 0, 
      bloqueado: false
    };

    const { data, error } = await supabase
      .from('clientes')
      .insert([novoCliente])
      .select();

    if (error) {
      alert('Erro ao cadastrar. Verifique se o telefone já não está registrado no sistema.');
    } else if (data) {
      setClientes([data[0], ...clientes]);
      setIsModalOpen(false);
      setTelefoneInput(''); 
    }
    setIsSaving(false);
  };

  const abrirModalEdicao = (cliente: any) => {
    setClienteEditando(cliente);
    setTelefoneInput(cliente.telefone || '');
    setIsEditModalOpen(true);
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteEditando) return;
    setIsSaving(true);
    const formData = new FormData(e.target as HTMLFormElement);

    const dadosAtualizados = {
      nome: formData.get('nome') as string,
      telefone: telefoneInput,
      comportamento: formData.get('comportamento') as string,
      observacoes: formData.get('observacoes') as string
    };

    const { data, error } = await supabase
      .from('clientes')
      .update(dadosAtualizados)
      .eq('id', clienteEditando.id)
      .select();

    if (!error && data) {
      setClientes(clientes.map(c => c.id === clienteEditando.id ? data[0] : c));
      setIsEditModalOpen(false);
      setClienteEditando(null);
    } else {
      alert('Erro ao atualizar informações da cliente.');
    }
    setIsSaving(false);
  };

  const verHistorico = async (cliente: any) => {
    setClienteEditando(cliente);
    setIsHistoricoModalOpen(true);
    setLoadingHistorico(true);

    const { data } = await supabase
      .from('agendamentos')
      .select(`*, servicos(nome, preco)`)
      .eq('cliente_id', cliente.id)
      .order('inicio', { ascending: false });

    if (data) setHistoricoCliente(data);
    setLoadingHistorico(false);
  };

  const toggleBloqueio = async (id: string, statusAtual: boolean) => {
    if (!window.confirm(statusAtual ? 'Desbloquear esta cliente?' : 'Deseja realmente bloquear esta cliente? Ela não poderá mais agendar online e nem manualmente.')) return;
    
    setClientes(clientes.map(c => c.id === id ? { ...c, bloqueado: !statusAtual } : c));
    await supabase.from('clientes').update({ bloqueado: !statusAtual }).eq('id', id);
  };

  // 🛡️ NOVA FUNÇÃO: MOTOR DE PERDÃO / LIMPAR NOME
  const perdoarCliente = async (clienteId: string) => {
    const confirmar = window.confirm("Tem certeza que deseja perdoar a dívida e zerar as faltas desta cliente?");
    if (!confirmar) return;

    try {
      const response = await fetch('/api/clientes/limpar-historico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteId })
      });

      if (response.ok) {
        alert("✅ Nome limpo com sucesso! A cliente já pode agendar novamente.");
        // Atualiza a tela na mesma hora sem recarregar a página
        setClientes(clientes.map(c => c.id === clienteId ? { ...c, faltas: 0 } : c));
      } else {
        alert("🚨 Erro ao limpar o histórico.");
      }
    } catch (error) {
      console.error("Erro na comunicação com a API:", error);
    }
  };

  const clientesFiltrados = clientes.filter(c => {
    const nomeMatch = c.nome.toLowerCase().includes(busca.toLowerCase());
    const buscaNumeros = busca.replace(/\D/g, '');
    const telNumeros = (c.telefone || '').replace(/\D/g, '');
    const telMatch = buscaNumeros !== '' && telNumeros.includes(buscaNumeros);
    
    return nomeMatch || telMatch || (c.telefone && c.telefone.includes(busca));
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl text-white mb-2 flex items-center gap-3">
            <Users className="text-[#C7977D]" size={28} />
            CRM de Clientes
          </h1>
          <p className="text-[#E8D3C8]">Histórico, comportamentos, segredos VIP e gestão de bloqueios.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou número..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-[#2D0A12]/40 border border-[#DCAE96]/20 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-[#C7977D] transition-colors"
            />
          </div>
          <button 
            onClick={() => { setTelefoneInput(''); setIsModalOpen(true); }}
            className="bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-[0_0_15px_rgba(248,209,190,0.3)] whitespace-nowrap shrink-0"
          >
            <Plus size={20} /> Novo
          </button>
        </div>
      </div>

      {/* LISTA DE CLIENTES */}
      {isLoading ? (
        <div className="flex justify-center py-20 text-[#C7977D]"><Loader2 className="animate-spin" size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientesFiltrados.length === 0 ? (
            <div className="col-span-full py-16 text-center text-gray-400 border border-dashed border-[#DCAE96]/20 rounded-xl bg-[#2D0A12]/20">
              {busca ? 'Nenhuma cliente encontrada com essa busca.' : 'Sua carteira está vazia. Cadastre sua primeira cliente!'}
            </div>
          ) : (
            clientesFiltrados.map(cliente => (
              <div key={cliente.id} className={`bg-[#120308]/60 backdrop-blur-md border p-6 rounded-2xl shadow-lg transition-all flex flex-col ${cliente.bloqueado ? 'border-red-900/50 opacity-75' : 'border-[#DCAE96]/20 hover:border-[#DCAE96]/40'}`}>
                
                <div className="flex justify-between items-start gap-3 mb-4">
                  <div className="min-w-0 flex-1">
                    <h3 className={`text-xl font-serif leading-tight break-words ${cliente.bloqueado ? 'text-red-400 line-through' : 'text-white'}`}>
                      {cliente.nome}
                    </h3>
                    <p className="text-[#E8D3C8] text-sm mt-1 font-mono">{cliente.telefone}</p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {!cliente.bloqueado && cliente.faltas >= 2 && (
                      <span className="bg-orange-500/20 text-orange-400 border border-orange-500/50 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider whitespace-nowrap">Atenção</span>
                    )}
                    {!cliente.bloqueado && cliente.atendimentos >= 10 && (
                      <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider whitespace-nowrap flex items-center gap-1"><Sparkles size={10}/> VIP</span>
                    )}
                    {cliente.bloqueado && (
                      <span className="bg-red-500/20 text-red-400 border border-red-500/50 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider whitespace-nowrap">Bloqueada</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-[#2D0A12]/40 border border-[#DCAE96]/10 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wider font-bold">Concluídos</p>
                    <p className="text-emerald-400 font-bold flex items-center gap-2"><Calendar size={14}/> {cliente.atendimentos}</p>
                  </div>
                  <div className="bg-[#2D0A12]/40 border border-[#DCAE96]/10 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wider font-bold">Faltas/Canc.</p>
                    <p className="text-red-400 font-bold flex items-center gap-2"><ShieldAlert size={14}/> {cliente.faltas}</p>
                  </div>
                </div>

                {/* OBSERVAÇÕES / SEGREDO DA CLIENTE */}
                <div className="space-y-2 mb-6 flex-1">
                  <span className="inline-flex items-start gap-1.5 bg-indigo-900/30 text-indigo-300 border border-indigo-500/30 text-xs px-3 py-1.5 rounded-lg whitespace-normal break-words w-full">
                    <MessageCircle size={14} className="shrink-0 mt-0.5"/> {cliente.comportamento || 'Perfil não definido'}
                  </span>
                  
                  {cliente.observacoes && (
                    <div className="bg-[#2D0A12]/60 border border-[#C7977D]/30 p-2.5 rounded-lg text-xs text-[#E8D3C8] flex items-start gap-2">
                      <FileText size={14} className="text-[#C7977D] shrink-0 mt-0.5" />
                      <p className="italic">{cliente.observacoes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-[#DCAE96]/10 mt-auto">
                  <button onClick={() => verHistorico(cliente)} className="flex-1 bg-transparent border border-[#DCAE96]/30 text-[#E8D3C8] hover:bg-[#DCAE96]/10 py-2.5 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <Clock size={14}/> Histórico
                  </button>
                  <button onClick={() => abrirModalEdicao(cliente)} className="p-2.5 bg-[#DCAE96]/10 text-[#F8D1BE] border border-[#DCAE96]/30 hover:bg-[#DCAE96]/20 rounded-lg transition-colors" title="Editar Perfil / Observações">
                    <Edit2 size={16} />
                  </button>

                  {/* 🛡️ NOVO BOTÃO: Perdoar Dívida (Só aparece se tiver faltas) */}
                  {!cliente.bloqueado && cliente.faltas > 0 && (
                    <button 
                      onClick={() => perdoarCliente(cliente.id)}
                      className="p-2.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center justify-center shrink-0"
                      title="Perdoar Dívida / Limpar Faltas"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}

                  <button 
                    onClick={() => toggleBloqueio(cliente.id, cliente.bloqueado)}
                    className={`p-2.5 rounded-lg border transition-colors flex items-center justify-center shrink-0 ${cliente.bloqueado ? 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30' : 'bg-transparent text-gray-500 border-[#DCAE96]/30 hover:border-red-500/50 hover:text-red-500 hover:bg-red-500/10'}`}
                    title={cliente.bloqueado ? "Desbloquear" : "Bloquear Cliente"}
                  >
                    <Ban size={16} />
                  </button>
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL: CADASTRAR CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#120308] border border-[#DCAE96]/40 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_40px_rgba(199,151,125,0.2)] animate-in zoom-in-95 duration-300 max-h-[90dvh] flex flex-col">
            <div className="bg-[#2D0A12] px-6 py-4 flex justify-between items-center border-b border-[#DCAE96]/20 shrink-0">
              <h2 className="text-xl font-serif text-[#F8D1BE] flex items-center gap-2"><Users size={20}/> Cadastrar Cliente</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleCriarCliente} className="flex flex-col overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                <div>
                  <label className="block text-xs text-[#E8D3C8] mb-1.5 uppercase font-bold tracking-wider">Nome Completo *</label>
                  <input type="text" name="nome" required placeholder="Ex: Amanda Silveira" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#F8D1BE] transition-colors"/>
                </div>
                <div>
                  <label className="block text-xs text-[#E8D3C8] mb-1.5 uppercase font-bold tracking-wider">WhatsApp *</label>
                  <input 
                    type="tel" 
                    name="telefone_visual" 
                    value={telefoneInput}
                    onChange={handleTelefoneChange}
                    required 
                    placeholder="(47) 99999-9999" 
                    className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-lg px-4 py-3 text-white font-mono placeholder-gray-500 focus:outline-none focus:border-[#F8D1BE] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#E8D3C8] mb-1.5 uppercase font-bold tracking-wider">Perfil de Atendimento</label>
                  <select name="comportamento" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F8D1BE] appearance-none transition-colors">
                    <option value="Silenciosa (Gosta de relaxar)">Silenciosa (Gosta de relaxar)</option>
                    <option value="Comunicativa (Gosta de conversar)">Comunicativa (Gosta de conversar)</option>
                    <option value="Indecisa (Precisa de ajuda)">Indecisa (Precisa de ajuda para escolher)</option>
                    <option value="Apressada (Foco no tempo)">Apressada (Foco no tempo)</option>
                    <option value="Não definido">Não definido ainda</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#E8D3C8] mb-1.5 uppercase font-bold tracking-wider">Observações / Segredos da Cliente</label>
                  <textarea name="observacoes" rows={3} placeholder="Ex: Café sem açúcar, cutícula sensível, prefere tons nude..." className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F8D1BE] resize-none transition-colors" />
                </div>
              </div>
              
              <div className="px-6 py-4 bg-[#2D0A12] border-t border-[#DCAE96]/20 shrink-0">
                <button type="submit" disabled={isSaving} className="w-full bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-8 py-3.5 rounded-xl font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 flex justify-center items-center gap-2">
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR CLIENTE */}
      {isEditModalOpen && clienteEditando && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#120308] border border-[#DCAE96]/40 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_40px_rgba(199,151,125,0.2)] animate-in zoom-in-95 duration-300 max-h-[90dvh] flex flex-col">
            <div className="bg-[#2D0A12] px-6 py-4 flex justify-between items-center border-b border-[#DCAE96]/20 shrink-0">
              <h2 className="text-xl font-serif text-[#F8D1BE] flex items-center gap-2"><Edit2 size={20}/> Editar Perfil VIP</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSalvarEdicao} className="flex flex-col overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                <div>
                  <label className="block text-xs text-[#E8D3C8] mb-1.5 uppercase font-bold tracking-wider">Nome Completo *</label>
                  <input type="text" name="nome" defaultValue={clienteEditando.nome} required className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F8D1BE] transition-colors"/>
                </div>
                <div>
                  <label className="block text-xs text-[#E8D3C8] mb-1.5 uppercase font-bold tracking-wider">WhatsApp *</label>
                  <input 
                    type="tel" 
                    value={telefoneInput}
                    onChange={handleTelefoneChange}
                    required 
                    className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-[#F8D1BE] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#E8D3C8] mb-1.5 uppercase font-bold tracking-wider">Perfil de Atendimento</label>
                  <select name="comportamento" defaultValue={clienteEditando.comportamento} className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F8D1BE] appearance-none transition-colors">
                    <option value="Silenciosa (Gosta de relaxar)">Silenciosa (Gosta de relaxar)</option>
                    <option value="Comunicativa (Gosta de conversar)">Comunicativa (Gosta de conversar)</option>
                    <option value="Indecisa (Precisa de ajuda)">Indecisa (Precisa de ajuda para escolher)</option>
                    <option value="Apressada (Foco no tempo)">Apressada (Foco no tempo)</option>
                    <option value="Não definido">Não definido ainda</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#E8D3C8] mb-1.5 uppercase font-bold tracking-wider">Observações / Segredos da Cliente</label>
                  <textarea name="observacoes" defaultValue={clienteEditando.observacoes} rows={3} placeholder="Ex: Café sem açúcar, cutícula sensível, prefere tons nude..." className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F8D1BE] resize-none transition-colors" />
                </div>
              </div>
              
              <div className="px-6 py-4 bg-[#2D0A12] border-t border-[#DCAE96]/20 shrink-0">
                <button type="submit" disabled={isSaving} className="w-full bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-8 py-3.5 rounded-xl font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 flex justify-center items-center gap-2">
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HISTÓRICO DE ATENDIMENTOS */}
      {isHistoricoModalOpen && clienteEditando && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#120308] border border-[#DCAE96]/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_0_40px_rgba(199,151,125,0.2)] animate-in zoom-in-95 duration-300 max-h-[85dvh] flex flex-col">
            <div className="bg-[#2D0A12] px-6 py-4 flex justify-between items-center border-b border-[#DCAE96]/20 shrink-0">
              <div>
                <h2 className="text-lg font-serif text-[#F8D1BE]">{clienteEditando.nome}</h2>
                <p className="text-xs text-gray-400 font-mono">{clienteEditando.telefone}</p>
              </div>
              <button onClick={() => setIsHistoricoModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3">
              {loadingHistorico ? (
                <div className="flex justify-center py-10 text-[#C7977D]"><Loader2 className="animate-spin" size={32} /></div>
              ) : historicoCliente.length === 0 ? (
                <p className="text-center text-gray-500 py-8 text-sm">Nenhum atendimento registrado no histórico desta cliente.</p>
              ) : (
                historicoCliente.map((ag) => (
                  <div key={ag.id} className="bg-[#2D0A12]/40 border border-[#DCAE96]/10 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium text-sm">{ag.servicos?.nome || 'Atendimento'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(ag.inicio).toLocaleDateString('pt-BR')} às {new Date(ag.inicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</p>
                    </div>
                    <span className="text-[#F8D1BE] font-bold text-sm">R$ {ag.servicos?.preco ? Number(ag.servicos.preco).toFixed(2).replace('.', ',') : '0,00'}</span>
                  </div>
                ))
              )}
            </div>
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