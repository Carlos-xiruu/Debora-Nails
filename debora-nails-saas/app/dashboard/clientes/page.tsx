'use client'

import { useState, useEffect } from 'react';
import { Plus, Search, Calendar, ShieldAlert, X, Users, Loader2, Ban, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ClientesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busca, setBusca] = useState('');
  
  // Lista de clientes que virá do Supabase
  const [clientes, setClientes] = useState<any[]>([]);

  // Carrega do banco de dados quando a página abre
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

  // Salva no banco de dados
  const handleCriarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.target as HTMLFormElement);
    
    const novoCliente = {
      nome: formData.get('nome') as string,
      telefone: formData.get('telefone') as string,
      comportamento: formData.get('comportamento') as string,
      status: 'Novo',
      atendimentos: 0, // Inicia zerado no banco
      faltas: 0, // Inicia zerado no banco
      bloqueado: false
    };

    const { data, error } = await supabase
      .from('clientes')
      .insert([novoCliente])
      .select();

    if (error) {
      alert('Erro ao cadastrar. Verifique se o telefone já não está registrado.');
    } else if (data) {
      setClientes([data[0], ...clientes]);
      setIsModalOpen(false);
    }
    setIsSaving(false);
  };

  // Bloqueia/Desbloqueia cliente no banco de dados
  const toggleBloqueio = async (id: string, statusAtual: boolean) => {
    if (!window.confirm(statusAtual ? 'Desbloquear esta cliente?' : 'Deseja realmente bloquear esta cliente? Ela não poderá mais agendar.')) return;
    
    // Atualiza a tela instantaneamente
    setClientes(clientes.map(c => c.id === id ? { ...c, bloqueado: !statusAtual } : c));
    
    // Envia o bloqueio para o Supabase
    await supabase.from('clientes').update({ bloqueado: !statusAtual }).eq('id', id);
  };

  // Filtro da barra de busca
  const clientesFiltrados = clientes.filter(c => 
    c.nome.toLowerCase().includes(busca.toLowerCase()) || 
    c.telefone.includes(busca)
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* CABEÇALHO (Igual ao seu print, com o botão Novo) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl text-white mb-2 flex items-center gap-3">
            <Users className="text-[#C7977D]" size={28} />
            CRM de Clientes
          </h1>
          <p className="text-[#E8D3C8]">Histórico, comportamentos e gestão de bloqueios.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-[#2D0A12]/40 border border-[#DCAE96]/20 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-[#C7977D]"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-[0_0_15px_rgba(248,209,190,0.3)] whitespace-nowrap shrink-0"
          >
            <Plus size={20} /> Novo
          </button>
        </div>
      </div>

      {/* LISTA DE CLIENTES DO BANCO DE DADOS */}
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
              <div key={cliente.id} className={`bg-[#120308]/60 backdrop-blur-md border p-6 rounded-2xl shadow-lg transition-all ${cliente.bloqueado ? 'border-red-900/50 opacity-75' : 'border-[#DCAE96]/20'}`}>
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className={`text-xl font-serif leading-tight ${cliente.bloqueado ? 'text-red-400 line-through' : 'text-white'}`}>
                      {cliente.nome}
                    </h3>
                    <p className="text-[#E8D3C8] text-sm mt-1">{cliente.telefone}</p>
                  </div>
                  
                  {/* Selos Dinâmicos: Atenção, VIP, Bloqueada */}
                  {!cliente.bloqueado && cliente.faltas >= 2 && (
                    <span className="bg-orange-500/20 text-orange-400 border border-orange-500/50 text-xs px-2 py-1 rounded-md font-medium">Atenção</span>
                  )}
                  {!cliente.bloqueado && cliente.atendimentos >= 10 && (
                    <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 text-xs px-2 py-1 rounded-md font-medium">VIP</span>
                  )}
                  {cliente.bloqueado && (
                    <span className="bg-red-500/20 text-red-400 border border-red-500/50 text-xs px-2 py-1 rounded-md font-medium">Bloqueada</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-[#2D0A12]/40 border border-[#DCAE96]/10 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Concluídos</p>
                    <p className="text-emerald-400 font-bold flex items-center gap-2"><Calendar size={14}/> {cliente.atendimentos}</p>
                  </div>
                  <div className="bg-[#2D0A12]/40 border border-[#DCAE96]/10 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Faltas/Canc.</p>
                    <p className="text-red-400 font-bold flex items-center gap-2"><ShieldAlert size={14}/> {cliente.faltas}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-xs text-gray-400 mb-2">Perfil de Atendimento:</p>
                  <span className="inline-flex items-center gap-1.5 bg-indigo-900/30 text-indigo-300 border border-indigo-500/30 text-xs px-3 py-1.5 rounded-lg">
                    <MessageCircle size={14}/> {cliente.comportamento}
                  </span>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 bg-transparent border border-[#DCAE96]/30 text-[#E8D3C8] hover:bg-[#DCAE96]/10 py-2.5 rounded-lg transition-colors text-sm font-medium">
                    Ver Histórico
                  </button>
                  <button 
                    onClick={() => toggleBloqueio(cliente.id, cliente.bloqueado)}
                    className={`p-2.5 rounded-lg border transition-colors flex items-center justify-center ${cliente.bloqueado ? 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30' : 'bg-transparent text-gray-500 border-[#DCAE96]/30 hover:border-red-500/50 hover:text-red-500'}`}
                    title={cliente.bloqueado ? "Desbloquear" : "Bloquear Cliente"}
                  >
                    <Ban size={18} />
                  </button>
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL: CADASTRAR CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#120308] border border-[#DCAE96]/40 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_40px_rgba(199,151,125,0.2)] animate-in zoom-in-95 duration-300">
            <div className="bg-[#2D0A12] px-6 py-4 flex justify-between items-center border-b border-[#DCAE96]/20">
              <h2 className="text-xl font-serif text-[#F8D1BE] flex items-center gap-2"><Users size={20}/> Cadastrar Cliente</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleCriarCliente}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-[#E8D3C8] mb-1">Nome Completo *</label>
                  <input type="text" name="nome" required placeholder="Ex: Amanda Silveira" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#F8D1BE]"/>
                </div>
                <div>
                  <label className="block text-sm text-[#E8D3C8] mb-1">WhatsApp *</label>
                  <input type="tel" name="telefone" required placeholder="(47) 99999-9999" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#F8D1BE]"/>
                </div>
                <div>
                  <label className="block text-sm text-[#E8D3C8] mb-1">Perfil de Atendimento</label>
                  <select name="comportamento" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F8D1BE] appearance-none">
                    <option value="Silenciosa">Silenciosa (Gosta de relaxar)</option>
                    <option value="Comunicativa">Comunicativa (Gosta de conversar)</option>
                    <option value="Indecisa">Indecisa (Precisa de ajuda para escolher)</option>
                    <option value="Apressada">Apressada (Foco no tempo)</option>
                    <option value="Não definido">Não definido ainda</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 bg-[#2D0A12] border-t border-[#DCAE96]/20">
                <button type="submit" disabled={isSaving} className="w-full bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-8 py-3 rounded-lg font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 flex justify-center items-center gap-2">
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}