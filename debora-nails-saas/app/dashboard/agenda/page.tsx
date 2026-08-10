'use client'

import { useState, useEffect } from 'react';
import { CalendarDays, Plus, Clock, User, Sparkles, Loader2, X, CheckCircle2, Settings, UserPlus, Save, Edit } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AgendaPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDisponibilidadeOpen, setIsDisponibilidadeOpen] = useState(false);
  const [detalhesAgendamento, setDetalhesAgendamento] = useState<any>(null);
  
  const [agendamentoEditando, setAgendamentoEditando] = useState<any>(null);
  const [horaModal, setHoraModal] = useState(''); // Estado para pré-preencher a hora ao clicar no slot livre
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [abaCliente, setAbaCliente] = useState<'existente' | 'nova'>('existente');

  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);

  const dataHojeLocal = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const [dataFiltro, setDataFiltro] = useState(dataHojeLocal);

  // Os horários padrão que a Débora atende (Serão os slots de referência)
  const horariosPadrao = ['09:00', '10:30', '13:30', '15:00', '16:30', '18:00'];

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
      .select(`id, inicio, fim, tipo, status_pagamento, clientes ( id, nome, telefone ), servicos ( id, nome, duracao, preco )`)
      .order('inicio', { ascending: true });
      
    if (agendaData) setAgendamentos(agendaData);
    setIsLoading(false);
  };

  const handleCriarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.target as HTMLFormElement);
    let cliente_id = formData.get('cliente_id') as string;
    const horaEscolhida = formData.get('hora') as string;
    
    if (parseInt(horaEscolhida.split(':')[0]) >= 19) {
      if(!window.confirm("Atenção: Este horário ultrapassa o seu expediente normal (19h). Deseja agendar mesmo assim?")) {
        setIsSaving(false); return;
      }
    }

    if (abaCliente === 'nova') {
      const { data: novoClienteData, error: erroCliente } = await supabase.from('clientes')
        .insert([{ nome: formData.get('nome_nova'), telefone: formData.get('telefone_nova'), status: 'Novo' }])
        .select().single();

      if (erroCliente) { 
        alert('Erro ao cadastrar. Verifique se o telefone já existe.'); 
        setIsSaving(false); return; 
      }
      cliente_id = novoClienteData.id;
    }

    const dataInicio = new Date(`${formData.get('data')}T${horaEscolhida}:00-03:00`);
    const dataFim = new Date(dataInicio); 
    dataFim.setHours(dataFim.getHours() + 2); 

    const { error: erroAgenda } = await supabase.from('agendamentos').insert([{
      cliente_id: cliente_id, servico_id: formData.get('servico_id') as string, tipo: 'agendado', status_pagamento: formData.get('status_pagamento') as string, inicio: dataInicio.toISOString(), fim: dataFim.toISOString()
    }]);

    if (erroAgenda) {
      alert('Erro ao agendar horário.');
    } else {
      await fetchDados();
      setIsModalOpen(false);
    }
    setIsSaving(false);
  };

  const handleEditarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.target as HTMLFormElement);

    const novaData = formData.get('data') as string;
    const novaHora = formData.get('hora') as string;
    const dataInicio = new Date(`${novaData}T${novaHora}:00-03:00`);
    const dataFim = new Date(dataInicio); dataFim.setHours(dataFim.getHours() + 2); 

    const { error } = await supabase.from('agendamentos').update({
      inicio: dataInicio.toISOString(), fim: dataFim.toISOString(), status_pagamento: formData.get('status_pagamento') as string
    }).eq('id', agendamentoEditando.id);

    if (error) { alert('Erro ao remarcar horário.'); } 
    else { await fetchDados(); setAgendamentoEditando(null); alert('Horário remarcado com sucesso!'); }
    setIsSaving(false);
  };

  const handleSalvarDisponibilidade = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => { setIsSaving(false); setIsDisponibilidadeOpen(false); alert("Horários de disponibilidade atualizados com sucesso!"); }, 1000);
  };

  const abrirModalNovo = (hora = '') => {
    setHoraModal(hora);
    setIsModalOpen(true);
  };

  // -----------------------------------------------------
  // NOVA INTELIGÊNCIA: MESCLANDO AGENDADOS E SLOTS LIVRES
  // -----------------------------------------------------
  const agendamentosDoDia = agendamentos.filter(a => {
    const d = new Date(a.inicio);
    const localDateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    return localDateStr === dataFiltro;
  });

  const timelineItems: any[] = agendamentosDoDia.map(a => ({ 
    ...a, 
    isLivre: false, 
    horaFormatada: new Date(a.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
  }));

  horariosPadrao.forEach(horaStr => {
    const [h, m] = horaStr.split(':').map(Number);
    const slotMinutos = h * 60 + m;

    const isOcupado = agendamentosDoDia.some(a => {
      const d = new Date(a.inicio);
      const appMinutos = d.getHours() * 60 + d.getMinutes();
      // Considera a vaga ocupada se houver um agendamento começando dentro de uma janela de 60 minutos
      return Math.abs(appMinutos - slotMinutos) < 60;
    });

    if (!isOcupado) {
      timelineItems.push({
        id: `livre-${horaStr}`,
        inicio: new Date(`${dataFiltro}T${horaStr}:00-03:00`).toISOString(),
        isLivre: true,
        horaFormatada: horaStr
      });
    }
  });

  // Ordena a timeline final por horário
  timelineItems.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl text-white mb-2 flex items-center gap-3"><CalendarDays className="text-[#C7977D]" size={28} /> Gestão de Agenda</h1>
          <p className="text-[#E8D3C8]">Controle seus horários, marque novos clientes e preencha as vagas livres.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full sm:w-auto">
          <button onClick={() => setIsDisponibilidadeOpen(true)} className="w-full sm:w-auto bg-[#2D0A12]/80 border border-[#DCAE96]/30 text-[#F8D1BE] px-5 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#DCAE96]/10 transition-colors">
            <Settings size={18} /> Disponibilidade
          </button>
          <button onClick={() => abrirModalNovo('')} className="w-full sm:w-auto bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform">
            <Plus size={20} /> Agendar
          </button>
        </div>
      </div>

      <div className="bg-[#120308]/60 border border-[#DCAE96]/20 p-4 rounded-2xl flex items-center gap-4 mb-8 overflow-x-auto custom-scrollbar">
        <input type="date" value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} className="bg-[#2D0A12] border border-[#DCAE96]/30 text-[#F8D1BE] px-4 py-2 rounded-lg focus:outline-none shrink-0 color-scheme-dark" />
        <div className="h-6 w-px bg-[#DCAE96]/20 shrink-0"></div>
        <button onClick={() => setDataFiltro(dataHojeLocal)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${dataFiltro === dataHojeLocal ? 'bg-[#DCAE96]/20 text-[#F8D1BE] border border-[#DCAE96]/50' : 'text-gray-400 hover:text-white'}`}>Hoje</button>
      </div>

      <div className="bg-[#2D0A12]/40 border border-[#DCAE96]/20 rounded-2xl p-6 md:p-10 shadow-xl min-h-[400px]">
        {isLoading ? (
          <div className="flex justify-center py-20 text-[#C7977D]"><Loader2 className="animate-spin" size={40} /></div>
        ) : (
          <div className="relative border-l-2 border-[#DCAE96]/20 ml-2 md:ml-6 space-y-8 py-4">
            {timelineItems.map(item => {
              
              // RENDERIZADOR DOS ESPAÇOS LIVRES
              if (item.isLivre) {
                return (
                  <div key={item.id} className="relative pl-6 md:pl-10 opacity-70 hover:opacity-100 transition-opacity">
                    <div className="absolute -left-[11px] top-6 w-5 h-5 rounded-full border-[3px] bg-transparent border-dashed border-[#DCAE96]/50"></div>
                    <div 
                      onClick={() => abrirModalNovo(item.horaFormatada)}
                      className="bg-transparent border border-dashed border-[#DCAE96]/40 p-4 md:p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-[#DCAE96]/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center px-5 py-3 bg-black/30 rounded-xl border border-[#DCAE96]/10 group-hover:border-[#DCAE96]/40 transition-colors">
                          <p className="text-xl font-serif text-gray-400 group-hover:text-[#F8D1BE]">{item.horaFormatada}</p>
                        </div>
                        <div>
                          <p className="text-[#DCAE96] font-medium flex items-center gap-2"><Sparkles size={14}/> Horário Livre</p>
                          <p className="text-xs text-gray-500">Clique para adicionar uma cliente</p>
                        </div>
                      </div>
                      <div className="w-full md:w-auto flex justify-end">
                        <button className="text-[#C7977D] hover:text-white bg-black/40 p-3 rounded-full border border-[#DCAE96]/20">
                           <Plus size={18}/>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // RENDERIZADOR DOS AGENDAMENTOS OCUPADOS
              const isEmAndamento = item.tipo === 'em_andamento';
              const isConcluido = item.tipo === 'concluido';

              return (
                <div key={item.id} className="relative pl-6 md:pl-10">
                  <div className={`absolute -left-[11px] top-6 w-5 h-5 rounded-full border-[3px] shadow-[0_0_12px_rgba(199,151,125,0.6)] ${isEmAndamento ? 'bg-emerald-400 border-emerald-900 animate-pulse' : isConcluido ? 'bg-gray-500 border-gray-800' : 'bg-[#120308] border-[#C7977D]'}`}></div>
                  
                  <div className={`bg-[#120308]/80 border p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all group ${isEmAndamento ? 'border-emerald-500/50' : isConcluido ? 'border-gray-800 opacity-60' : 'border-[#DCAE96]/20 hover:border-[#F8D1BE]/40'}`}>
                    
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 w-full md:w-auto">
                      <div className="text-center px-5 py-3 bg-gradient-to-br from-[#2D0A12] to-[#120308] rounded-xl border border-[#DCAE96]/30">
                        <p className={`text-2xl font-serif ${isConcluido ? 'text-gray-500' : 'text-[#F8D1BE]'}`}>{item.horaFormatada}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-bold text-white flex items-center gap-2 break-words">{item.clientes?.nome}</h3>
                          {isEmAndamento && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] uppercase px-2 py-1 rounded whitespace-nowrap shrink-0">Em Atendimento</span>}
                          {isConcluido && <span className="bg-gray-800 text-gray-400 text-[10px] uppercase px-2 py-1 rounded whitespace-nowrap shrink-0">Concluído</span>}
                        </div>
                        <p className="text-[#E8D3C8] text-sm mt-1 flex flex-wrap items-center gap-2">
                          <Sparkles size={14} className="text-[#C7977D] shrink-0"/> <span className="break-words">{item.servicos?.nome}</span> 
                          <span className="text-gray-500 text-xs shrink-0">({item.servicos?.duracao})</span>
                        </p>
                      </div>
                    </div>

                    <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 shrink-0">
                      <button onClick={() => setDetalhesAgendamento(item)} className="w-full sm:w-auto px-6 py-3 border border-[#DCAE96]/30 text-[#E8D3C8] rounded-xl text-sm font-medium hover:bg-[#DCAE96]/10 transition-colors flex justify-center items-center">
                        Detalhes e Edição
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {detalhesAgendamento && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#120308] border border-[#DCAE96]/40 rounded-3xl w-full max-w-sm overflow-hidden shadow-[0_0_40px_rgba(199,151,125,0.2)] animate-in zoom-in-95">
            <div className="bg-[#2D0A12] px-6 py-4 flex justify-between items-center border-b border-[#DCAE96]/20">
              <h2 className="text-xl font-serif text-[#F8D1BE]">Detalhes da Sessão</h2>
              <button onClick={() => setDetalhesAgendamento(null)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-gray-400">Cliente</p>
                <p className="text-lg font-bold text-white flex items-center gap-2 break-words"><User size={16} className="text-[#C7977D] shrink-0"/> {detalhesAgendamento.clientes?.nome}</p>
                <p className="text-sm text-[#E8D3C8] break-words">{detalhesAgendamento.clientes?.telefone}</p>
              </div>
              <div className="border-t border-[#DCAE96]/10 pt-4">
                <p className="text-xs text-gray-400">Serviço</p>
                <p className="text-lg font-bold text-white flex items-center gap-2 break-words"><Sparkles size={16} className="text-[#C7977D] shrink-0"/> {detalhesAgendamento.servicos?.nome}</p>
                <p className="text-sm text-[#E8D3C8]">R$ {detalhesAgendamento.servicos?.preco?.toFixed(2).replace('.', ',')} • {detalhesAgendamento.servicos?.duracao}</p>
              </div>
              <div className="border-t border-[#DCAE96]/10 pt-4 flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-400">Status</p>
                  <span className={`inline-flex mt-1 text-xs px-3 py-1 rounded-full uppercase font-bold whitespace-nowrap ${detalhesAgendamento.tipo === 'em_andamento' ? 'bg-emerald-500/20 text-emerald-400' : detalhesAgendamento.tipo === 'concluido' ? 'bg-gray-800 text-gray-400' : 'bg-[#DCAE96]/20 text-[#F8D1BE]'}`}>
                    {detalhesAgendamento.tipo.replace('_', ' ')}
                  </span>
                </div>
                <div>
                   <p className="text-xs text-gray-400 text-right">Pagamento</p>
                   <span className={`inline-block mt-1 text-xs px-2 py-1 rounded uppercase font-bold ${detalhesAgendamento.status_pagamento === 'pago' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                     {detalhesAgendamento.status_pagamento || 'pendente'}
                   </span>
                </div>
              </div>

              {detalhesAgendamento.tipo === 'agendado' && (
                <div className="pt-4 border-t border-[#DCAE96]/10">
                  <button 
                    onClick={() => {
                      setAgendamentoEditando(detalhesAgendamento);
                      setDetalhesAgendamento(null);
                    }} 
                    className="w-full bg-[#2D0A12] border border-[#DCAE96]/30 text-[#F8D1BE] py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#DCAE96]/10 transition-colors"
                  >
                    <Edit size={16}/> Editar / Remarcar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {agendamentoEditando && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#120308] border border-[#DCAE96]/40 rounded-3xl w-full max-w-sm overflow-hidden shadow-[0_0_40px_rgba(199,151,125,0.2)] animate-in zoom-in-95 duration-300">
            <div className="bg-[#2D0A12] px-6 py-4 flex justify-between items-center border-b border-[#DCAE96]/20">
              <h2 className="text-xl font-serif text-[#F8D1BE] flex items-center gap-2"><Edit size={20}/> Remarcar</h2>
              <button onClick={() => setAgendamentoEditando(null)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleEditarAgendamento}>
              <div className="p-6 space-y-5">
                <p className="text-sm text-gray-300 mb-2">Cliente: <strong className="text-white">{agendamentoEditando.clientes.nome}</strong></p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#E8D3C8] mb-1">Nova Data</label>
                    <input type="date" name="data" defaultValue={new Date(agendamentoEditando.inicio).toISOString().split('T')[0]} required className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F8D1BE] color-scheme-dark"/>
                  </div>
                  <div>
                    <label className="block text-sm text-[#E8D3C8] mb-1">Nova Hora</label>
                    <input type="time" name="hora" defaultValue={new Date(agendamentoEditando.inicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})} required className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F8D1BE] color-scheme-dark"/>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[#E8D3C8] mb-1">Status do Pagamento</label>
                  <select name="status_pagamento" defaultValue={agendamentoEditando.status_pagamento || 'pendente'} className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F8D1BE] appearance-none">
                    <option value="pendente">Pendente (Cobrar no final)</option>
                    <option value="pago">Já foi Pago</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 bg-[#2D0A12] border-t border-[#DCAE96]/20">
                <button type="submit" disabled={isSaving} className="w-full bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-8 py-3 rounded-xl font-bold hover:scale-[1.02] transition-transform flex justify-center items-center gap-2">
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDisponibilidadeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#120308] border border-[#DCAE96]/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_0_40px_rgba(199,151,125,0.2)] animate-in zoom-in-95 duration-300">
            <div className="bg-[#2D0A12] px-6 md:px-8 py-5 flex justify-between items-center border-b border-[#DCAE96]/20">
              <h2 className="text-xl font-serif text-[#F8D1BE] flex items-center gap-2"><Settings size={20}/> Horários</h2>
              <button onClick={() => setIsDisponibilidadeOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleSalvarDisponibilidade}>
              <div className="p-6 md:p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <p className="text-[#E8D3C8] text-sm">Configure seus dias de trabalho e intervalos. O sistema usará essas regras para o autoagendamento da cliente.</p>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-white mb-2 border-b border-[#DCAE96]/20 pb-2">Dias da Semana</label>
                  {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(dia => (
                    <label key={dia} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" defaultChecked={dia !== 'Segunda'} className="w-5 h-5 accent-[#C7977D] bg-[#2D0A12] border-[#DCAE96]/30 rounded cursor-pointer shrink-0" />
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{dia}-feira</span>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-4 border-t border-[#DCAE96]/20">
                  <div>
                    <label className="block text-sm text-[#E8D3C8] mb-1">Início do Expediente</label>
                    <input type="time" defaultValue="09:00" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-lg px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE] color-scheme-dark"/>
                  </div>
                  <div>
                    <label className="block text-sm text-[#E8D3C8] mb-1">Fim do Expediente</label>
                    <input type="time" defaultValue="19:00" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-lg px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE] color-scheme-dark"/>
                  </div>
                </div>
              </div>
              <div className="px-6 md:px-8 py-5 bg-[#2D0A12] border-t border-[#DCAE96]/20">
                <button type="submit" disabled={isSaving} className="w-full bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-8 py-3 rounded-xl font-bold hover:scale-[1.02] transition-transform flex justify-center items-center gap-2">
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20}/> Salvar Disponibilidade</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#120308] border border-[#DCAE96]/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_0_40px_rgba(199,151,125,0.2)] animate-in zoom-in-95 duration-300">
            <div className="bg-[#2D0A12] px-6 py-4 flex justify-between items-center border-b border-[#DCAE96]/20">
              <h2 className="text-xl font-serif text-[#F8D1BE] flex items-center gap-2"><CalendarDays size={20}/> Agendar Horário</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleCriarAgendamento}>
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                
                <div className="flex bg-[#2D0A12] p-1 rounded-xl border border-[#DCAE96]/20">
                  <button type="button" onClick={() => setAbaCliente('existente')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex justify-center items-center gap-2 ${abaCliente === 'existente' ? 'bg-[#DCAE96]/20 text-[#F8D1BE]' : 'text-gray-400 hover:text-gray-200'}`}>
                    <User size={16}/> Cadastrada
                  </button>
                  <button type="button" onClick={() => setAbaCliente('nova')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex justify-center items-center gap-2 ${abaCliente === 'nova' ? 'bg-[#DCAE96]/20 text-[#F8D1BE]' : 'text-gray-400 hover:text-gray-200'}`}>
                    <UserPlus size={16}/> Nova Cliente
                  </button>
                </div>

                {abaCliente === 'existente' ? (
                  <div>
                    <label className="block text-sm text-[#E8D3C8] mb-1">Buscar Cliente *</label>
                    <select name="cliente_id" required className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE] appearance-none">
                      <option value="">Selecione uma cliente...</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome} - {c.telefone}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#2D0A12]/30 p-5 rounded-2xl border border-dashed border-[#DCAE96]/30">
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-sm text-[#E8D3C8] mb-1">Nome da Nova Cliente *</label>
                      <input type="text" name="nome_nova" required placeholder="Ex: Julia Martins" className="w-full bg-[#120308] border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE]"/>
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-sm text-[#E8D3C8] mb-1">WhatsApp *</label>
                      <input type="tel" name="telefone_nova" required placeholder="(47) 99999-9999" className="w-full bg-[#120308] border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE]"/>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-[#E8D3C8] mb-1">Serviço Desejado *</label>
                  <select name="servico_id" required className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE] appearance-none">
                    <option value="">Selecione um serviço...</option>
                    {servicos.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.duracao})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#E8D3C8] mb-1">Data *</label>
                    <input type="date" name="data" defaultValue={dataFiltro} required className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE] color-scheme-dark"/>
                  </div>
                  <div>
                    <label className="block text-sm text-[#E8D3C8] mb-1">Hora *</label>
                    {/* O horário vem pré-preenchido se a Débora clicar no bloco de "Horário Livre" */}
                    <input type="time" name="hora" defaultValue={horaModal} required className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE] color-scheme-dark"/>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#E8D3C8] mb-1">Status Inicial do Pagamento</label>
                  <select name="status_pagamento" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE] appearance-none">
                    <option value="pendente">Pendente (Cobrar no final)</option>
                    <option value="pago">Já foi Pago (Adiantado)</option>
                  </select>
                </div>

              </div>
              <div className="px-6 py-4 bg-[#2D0A12] border-t border-[#DCAE96]/20">
                <button type="submit" disabled={isSaving} className="w-full bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-8 py-3 rounded-xl font-bold hover:scale-[1.02] transition-transform flex justify-center items-center gap-2">
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