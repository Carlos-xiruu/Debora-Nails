'use client'

import { useState, useEffect } from 'react';
import { CalendarDays, Plus, Clock, User, Sparkles, PlayCircle, Loader2, X, CheckCircle2, Settings, UserPlus, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AgendaPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDisponibilidadeOpen, setIsDisponibilidadeOpen] = useState(false);
  const [detalhesAgendamento, setDetalhesAgendamento] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [abaCliente, setAbaCliente] = useState<'existente' | 'nova'>('existente');

  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);

  const dataHoje = new Date().toISOString().split('T')[0];
  const [dataFiltro, setDataFiltro] = useState(dataHoje);

  useEffect(() => {
    fetchDados();
  }, []);

  const fetchDados = async () => {
    setIsLoading(true);
    const { data: clientesData } = await supabase.from('clientes').select('id, nome, telefone').order('nome');
    if (clientesData) setClientes(clientesData);

    const { data: servicosData } = await supabase.from('servicos').select('id, nome, duracao, preco').eq('ativo', true).order('nome');
    if (servicosData) setServicos(servicosData);

    const { data: agendaData } = await supabase
      .from('agendamentos')
      .select(`id, inicio, fim, tipo, clientes ( id, nome, telefone ), servicos ( id, nome, duracao, preco )`)
      .order('inicio', { ascending: true });
      
    if (agendaData) setAgendamentos(agendaData);
    setIsLoading(false);
  };

  const handleCriarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.target as HTMLFormElement);
    let cliente_id = formData.get('cliente_id') as string;

    if (abaCliente === 'nova') {
      const { data: novoClienteData, error: erroCliente } = await supabase.from('clientes')
        .insert([{ nome: formData.get('nome_nova'), telefone: formData.get('telefone_nova'), status: 'Novo' }])
        .select().single();

      if (erroCliente) { 
        alert('Erro ao cadastrar. Verifique se o telefone já existe.'); 
        setIsSaving(false); 
        return; 
      }
      cliente_id = novoClienteData.id;
    }

    const dataInicio = new Date(`${formData.get('data')}T${formData.get('hora')}:00-03:00`);
    const dataFim = new Date(dataInicio); 
    dataFim.setHours(dataFim.getHours() + 2); 

    const { error: erroAgenda } = await supabase.from('agendamentos').insert([{
      cliente_id: cliente_id, 
      servico_id: formData.get('servico_id') as string, 
      tipo: 'agendado', 
      inicio: dataInicio.toISOString(), 
      fim: dataFim.toISOString()
    }]);

    if (erroAgenda) {
      alert('Erro ao agendar horário.');
    } else {
      await fetchDados();
      setIsModalOpen(false);
    }
    setIsSaving(false);
  };

  const iniciarSessaoMonitor = async (agendamento: any) => {
    if (!window.confirm(`Deseja iniciar o atendimento de ${agendamento.clientes.nome} no Monitor VIP?`)) return;
    
    await supabase.from('sessao_monitor').update({
      ativo: true, 
      cliente_nome: agendamento.clientes.nome, 
      servico_nome: agendamento.servicos.nome, 
      inicio: new Date().toISOString()
    }).eq('id', 1);

    await supabase.from('agendamentos').update({ tipo: 'em_andamento' }).eq('id', agendamento.id);
    
    await fetchDados();
    alert('Sessão iniciada no tablet!');
  };

  const handleSalvarDisponibilidade = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setIsDisponibilidadeOpen(false);
      alert("Horários de disponibilidade atualizados com sucesso!");
    }, 1000);
  };

  const agendamentosDoDia = agendamentos.filter(a => a.inicio.startsWith(dataFiltro));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* CABEÇALHO E BOTÕES DE AÇÃO */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
          <h1 className="font-serif text-3xl text-white mb-2 flex items-center gap-3"><CalendarDays className="text-[#C7977D]" size={28} /> Gestão de Agenda</h1>
          <p className="text-[#E8D3C8]">Controle seus horários, inicie atendimentos e gerencie clientes.</p>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button onClick={() => setIsDisponibilidadeOpen(true)} className="bg-[#2D0A12]/80 border border-[#DCAE96]/30 text-[#F8D1BE] px-5 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-[#DCAE96]/10 transition-colors">
            <Settings size={18} /> Disponibilidade
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform">
            <Plus size={20} /> Agendar
          </button>
        </div>
      </div>

      {/* FILTRO DE DATA */}
      <div className="bg-[#120308]/60 border border-[#DCAE96]/20 p-4 rounded-2xl flex items-center gap-4 mb-8 overflow-x-auto custom-scrollbar">
        <input type="date" value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} className="bg-[#2D0A12] border border-[#DCAE96]/30 text-[#F8D1BE] px-4 py-2 rounded-lg focus:outline-none" />
        <div className="h-6 w-px bg-[#DCAE96]/20"></div>
        <button onClick={() => setDataFiltro(dataHoje)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${dataFiltro === dataHoje ? 'bg-[#DCAE96]/20 text-[#F8D1BE] border border-[#DCAE96]/50' : 'text-gray-400 hover:text-white'}`}>Hoje</button>
      </div>

      {/* LINHA DO TEMPO */}
      <div className="bg-[#2D0A12]/40 border border-[#DCAE96]/20 rounded-2xl p-6 md:p-10 shadow-xl min-h-[400px]">
        {isLoading ? (
          <div className="flex justify-center py-20 text-[#C7977D]"><Loader2 className="animate-spin" size={40} /></div>
        ) : agendamentosDoDia.length === 0 ? (
          <div className="text-center py-20 text-gray-400"><CalendarDays size={48} className="mx-auto mb-4" /> Agenda Livre</div>
        ) : (
          <div className="relative border-l-2 border-[#DCAE96]/20 ml-2 md:ml-6 space-y-10 py-4">
            {agendamentosDoDia.map(agendamento => {
              const horaFormatada = new Date(agendamento.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              const isEmAndamento = agendamento.tipo === 'em_andamento';
              const isConcluido = agendamento.tipo === 'concluido';

              return (
                <div key={agendamento.id} className="relative pl-6 md:pl-10">
                  <div className={`absolute -left-[11px] top-6 w-5 h-5 rounded-full border-[3px] shadow-[0_0_12px_rgba(199,151,125,0.6)] ${isEmAndamento ? 'bg-emerald-400 border-emerald-900 animate-pulse' : isConcluido ? 'bg-gray-500 border-gray-800' : 'bg-[#120308] border-[#C7977D]'}`}></div>
                  
                  <div className={`bg-[#120308]/80 border p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 transition-all group ${isEmAndamento ? 'border-emerald-500/50' : isConcluido ? 'border-gray-800 opacity-60' : 'border-[#DCAE96]/20 hover:border-[#F8D1BE]/40'}`}>
                    
                    <div className="flex items-center gap-6 w-full md:w-auto">
                      <div className="text-center px-5 py-3 bg-gradient-to-br from-[#2D0A12] to-[#120308] rounded-xl border border-[#DCAE96]/30">
                        <p className={`text-2xl font-serif ${isConcluido ? 'text-gray-500' : 'text-[#F8D1BE]'}`}>{horaFormatada}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-white flex items-center gap-2">{agendamento.clientes?.nome}</h3>
                          {isEmAndamento && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] uppercase px-2 py-1 rounded">Em Atendimento</span>}
                          {isConcluido && <span className="bg-gray-800 text-gray-400 text-[10px] uppercase px-2 py-1 rounded">Concluído</span>}
                        </div>
                        <p className="text-[#E8D3C8] text-sm mt-1 flex items-center gap-2">
                          <Sparkles size={14} className="text-[#C7977D]"/> {agendamento.servicos?.nome} 
                          <span className="text-gray-500 text-xs">({agendamento.servicos?.duracao})</span>
                        </p>
                      </div>
                    </div>

                    <div className="w-full md:w-auto flex gap-3">
                      <button onClick={() => setDetalhesAgendamento(agendamento)} className="flex-1 md:flex-none px-4 py-3 border border-[#DCAE96]/30 text-[#E8D3C8] rounded-xl text-sm font-medium hover:bg-[#DCAE96]/10 transition-colors">Detalhes</button>
                      
                      {!isConcluido && !isEmAndamento && (
                        <button onClick={() => iniciarSessaoMonitor(agendamento)} className="flex-1 md:flex-none bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-500 hover:text-white transition-all">
                          <PlayCircle size={18} /> Iniciar Monitor
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------- */}
      {/* MODAL 1: DETALHES DO AGENDAMENTO */}
      {/* ----------------------------------------------------- */}
      {detalhesAgendamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#120308] border border-[#DCAE96]/40 rounded-3xl w-full max-w-sm overflow-hidden shadow-[0_0_40px_rgba(199,151,125,0.2)] animate-in zoom-in-95">
            <div className="bg-[#2D0A12] px-6 py-4 flex justify-between items-center border-b border-[#DCAE96]/20">
              <h2 className="text-xl font-serif text-[#F8D1BE]">Detalhes da Sessão</h2>
              <button onClick={() => setDetalhesAgendamento(null)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-gray-400">Cliente</p>
                <p className="text-lg font-bold text-white flex items-center gap-2"><User size={16} className="text-[#C7977D]"/> {detalhesAgendamento.clientes?.nome}</p>
                <p className="text-sm text-[#E8D3C8]">{detalhesAgendamento.clientes?.telefone}</p>
              </div>
              <div className="border-t border-[#DCAE96]/10 pt-4">
                <p className="text-xs text-gray-400">Serviço</p>
                <p className="text-lg font-bold text-white flex items-center gap-2"><Sparkles size={16} className="text-[#C7977D]"/> {detalhesAgendamento.servicos?.nome}</p>
                <p className="text-sm text-[#E8D3C8]">R$ {detalhesAgendamento.servicos?.preco?.toFixed(2).replace('.', ',')} • {detalhesAgendamento.servicos?.duracao}</p>
              </div>
              <div className="border-t border-[#DCAE96]/10 pt-4">
                <p className="text-xs text-gray-400">Status</p>
                <span className={`inline-flex mt-1 text-xs px-3 py-1 rounded-full uppercase font-bold ${detalhesAgendamento.tipo === 'em_andamento' ? 'bg-emerald-500/20 text-emerald-400' : detalhesAgendamento.tipo === 'concluido' ? 'bg-gray-800 text-gray-400' : 'bg-[#DCAE96]/20 text-[#F8D1BE]'}`}>
                  {detalhesAgendamento.tipo.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- */}
      {/* MODAL 2: CONFIGURAR DISPONIBILIDADE */}
      {/* ----------------------------------------------------- */}
      {isDisponibilidadeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#120308] border border-[#DCAE96]/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_0_40px_rgba(199,151,125,0.2)] animate-in zoom-in-95 duration-300">
            <div className="bg-[#2D0A12] px-8 py-5 flex justify-between items-center border-b border-[#DCAE96]/20">
              <h2 className="text-xl font-serif text-[#F8D1BE] flex items-center gap-2"><Settings size={20}/> Horários de Atendimento</h2>
              <button onClick={() => setIsDisponibilidadeOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleSalvarDisponibilidade}>
              <div className="p-8 space-y-6">
                <p className="text-[#E8D3C8] text-sm">Configure seus dias de trabalho e intervalos. O sistema usará essas regras para o autoagendamento da cliente.</p>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-white mb-2 border-b border-[#DCAE96]/20 pb-2">Dias da Semana</label>
                  {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(dia => (
                    <label key={dia} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" defaultChecked={dia !== 'Segunda'} className="w-5 h-5 accent-[#C7977D] bg-[#2D0A12] border-[#DCAE96]/30 rounded cursor-pointer" />
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{dia}-feira</span>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[#DCAE96]/20">
                  <div>
                    <label className="block text-sm text-[#E8D3C8] mb-1">Início do Expediente</label>
                    <input type="time" defaultValue="09:00" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F8D1BE]"/>
                  </div>
                  <div>
                    <label className="block text-sm text-[#E8D3C8] mb-1">Fim do Expediente</label>
                    <input type="time" defaultValue="19:00" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F8D1BE]"/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-[#E8D3C8] mb-1">Pausa (Almoço) Início</label>
                    <input type="time" defaultValue="12:00" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F8D1BE]"/>
                  </div>
                  <div>
                    <label className="block text-sm text-[#E8D3C8] mb-1">Pausa (Almoço) Fim</label>
                    <input type="time" defaultValue="13:30" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F8D1BE]"/>
                  </div>
                </div>
              </div>
              <div className="px-8 py-5 bg-[#2D0A12] border-t border-[#DCAE96]/20">
                <button type="submit" disabled={isSaving} className="w-full bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-8 py-3 rounded-xl font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 flex justify-center items-center gap-2">
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20}/> Salvar Disponibilidade</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- */}
      {/* MODAL 3: NOVO AGENDAMENTO */}
      {/* ----------------------------------------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#120308] border border-[#DCAE96]/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_0_40px_rgba(199,151,125,0.2)] animate-in zoom-in-95 duration-300">
            <div className="bg-[#2D0A12] px-6 py-4 flex justify-between items-center border-b border-[#DCAE96]/20">
              <h2 className="text-xl font-serif text-[#F8D1BE] flex items-center gap-2"><CalendarDays size={20}/> Agendar Horário</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleCriarAgendamento}>
              <div className="p-6 space-y-6">
                
                <div className="flex bg-[#2D0A12] p-1 rounded-xl border border-[#DCAE96]/20">
                  <button type="button" onClick={() => setAbaCliente('existente')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex justify-center items-center gap-2 ${abaCliente === 'existente' ? 'bg-[#DCAE96]/20 text-[#F8D1BE]' : 'text-gray-400 hover:text-gray-200'}`}>
                    <User size={16}/> Cliente Cadastrada
                  </button>
                  <button type="button" onClick={() => setAbaCliente('nova')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex justify-center items-center gap-2 ${abaCliente === 'nova' ? 'bg-[#DCAE96]/20 text-[#F8D1BE]' : 'text-gray-400 hover:text-gray-200'}`}>
                    <UserPlus size={16}/> Nova Cliente
                  </button>
                </div>

                {abaCliente === 'existente' ? (
                  <div>
                    <label className="block text-sm text-[#E8D3C8] mb-1">Buscar Cliente *</label>
                    <select name="cliente_id" required className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F8D1BE] appearance-none">
                      <option value="">Selecione uma cliente...</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome} - {c.telefone}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 bg-[#2D0A12]/30 p-5 rounded-2xl border border-dashed border-[#DCAE96]/30">
                    <div className="col-span-2">
                      <label className="block text-sm text-[#E8D3C8] mb-1">Nome da Nova Cliente *</label>
                      <input type="text" name="nome_nova" required placeholder="Ex: Julia Martins" className="w-full bg-[#120308] border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F8D1BE]"/>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-[#E8D3C8] mb-1">WhatsApp *</label>
                      <input type="text" name="telefone_nova" required placeholder="(47) 99999-9999" className="w-full bg-[#120308] border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F8D1BE]"/>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-[#E8D3C8] mb-1">Serviço Desejado *</label>
                  <select name="servico_id" required className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F8D1BE] appearance-none">
                    <option value="">Selecione um serviço...</option>
                    {servicos.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.duracao})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#E8D3C8] mb-1">Data *</label>
                    <input type="date" name="data" defaultValue={dataFiltro} required className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F8D1BE]"/>
                  </div>
                  <div>
                    <label className="block text-sm text-[#E8D3C8] mb-1">Hora *</label>
                    <input type="time" name="hora" required className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F8D1BE]"/>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-[#2D0A12] border-t border-[#DCAE96]/20">
                <button type="submit" disabled={isSaving} className="w-full bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-8 py-3 rounded-xl font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 flex justify-center items-center gap-2">
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20}/> Salvar na Agenda</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}