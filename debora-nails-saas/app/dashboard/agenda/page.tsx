'use client'

import { useState, useEffect } from 'react';
import { CalendarDays, Plus, Clock, User, Sparkles, Loader2, X, CheckCircle2, Settings, UserPlus, Save, Edit, Ban, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const DISPONIBILIDADE_PADRAO = {
  0: { ativo: false, abertura: '08:00', fechamento: '12:00' },
  1: { ativo: true, abertura: '08:00', fechamento: '18:00' },
  2: { ativo: true, abertura: '09:00', fechamento: '19:00' },
  3: { ativo: true, abertura: '08:00', fechamento: '17:00' },
  4: { ativo: true, abertura: '10:00', fechamento: '20:00' },
  5: { ativo: true, abertura: '08:00', fechamento: '18:00' },
  6: { ativo: true, abertura: '08:00', fechamento: '13:00' }
};

export default function AgendaPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDisponibilidadeOpen, setIsDisponibilidadeOpen] = useState(false);
  const [detalhesAgendamento, setDetalhesAgendamento] = useState<any>(null);
  const [agendamentoEditando, setAgendamentoEditando] = useState<any>(null);
  const [horaModal, setHoraModal] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [abaCliente, setAbaCliente] = useState<'existente' | 'nova'>('existente');
  const [abaConfig, setAbaConfig] = useState<'horarios' | 'bloqueios'>('horarios');

  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [configuracoes, setConfiguracoes] = useState<any>({ disponibilidade: DISPONIBILIDADE_PADRAO, bloqueios: [] });

  const dataHojeLocal = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const [dataFiltro, setDataFiltro] = useState(dataHojeLocal);

  useEffect(() => {
    fetchDados();
  }, []);

  const fetchDados = async () => {
    setIsLoading(true);
    
    const { data: configData, error: configError } = await supabase.from('configuracoes').select('*').eq('id', 1).single();
    if (configData) {
      setConfiguracoes({
        disponibilidade: Object.keys(configData.disponibilidade).length > 0 ? configData.disponibilidade : DISPONIBILIDADE_PADRAO,
        bloqueios: configData.bloqueios || []
      });
    }

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

  const converterParaMinutos = (horaStr: string) => {
    if (!horaStr) return 0;
    const [h, m] = horaStr.split(':').map(Number);
    return h * 60 + m;
  };

  const converterParaHoraStr = (minutos: number) => {
    const h = Math.floor(minutos / 60).toString().padStart(2, '0');
    const m = (minutos % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  // NOVA MATEMÁTICA À PROVA DE BALAS PARA EXTRAIR OS MINUTOS ("40m", "1h", "1h 30m")
  const extrairMinutosDuracao = (duracaoStr: string) => {
    if (!duracaoStr) return 60;
    let total = 0;
    const str = duracaoStr.toLowerCase().trim();
    
    const horasMatch = str.match(/(\d+)\s*h/);
    if (horasMatch) total += parseInt(horasMatch[1]) * 60;
    
    const minMatch = str.match(/(\d+)\s*m/);
    if (minMatch) total += parseInt(minMatch[1]);
    
    return total > 0 ? total : 60;
  };

  const agendamentosDoDia = agendamentos.filter(a => new Date(a.inicio).toISOString().split('T')[0] === dataFiltro);
  const bloqueiosDoDia = configuracoes.bloqueios.filter((b: any) => b.data === dataFiltro);

  const diaDaSemanaIndex = new Date(dataFiltro + "T00:00:00").getDay();
  const regraDoDia = configuracoes.disponibilidade[diaDaSemanaIndex];

  const timelineItems: any[] = [];
  
  if (regraDoDia?.ativo) {
    const aberturaMin = converterParaMinutos(regraDoDia.abertura);
    const fechamentoMin = converterParaMinutos(regraDoDia.fechamento);
    const passoIntervalo = 30; // Verifica vagas de 30 em 30 min.

    for (let minutoAtual = aberturaMin; minutoAtual < fechamentoMin; minutoAtual += passoIntervalo) {
      const horaCheck = converterParaHoraStr(minutoAtual);
      
      const ocupadoPorAgendamento = agendamentosDoDia.find(a => {
        const dInicio = new Date(a.inicio);
        const dFim = new Date(a.fim);
        const minInicio = dInicio.getHours() * 60 + dInicio.getMinutes();
        const minFim = dFim.getHours() * 60 + dFim.getMinutes();
        return minutoAtual >= minInicio && minutoAtual < minFim;
      });

      const ocupadoPorBloqueio = bloqueiosDoDia.find((b: any) => {
        const minInicio = converterParaMinutos(b.inicio);
        const minFim = converterParaMinutos(b.fim);
        return minutoAtual >= minInicio && minutoAtual < minFim;
      });

      if (!ocupadoPorAgendamento && !ocupadoPorBloqueio) {
        timelineItems.push({
          id: `livre-${horaCheck}`,
          inicio: new Date(`${dataFiltro}T${horaCheck}:00-03:00`).toISOString(),
          isLivre: true,
          horaFormatada: horaCheck
        });
      }
    }
  }

  agendamentosDoDia.forEach(a => {
    timelineItems.push({ ...a, isLivre: false, isBloqueio: false, horaFormatada: new Date(a.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) });
  });

  bloqueiosDoDia.forEach((b: any) => {
    timelineItems.push({
      id: `bloqueio-${b.inicio}`,
      inicio: new Date(`${dataFiltro}T${b.inicio}:00-03:00`).toISOString(),
      isLivre: false,
      isBloqueio: true,
      motivo: b.motivo,
      horaFormatada: b.inicio,
      fimFormatado: b.fim
    });
  });

  timelineItems.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

  const timelineFiltrada = timelineItems.filter((item, index, array) => {
    if (!item.isLivre) return true;
    const anterior = array[index - 1];
    if (anterior && !anterior.isLivre && new Date(anterior.fim || `${dataFiltro}T${anterior.fimFormatado}:00-03:00`).getTime() > new Date(item.inicio).getTime()) return false;
    return true;
  });

  const handleCriarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.target as HTMLFormElement);
    
    const horaEscolhida = formData.get('hora') as string;
    const servicoId = formData.get('servico_id') as string;
    const servicoInfo = servicos.find(s => s.id === servicoId);
    
    const duracaoMins = extrairMinutosDuracao(servicoInfo?.duracao);
    const fechamentoMin = converterParaMinutos(regraDoDia.fechamento);
    const fimAtendimentoMin = converterParaMinutos(horaEscolhida) + duracaoMins;

    if (fimAtendimentoMin > fechamentoMin) {
      alert(`Erro: O serviço demora ${servicoInfo.duracao}. Se começar às ${horaEscolhida}, passará do horário de fechamento (${regraDoDia.fechamento}).`);
      setIsSaving(false); return;
    }

    let cliente_id = formData.get('cliente_id') as string;

    if (abaCliente === 'nova') {
      const { data: novoClienteData, error: erroCliente } = await supabase.from('clientes')
        .insert([{ nome: formData.get('nome_nova'), telefone: formData.get('telefone_nova'), status: 'Novo' }])
        .select().single();

      if (erroCliente) { alert(`ERRO REAL (Banco): Não foi possível criar cliente. ${erroCliente.message}`); setIsSaving(false); return; }
      cliente_id = novoClienteData.id;
    }

    const dataInicio = new Date(`${formData.get('data')}T${horaEscolhida}:00-03:00`);
    const dataFim = new Date(dataInicio); 
    dataFim.setMinutes(dataFim.getMinutes() + duracaoMins); 

    const { error: erroAgenda } = await supabase.from('agendamentos').insert([{
      cliente_id: cliente_id, servico_id: servicoId, tipo: 'agendado', status_pagamento: formData.get('status_pagamento') as string, inicio: dataInicio.toISOString(), fim: dataFim.toISOString()
    }]);

    if (erroAgenda) { alert(`ERRO REAL (Banco): Falha ao agendar. ${erroAgenda.message}`); } 
    else { await fetchDados(); setIsModalOpen(false); }
    setIsSaving(false);
  };

  const handleEditarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.target as HTMLFormElement);

    const novaData = formData.get('data') as string;
    const novaHora = formData.get('hora') as string;
    const duracaoMins = extrairMinutosDuracao(agendamentoEditando.servicos.duracao);
    
    const dataInicio = new Date(`${novaData}T${novaHora}:00-03:00`);
    const dataFim = new Date(dataInicio); 
    dataFim.setMinutes(dataFim.getMinutes() + duracaoMins); 

    const { error } = await supabase.from('agendamentos').update({
      inicio: dataInicio.toISOString(), fim: dataFim.toISOString(), status_pagamento: formData.get('status_pagamento') as string
    }).eq('id', agendamentoEditando.id);

    if (error) { alert(`ERRO REAL: ${error.message}`); } 
    else { await fetchDados(); setAgendamentoEditando(null); alert('Horário remarcado com sucesso!'); }
    setIsSaving(false);
  };

  const handleSalvarDisponibilidade = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const { error } = await supabase.from('configuracoes').upsert({
      id: 1,
      disponibilidade: configuracoes.disponibilidade,
      bloqueios: configuracoes.bloqueios
    });

    if (error) {
      alert(`ERRO REAL (Banco): Não foi possível salvar as configurações. Detalhe: ${error.message}`);
    } else {
      alert("Configurações salvas e aplicadas em tempo real!");
      setIsDisponibilidadeOpen(false);
      fetchDados(); 
    }
    setIsSaving(false);
  };

  const adicionarBloqueio = () => {
    const dataBloqueio = (document.getElementById('bloqueio_data') as HTMLInputElement).value;
    const inicioBloqueio = (document.getElementById('bloqueio_inicio') as HTMLInputElement).value;
    const fimBloqueio = (document.getElementById('bloqueio_fim') as HTMLInputElement).value;
    const motivoBloqueio = (document.getElementById('bloqueio_motivo') as HTMLInputElement).value;

    if (!dataBloqueio || !inicioBloqueio || !fimBloqueio) {
      alert("Preencha data, início e fim para bloquear o horário."); return;
    }

    const novosBloqueios = [...configuracoes.bloqueios, { id: Date.now(), data: dataBloqueio, inicio: inicioBloqueio, fim: fimBloqueio, motivo: motivoBloqueio || 'Bloqueado' }];
    setConfiguracoes({ ...configuracoes, bloqueios: novosBloqueios });
  };

  const removerBloqueio = (id: number) => {
    setConfiguracoes({ ...configuracoes, bloqueios: configuracoes.bloqueios.filter((b: any) => b.id !== id) });
  };

  const atualizarDia = (index: number, campo: string, valor: any) => {
    const novaDisp = { ...configuracoes.disponibilidade };
    novaDisp[index] = { ...novaDisp[index], [campo]: valor };
    setConfiguracoes({ ...configuracoes, disponibilidade: novaDisp });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl text-white mb-2 flex items-center gap-3"><CalendarDays className="text-[#C7977D]" size={28} /> Gestão de Agenda</h1>
          <p className="text-[#E8D3C8]">Controle seus horários, marque novos clientes e preencha as vagas livres.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full sm:w-auto">
          <button onClick={() => setIsDisponibilidadeOpen(true)} className="w-full sm:w-auto bg-[#2D0A12]/80 border border-[#DCAE96]/30 text-[#F8D1BE] px-5 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#DCAE96]/10 transition-colors">
            <Settings size={18} /> Disp. e Bloqueios
          </button>
          <button onClick={() => {setHoraModal(''); setIsModalOpen(true);}} className="w-full sm:w-auto bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform">
            <Plus size={20} /> Agendar Manual
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
        ) : !regraDoDia?.ativo ? (
          <div className="text-center py-20 text-red-400"><Ban size={48} className="mx-auto mb-4 opacity-50" /> Agenda fechada neste dia da semana.</div>
        ) : timelineFiltrada.length === 0 ? (
          <div className="text-center py-20 text-gray-400"><CalendarDays size={48} className="mx-auto mb-4 opacity-50" /> Agenda Livre</div>
        ) : (
          <div className="relative border-l-2 border-[#DCAE96]/20 ml-2 md:ml-6 space-y-8 py-4">
            {timelineFiltrada.map(item => {
              
              if (item.isBloqueio) {
                return (
                  <div key={item.id} className="relative pl-6 md:pl-10 opacity-80">
                    <div className="absolute -left-[11px] top-6 w-5 h-5 rounded-full border-[3px] bg-[#120308] border-red-500/50"></div>
                    <div className="bg-red-500/5 border border-red-500/20 p-4 md:p-5 rounded-2xl flex items-center gap-4">
                      <div className="text-center px-4 py-2 bg-red-900/30 rounded-xl border border-red-500/20 text-red-400 font-serif">
                        {item.horaFormatada} - {item.fimFormatado}
                      </div>
                      <div>
                        <p className="text-red-400 font-bold flex items-center gap-2"><Ban size={14}/> {item.motivo}</p>
                        <p className="text-xs text-gray-500">Bloqueio Manual</p>
                      </div>
                    </div>
                  </div>
                );
              }

              if (item.isLivre) {
                return (
                  <div key={item.id} className="relative pl-6 md:pl-10 opacity-70 hover:opacity-100 transition-opacity">
                    <div className="absolute -left-[11px] top-6 w-5 h-5 rounded-full border-[3px] bg-transparent border-dashed border-[#DCAE96]/50"></div>
                    <div onClick={() => {setHoraModal(item.horaFormatada); setIsModalOpen(true);}} className="bg-transparent border border-dashed border-[#DCAE96]/40 p-4 md:p-5 rounded-2xl flex items-center justify-between hover:bg-[#DCAE96]/5 cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="text-center px-5 py-3 bg-black/30 rounded-xl border border-[#DCAE96]/10 text-gray-400 font-serif text-xl">{item.horaFormatada}</div>
                        <div>
                          <p className="text-[#DCAE96] font-medium flex items-center gap-2"><Sparkles size={14}/> Horário Livre</p>
                        </div>
                      </div>
                      <button className="text-[#C7977D] hover:text-white bg-black/40 p-3 rounded-full border border-[#DCAE96]/20"><Plus size={18}/></button>
                    </div>
                  </div>
                );
              }

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
                          {isEmAndamento && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] uppercase px-2 py-1 rounded shrink-0">Em Atendimento</span>}
                          {isConcluido && <span className="bg-gray-800 text-gray-400 text-[10px] uppercase px-2 py-1 rounded shrink-0">Concluído</span>}
                        </div>
                        <p className="text-[#E8D3C8] text-sm mt-1 flex flex-wrap items-center gap-2">
                          <Sparkles size={14} className="text-[#C7977D] shrink-0"/> {item.servicos?.nome} 
                          <span className="text-gray-500 text-xs shrink-0">({item.servicos?.duracao})</span>
                        </p>
                      </div>
                    </div>

                    <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 shrink-0">
                      <button onClick={() => setDetalhesAgendamento(item)} className="w-full sm:w-auto px-6 py-3 border border-[#DCAE96]/30 text-[#E8D3C8] rounded-xl text-sm font-medium hover:bg-[#DCAE96]/10 transition-colors">Detalhes e Edição</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL CONFIGURAÇÃO (DISPONIBILIDADE INDIVIDUAL E BLOQUEIOS) */}
      {isDisponibilidadeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#120308] border border-[#DCAE96]/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_0_40px_rgba(199,151,125,0.2)] animate-in zoom-in-95 duration-300">
            <div className="bg-[#2D0A12] px-6 md:px-8 py-5 flex justify-between items-center border-b border-[#DCAE96]/20">
              <h2 className="text-xl font-serif text-[#F8D1BE] flex items-center gap-2"><Settings size={20}/> Configurar Agenda</h2>
              <button onClick={() => setIsDisponibilidadeOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="flex bg-[#180A0D] border-b border-[#DCAE96]/20 p-2 gap-2">
              <button onClick={() => setAbaConfig('horarios')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${abaConfig === 'horarios' ? 'bg-[#2D0A12] text-[#F8D1BE] border border-[#DCAE96]/30' : 'text-gray-500 hover:text-gray-300'}`}>Dias de Trabalho</button>
              <button onClick={() => setAbaConfig('bloqueios')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${abaConfig === 'bloqueios' ? 'bg-[#2D0A12] text-[#F8D1BE] border border-[#DCAE96]/30' : 'text-gray-500 hover:text-gray-300'}`}>Bloqueios Específicos</button>
            </div>

            <form onSubmit={handleSalvarDisponibilidade}>
              <div className="p-6 md:p-8 space-y-6 max-h-[50vh] overflow-y-auto custom-scrollbar">
                
                {abaConfig === 'horarios' && (
                  <div className="space-y-4">
                    <p className="text-xs text-[#E8D3C8] bg-[#DCAE96]/10 p-3 rounded-lg border border-[#DCAE96]/20">Configure o horário de abertura e fechamento para cada dia isoladamente. Desmarque a caixa para definir como "Fechado". O Domingo agora está disponível para controle.</p>
                    {DIAS_SEMANA.map((nomeDia, index) => {
                      const configDia = configuracoes.disponibilidade[index] || { ativo: false, abertura: '08:00', fechamento: '18:00' };
                      return (
                        <div key={index} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all ${configDia.ativo ? 'bg-[#2D0A12]/40 border-[#DCAE96]/30' : 'bg-black/30 border-gray-800 opacity-60'}`}>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={configDia.ativo} onChange={(e) => atualizarDia(index, 'ativo', e.target.checked)} className="w-5 h-5 accent-[#C7977D]" />
                            <span className={`font-bold w-24 ${configDia.ativo ? 'text-white' : 'text-gray-500'}`}>{nomeDia}</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <input type="time" disabled={!configDia.ativo} value={configDia.abertura} onChange={(e) => atualizarDia(index, 'abertura', e.target.value)} className="bg-[#120308] border border-[#DCAE96]/20 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50 color-scheme-dark"/>
                            <span className="text-gray-500 text-xs">até</span>
                            <input type="time" disabled={!configDia.ativo} value={configDia.fechamento} onChange={(e) => atualizarDia(index, 'fechamento', e.target.value)} className="bg-[#120308] border border-[#DCAE96]/20 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50 color-scheme-dark"/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {abaConfig === 'bloqueios' && (
                  <div className="space-y-6">
                    <div className="bg-[#2D0A12]/40 border border-[#DCAE96]/30 p-5 rounded-xl">
                      <h3 className="text-[#F8D1BE] font-bold text-sm mb-3">Adicionar Novo Bloqueio</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        <div className="col-span-2 sm:col-span-1"><label className="text-[10px] text-gray-400">Data</label><input type="date" id="bloqueio_data" defaultValue={dataFiltro} className="w-full bg-[#120308] border border-[#DCAE96]/20 rounded px-2 py-1.5 text-xs text-white color-scheme-dark"/></div>
                        <div><label className="text-[10px] text-gray-400">Início</label><input type="time" id="bloqueio_inicio" className="w-full bg-[#120308] border border-[#DCAE96]/20 rounded px-2 py-1.5 text-xs text-white color-scheme-dark"/></div>
                        <div><label className="text-[10px] text-gray-400">Fim</label><input type="time" id="bloqueio_fim" className="w-full bg-[#120308] border border-[#DCAE96]/20 rounded px-2 py-1.5 text-xs text-white color-scheme-dark"/></div>
                        <div className="col-span-2 sm:col-span-4"><label className="text-[10px] text-gray-400">Motivo (Ex: Almoço)</label><input type="text" id="bloqueio_motivo" className="w-full bg-[#120308] border border-[#DCAE96]/20 rounded px-2 py-1.5 text-xs text-white"/></div>
                      </div>
                      <button type="button" onClick={adicionarBloqueio} className="w-full bg-[#DCAE96]/20 text-[#F8D1BE] border border-[#DCAE96]/40 py-2 rounded-lg text-xs font-bold hover:bg-[#DCAE96]/40">Bloquear Horário</button>
                    </div>

                    <div>
                      <h3 className="text-gray-400 text-xs font-bold mb-3 uppercase tracking-widest">Bloqueios Cadastrados</h3>
                      {configuracoes.bloqueios.length === 0 ? <p className="text-xs text-gray-600">Nenhum bloqueio.</p> : (
                        <div className="space-y-2">
                          {configuracoes.bloqueios.map((b: any) => (
                            <div key={b.id} className="flex justify-between items-center bg-red-900/10 border border-red-500/20 p-3 rounded-lg">
                              <div>
                                <p className="text-red-400 font-bold text-xs">{b.motivo}</p>
                                <p className="text-gray-500 text-[10px]">{new Date(b.data + 'T00:00:00').toLocaleDateString('pt-BR')} • {b.inicio} às {b.fim}</p>
                              </div>
                              <button type="button" onClick={() => removerBloqueio(b.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={14}/></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 md:px-8 py-5 bg-[#2D0A12] border-t border-[#DCAE96]/20">
                <button type="submit" disabled={isSaving} className="w-full bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-8 py-3 rounded-xl font-bold hover:scale-[1.02] transition-transform flex justify-center items-center gap-2">
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20}/> Salvar Definitivamente no Banco</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO AGENDAMENTO MANUAL */}
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
                  <button type="button" onClick={() => setAbaCliente('existente')} className={`flex-1 py-2 text-sm font-medium rounded-lg ${abaCliente === 'existente' ? 'bg-[#DCAE96]/20 text-[#F8D1BE]' : 'text-gray-400'}`}>Cadastrada</button>
                  <button type="button" onClick={() => setAbaCliente('nova')} className={`flex-1 py-2 text-sm font-medium rounded-lg ${abaCliente === 'nova' ? 'bg-[#DCAE96]/20 text-[#F8D1BE]' : 'text-gray-400'}`}>Nova Cliente</button>
                </div>
                {abaCliente === 'existente' ? (
                  <select name="cliente_id" required className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white">
                    <option value="">Selecione uma cliente...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome} - {c.telefone}</option>)}
                  </select>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" name="nome_nova" required placeholder="Nome Ex: Julia" className="col-span-2 bg-[#120308] border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white"/>
                    <input type="tel" name="telefone_nova" required placeholder="WhatsApp" className="col-span-2 bg-[#120308] border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white"/>
                  </div>
                )}
                <select name="servico_id" required className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white">
                  <option value="">Selecione um serviço...</option>
                  {servicos.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.duracao})</option>)}
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" name="data" defaultValue={dataFiltro} required className="bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white color-scheme-dark"/>
                  <input type="time" name="hora" defaultValue={horaModal} required className="bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white color-scheme-dark"/>
                </div>
                <select name="status_pagamento" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white">
                  <option value="pendente">Pendente (Cobrar no final)</option>
                  <option value="pago">Já foi Pago (Adiantado)</option>
                </select>
              </div>
              <div className="px-6 py-4 bg-[#2D0A12] border-t border-[#DCAE96]/20">
                <button type="submit" disabled={isSaving} className="w-full bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] py-3 rounded-xl font-bold flex justify-center items-center gap-2">
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20}/> Salvar na Agenda</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detalhesAgendamento && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#120308] border border-[#DCAE96]/40 rounded-3xl w-full max-w-sm overflow-hidden shadow-[0_0_40px_rgba(199,151,125,0.2)] animate-in zoom-in-95">
            <div className="bg-[#2D0A12] px-6 py-4 flex justify-between items-center border-b border-[#DCAE96]/20">
              <h2 className="text-xl font-serif text-[#F8D1BE]">Detalhes da Sessão</h2>
              <button onClick={() => setDetalhesAgendamento(null)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><p className="text-xs text-gray-400">Cliente</p><p className="text-lg font-bold text-white">{detalhesAgendamento.clientes?.nome}</p></div>
              <div className="border-t border-[#DCAE96]/10 pt-4"><p className="text-xs text-gray-400">Serviço</p><p className="text-lg font-bold text-white">{detalhesAgendamento.servicos?.nome}</p></div>
              {detalhesAgendamento.tipo === 'agendado' && (
                <div className="pt-4 border-t border-[#DCAE96]/10">
                  <button onClick={() => { setAgendamentoEditando(detalhesAgendamento); setDetalhesAgendamento(null); }} className="w-full bg-[#2D0A12] border border-[#DCAE96]/30 text-[#F8D1BE] py-3 rounded-xl font-bold flex justify-center gap-2"><Edit size={16}/> Editar / Remarcar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {agendamentoEditando && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#120308] border border-[#DCAE96]/40 rounded-3xl w-full max-w-sm overflow-hidden shadow-[0_0_40px_rgba(199,151,125,0.2)] animate-in zoom-in-95">
            <div className="bg-[#2D0A12] px-6 py-4 flex justify-between items-center border-b border-[#DCAE96]/20">
              <h2 className="text-xl font-serif text-[#F8D1BE] flex items-center gap-2"><Edit size={20}/> Remarcar</h2>
              <button onClick={() => setAgendamentoEditando(null)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleEditarAgendamento}>
              <div className="p-6 space-y-5">
                <input type="date" name="data" defaultValue={new Date(agendamentoEditando.inicio).toISOString().split('T')[0]} required className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-white color-scheme-dark"/>
                <input type="time" name="hora" defaultValue={new Date(agendamentoEditando.inicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})} required className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-white color-scheme-dark"/>
                <select name="status_pagamento" defaultValue={agendamentoEditando.status_pagamento || 'pendente'} className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-white"><option value="pendente">Pendente</option><option value="pago">Pago</option></select>
              </div>
              <div className="px-6 py-4 bg-[#2D0A12] border-t border-[#DCAE96]/20">
                <button type="submit" disabled={isSaving} className="w-full bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] py-3 rounded-xl font-bold">{isSaving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Salvar Alterações'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}