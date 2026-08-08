'use client'

import { useState, useEffect } from 'react';
import { Wifi, Sparkles, Clock, CalendarDays, Image as ImageIcon, CheckCircle2, PlayCircle, Maximize, Loader2, QrCode } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function MonitorPage() {
  const [horaAtual, setHoraAtual] = useState('');
  const [saudacao, setSaudacao] = useState('Olá');
  
  // Controle de Abas e Sessão
  const [abaAtiva, setActiveTab] = useState<'inicio' | 'cardapio' | 'agendar'>('inicio');
  const [atendimentoAtivo, setAtendimentoAtivo] = useState(false);
  
  // Dados da Sessão
  const [sessaoData, setSessaoData] = useState<any>(null);
  const [dadosServicoSessao, setDadosServicoSessao] = useState<any>(null);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  
  // Controle PIX
  const [isModalPixOpen, setIsModalPixOpen] = useState(false);
  const [isProcessandoPix, setIsProcessandoPix] = useState(false);
  const [statusPagamento, setStatusPagamento] = useState('pendente'); // pendente, pago

  // Dados do Banco
  const [servicosDb, setServicosDb] = useState<any[]>([]);
  
  // Controle do Carrossel de Descanso
  const [imagemAtualIndex, setImagemAtualIndex] = useState(0);
  const imagensCarrossel = ['/01.jpg', '/02.jpg', '/make01.jpeg', '/vermelha.jpeg'];

  // Controle de Agendamento
  const proximosDias = Array.from({length: 10}).map((_, i) => { 
    const d = new Date(); 
    d.setDate(d.getDate() + i + 1); 
    return d; 
  });
  const horariosLivres = ['09:00', '10:30', '13:30', '15:00', '16:30', '18:00'];
  const [servicoEscolhido, setServicoEscolhido] = useState('');
  const [dataEscolhida, setDataEscolhida] = useState<Date | null>(null);
  const [horaEscolhida, setHoraEscolhida] = useState('');
  const [isAgendando, setIsAgendando] = useState(false);
  const [agendamentoSucesso, setAgendamentoSucesso] = useState(false);

  // 1. Relógio
  useEffect(() => {
    const atualizarRelogio = () => {
      const agora = new Date();
      setHoraAtual(agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      const hora = agora.getHours();
      if (hora >= 5 && hora < 12) setSaudacao('Bom dia');
      else if (hora >= 12 && hora < 18) setSaudacao('Boa tarde');
      else setSaudacao('Boa noite');
    };
    atualizarRelogio();
    const intervalo = setInterval(atualizarRelogio, 1000);
    return () => clearInterval(intervalo);
  }, []);

  // Busca detalhes do serviço atual para calcular o PIX corretamente
  const carregarDetalhesServico = async (nomeServico: string) => {
    const { data } = await supabase.from('servicos').select('*').eq('nome', nomeServico).single();
    if (data) setDadosServicoSessao(data);
  };

  // 2. Conexão inicial e Tempo Real com Supabase
  useEffect(() => {
    const fetchInicial = async () => {
      const { data: servicos } = await supabase.from('servicos').select('*').eq('ativo', true).order('nome');
      if (servicos) setServicosDb(servicos);

      const { data: sessao } = await supabase.from('sessao_monitor').select('*').eq('id', 1).single();
      if (sessao) {
        setAtendimentoAtivo(sessao.ativo);
        setSessaoData(sessao);
        setStatusPagamento(sessao.status_pagamento || 'pendente');
        if (sessao.ativo && sessao.servico_nome) {
          carregarDetalhesServico(sessao.servico_nome);
        }
      }
    };
    fetchInicial();

    const canal = supabase
      .channel('monitor_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessao_monitor' }, (payload) => {
        const novaSessao = payload.new;
        setAtendimentoAtivo(novaSessao.ativo);
        setSessaoData(novaSessao);
        setStatusPagamento(novaSessao.status_pagamento || 'pendente');
        
        if (novaSessao.ativo && novaSessao.servico_nome) {
          carregarDetalhesServico(novaSessao.servico_nome);
        } else {
          setActiveTab('inicio');
          setDadosServicoSessao(null);
          setIsModalPixOpen(false);
          setAgendamentoSucesso(false);
          setDataEscolhida(null);
          setHoraEscolhida('');
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, []);

  // 3. Cronômetro Inteligente
  useEffect(() => {
    let cronometro: NodeJS.Timeout;
    if (atendimentoAtivo && sessaoData?.inicio) {
      cronometro = setInterval(() => {
        const agora = new Date().getTime();
        const inicio = new Date(sessaoData.inicio).getTime();
        setTempoDecorrido(Math.floor((agora - inicio) / 1000));
      }, 1000);
    } else {
      setTempoDecorrido(0);
    }
    return () => clearInterval(cronometro);
  }, [atendimentoAtivo, sessaoData]);

  // 4. Carrossel Cadeira Vazia
  useEffect(() => {
    let carrossel: NodeJS.Timeout;
    if (!atendimentoAtivo) {
      carrossel = setInterval(() => setImagemAtualIndex((prev) => (prev + 1) % imagensCarrossel.length), 6000);
    }
    return () => clearInterval(carrossel);
  }, [atendimentoAtivo, imagensCarrossel.length]);

  const ativarTelaCheia = () => {
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  };

  const formatarTempo = (segundosTotais: number) => {
    if (segundosTotais < 0) return "00:00";
    const h = Math.floor(segundosTotais / 3600);
    const m = Math.floor((segundosTotais % 3600) / 60);
    const s = segundosTotais % 60;
    return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // MÁGICA 1: Pagar via PIX no Monitor
  const processarPagamentoMonitor = async () => {
    setIsProcessandoPix(true);
    
    const precoTotal = dadosServicoSessao.preco;
    const taxaSinal = dadosServicoSessao.taxa_sinal || 0;
    const valorRestante = precoTotal - (precoTotal * (taxaSinal / 100));

    // 1. Registra o pagamento em Finanças
    await supabase.from('transacoes').insert([{
      descricao: `Pagamento Final (Tablet): ${sessaoData.cliente_nome} - ${sessaoData.servico_nome}`,
      tipo: 'entrada',
      valor: valorRestante,
      categoria: 'Atendimento'
    }]);

    // 2. Atualiza o Monitor para "Pago"
    await supabase.from('sessao_monitor').update({ status_pagamento: 'pago' }).eq('id', 1);

    setTimeout(() => {
      setIsProcessandoPix(false);
      setIsModalPixOpen(false);
    }, 1500);
  };

  // MÁGICA 2: Confirmar Agendamento de Retorno
  const confirmarAgendamento = async () => {
    if (!servicoEscolhido || !dataEscolhida || !horaEscolhida) {
      alert("Por favor, selecione um serviço, data e horário para agendar.");
      return;
    }
    setIsAgendando(true);

    const { data: clienteData } = await supabase.from('clientes').select('id').eq('nome', sessaoData.cliente_nome).limit(1).single();
    
    if (!clienteData) {
      alert("Erro ao identificar o seu cadastro. Avise a Débora, por favor!");
      setIsAgendando(false);
      return;
    }

    const ano = dataEscolhida.getFullYear();
    const mes = String(dataEscolhida.getMonth() + 1).padStart(2, '0');
    const dia = String(dataEscolhida.getDate()).padStart(2, '0');
    const inicioStr = `${ano}-${mes}-${dia}T${horaEscolhida}:00-03:00`;
    
    const inicioDate = new Date(inicioStr);
    const fimDate = new Date(inicioDate.getTime() + 2 * 60 * 60 * 1000);

    const { error } = await supabase.from('agendamentos').insert([{
      cliente_id: clienteData.id,
      servico_id: servicoEscolhido,
      tipo: 'agendado',
      inicio: inicioDate.toISOString(),
      fim: fimDate.toISOString()
    }]);

    setIsAgendando(false);
    
    if (error) {
      console.error(error);
      alert("Houve um problema ao confirmar. Tente novamente.");
    } else {
      setAgendamentoSucesso(true);
      setTimeout(() => {
        setAgendamentoSucesso(false);
        setActiveTab('inicio');
      }, 4000);
    }
  };

  // Cálculo de Exibição
  const precoTotal = dadosServicoSessao?.preco || 0;
  const taxaSinal = dadosServicoSessao?.taxa_sinal || 0;
  const valorRestante = precoTotal - (precoTotal * (taxaSinal / 100));

  return (
    <div className="h-screen w-full bg-[#120308] text-white flex overflow-hidden font-sans select-none relative">
      <button onClick={ativarTelaCheia} className="absolute top-4 left-4 z-50 p-2 text-[#C7977D] opacity-10 hover:opacity-100"><Maximize size={24} /></button>

      {/* ============================================== */}
      {/* MODO DESCANSO */}
      {/* ============================================== */}
      {!atendimentoAtivo && (
        <div className="absolute inset-0 z-0 flex flex-col justify-between">
          {imagensCarrossel.map((img, idx) => (
             <div key={img} className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[2000ms]" style={{ backgroundImage: `url('${img}')`, opacity: idx === imagemAtualIndex ? 0.4 : 0, transform: idx === imagemAtualIndex ? 'scale(1.05)' : 'scale(1)', transition: 'opacity 2s ease-in-out, transform 10s ease-out' }} />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-[#120308] via-[#120308]/60 to-[#120308]/90 z-10"></div>
          
          <header className="w-full p-8 flex justify-between items-center z-30">
            <div className="flex items-center gap-4">
              <img src="/debora.jpg" className="h-12 w-12 rounded-full object-cover border-2 border-[#C7977D]" alt="Débora Silva" />
              <div className="flex flex-col">
                <span className="font-serif text-[#F8D1BE] text-2xl leading-tight text-shadow-md">Debora Silva</span>
                <span className="text-[#E8D3C8] text-xs tracking-widest uppercase font-semibold">Nails de Luxo</span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-[#120308]/60 backdrop-blur-md px-6 py-3 rounded-full border border-[#DCAE96]/30">
              <Clock size={20} className="text-[#C7977D]" />
              <span className="text-white font-medium text-xl tracking-wider">{horaAtual}</span>
            </div>
          </header>

          <main className="flex-1 flex flex-col items-center justify-center text-center z-30 px-6">
            <Sparkles size={40} className="text-[#C7977D] mb-6 opacity-90 animate-pulse" />
            <h1 className="font-serif text-5xl md:text-7xl text-white mb-6 text-shadow-[0_0_30px_rgba(0,0,0,0.8)]">Experiência Exclusiva</h1>
            <p className="text-xl md:text-2xl text-[#E8D3C8] font-light max-w-2xl leading-relaxed text-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">Beleza com elegância, precisão e durabilidade. <br/> Seu momento de luxo começará em breve.</p>
          </main>

          <footer className="w-full p-8 z-30 flex justify-center gap-3">
            {imagensCarrossel.map((_, idx) => (
              <div key={idx} className={`h-1.5 rounded-full transition-all duration-500 ${idx === imagemAtualIndex ? 'w-12 bg-[#F8D1BE]' : 'w-4 bg-[#DCAE96]/30'}`}></div>
            ))}
          </footer>
        </div>
      )}

      {/* ============================================== */}
      {/* MODO SESSÃO VIP ATIVA */}
      {/* ============================================== */}
      {atendimentoAtivo && sessaoData && (
        <div className="absolute inset-0 z-40 flex bg-[#120308] animate-in slide-in-from-bottom-8 duration-700">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#DCAE96]/10 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '5s' }}></div>
          
          <aside className="w-24 md:w-72 bg-[#2D0A12]/80 backdrop-blur-xl border-r border-[#DCAE96]/30 flex flex-col z-20 transition-all duration-500">
            <div className="p-6 md:p-8 border-b border-[#DCAE96]/20 flex flex-col items-center md:items-start">
              <img src="/debora.jpg" className="h-12 w-12 rounded-full object-cover mb-4 border border-[#C7977D]" alt="Débora Silva" />
              <div className="hidden md:block">
                <p className="text-xs text-[#E8D3C8] uppercase tracking-widest mb-1">Sessão Exclusiva</p>
                <h2 className="font-serif text-2xl text-[#F8D1BE] truncate w-full">{sessaoData.cliente_nome.split(' ')[0]}</h2>
              </div>
            </div>

            <nav className="flex-1 p-4 flex flex-col gap-3">
              <button onClick={() => setActiveTab('inicio')} className={`flex items-center justify-center md:justify-start gap-4 p-4 rounded-2xl transition-all ${abaAtiva === 'inicio' ? 'bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] font-bold shadow-[0_0_20px_rgba(248,209,190,0.3)]' : 'text-[#E8D3C8] hover:bg-[#DCAE96]/10'}`}>
                <Sparkles size={24} /> <span className="hidden md:block text-lg">Meu Atendimento</span>
              </button>
              <button onClick={() => setActiveTab('cardapio')} className={`flex items-center justify-center md:justify-start gap-4 p-4 rounded-2xl transition-all ${abaAtiva === 'cardapio' ? 'bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] font-bold shadow-[0_0_20px_rgba(248,209,190,0.3)]' : 'text-[#E8D3C8] hover:bg-[#DCAE96]/10'}`}>
                <ImageIcon size={24} /> <span className="hidden md:block text-lg">Menu de Serviços</span>
              </button>
              <button onClick={() => {setActiveTab('agendar'); setAgendamentoSucesso(false);}} className={`flex items-center justify-center md:justify-start gap-4 p-4 rounded-2xl transition-all ${abaAtiva === 'agendar' ? 'bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] font-bold shadow-[0_0_20px_rgba(248,209,190,0.3)]' : 'text-[#E8D3C8] hover:bg-[#DCAE96]/10'}`}>
                <CalendarDays size={24} /> <span className="hidden md:block text-lg">Agendar Retorno</span>
              </button>
            </nav>

            <div className="p-4 md:p-6 border-t border-[#DCAE96]/20">
              <div className="bg-[#120308]/60 p-4 rounded-2xl flex items-center justify-center md:justify-between border border-[#DCAE96]/10">
                <div className="hidden md:block">
                  <p className="text-xs text-gray-400">Wi-Fi: <span className="text-[#F8D1BE]">Debora_VIP</span></p>
                  <p className="text-xs text-gray-400">Senha: <span className="text-[#F8D1BE]">fiquelinda</span></p>
                </div>
                <Wifi className="text-[#C7977D]" size={20} />
              </div>
            </div>
          </aside>

          <main className="flex-1 relative z-10 flex flex-col h-full overflow-hidden">
            <header className="p-6 md:p-8 flex justify-end">
               <div className="flex items-center gap-3 bg-[#2D0A12]/60 border border-[#DCAE96]/30 backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg">
                <Clock size={18} className="text-[#C7977D]" />
                <span className="text-white font-medium tracking-widest">{horaAtual}</span>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
              
              {/* TELA DE INÍCIO - CRONÔMETRO E PIX */}
              {abaAtiva === 'inicio' && (
                <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <div className="mb-12">
                    <h1 className="font-serif text-5xl md:text-7xl text-white mb-4 leading-tight">
                      {saudacao}, <span className="text-[#F8D1BE]">{sessaoData.cliente_nome.split(' ')[0]}!</span> ✨
                    </h1>
                    <p className="text-xl md:text-2xl text-[#E8D3C8] font-light">Sua presença iluminou o nosso ateliê hoje. Relaxe e aproveite o seu momento.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* CARD CRONÔMETRO */}
                    <div className="bg-gradient-to-br from-[#2D0A12]/80 to-[#120308] border border-[#DCAE96]/30 p-8 rounded-3xl shadow-[0_0_30px_rgba(199,151,125,0.15)] flex flex-col">
                      <p className="text-[#E8D3C8] text-sm uppercase tracking-widest font-semibold mb-2">Serviço em Andamento</p>
                      <h2 className="font-serif text-3xl text-white mb-6 flex-1">{sessaoData.servico_nome}</h2>
                      <div className="bg-[#120308]/80 border border-[#DCAE96]/20 rounded-2xl p-6 flex flex-col items-center justify-center mt-auto">
                        <PlayCircle size={32} className="text-[#C7977D] mb-3 animate-pulse" />
                        <span className="font-mono text-5xl text-[#F8D1BE] tracking-widest font-light">{formatarTempo(tempoDecorrido)}</span>
                        <span className="text-xs text-gray-400 mt-2 uppercase tracking-widest">Tempo de Sessão</span>
                      </div>
                    </div>

                    {/* CARD FINANCEIRO & PIX */}
                    {dadosServicoSessao && (
                      <div className="bg-[#120308]/60 border border-[#DCAE96]/20 p-8 rounded-3xl shadow-xl flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-6">
                            <h3 className="font-serif text-2xl text-white">Resumo do Atendimento</h3>
                            {statusPagamento === 'pago' && <span className="bg-emerald-500/20 text-emerald-400 text-xs px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 size={12}/> Pago</span>}
                          </div>
                          
                          <div className="space-y-4">
                            <div className="flex justify-between text-gray-400">
                              <span>Valor Total:</span>
                              <span>R$ {precoTotal.toFixed(2).replace('.', ',')}</span>
                            </div>
                            {taxaSinal > 0 && (
                              <div className="flex justify-between text-emerald-400/70 border-b border-[#DCAE96]/10 pb-4">
                                <span>Sinal Pago ({taxaSinal}%):</span>
                                <span>- R$ {(precoTotal * (taxaSinal / 100)).toFixed(2).replace('.', ',')}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-[#F8D1BE] text-2xl font-bold pt-2">
                              <span>Restante:</span>
                              <span>R$ {valorRestante.toFixed(2).replace('.', ',')}</span>
                            </div>
                          </div>
                        </div>

                        {statusPagamento !== 'pago' && (
                          <button onClick={() => setIsModalPixOpen(true)} className="mt-8 w-full bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 hover:text-white transition-all shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                            <QrCode size={20} /> Adiantar Pagamento (PIX)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TELA DE CARDÁPIO COM GALERIA DESLIZÁVEL */}
              {abaAtiva === 'cardapio' && (
                <div className="animate-in fade-in slide-in-from-right-8 duration-700">
                  <h2 className="font-serif text-4xl text-[#F8D1BE] mb-2">Menu de Serviços</h2>
                  <p className="text-[#E8D3C8] text-lg mb-10">Inspire-se para a sua próxima visita ao ateliê. Deslize as fotos para ver mais.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {servicosDb.length === 0 ? (
                      <p className="text-gray-400">Nenhum serviço carregado.</p>
                    ) : (
                      servicosDb.map(serv => {
                        const fotos = serv.imagens || [];
                        const temFotos = fotos.length > 0;

                        return (
                          <div key={serv.id} className="bg-[#2D0A12]/60 border border-[#DCAE96]/20 rounded-3xl overflow-hidden flex flex-col shadow-lg">
                            <div className="h-56 relative bg-[#120308] overflow-hidden group">
                              {temFotos ? (
                                <div className="flex w-full h-full overflow-x-auto snap-x snap-mandatory hide-scroll scroll-smooth">
                                  {fotos.map((foto: string, index: number) => (
                                    <div key={index} className="w-full h-full shrink-0 snap-center relative">
                                      <img src={foto} alt={`${serv.nome} - Foto ${index + 1}`} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-[#120308] via-transparent to-transparent z-10 pointer-events-none"></div>
                                      {fotos.length > 1 && (
                                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-white z-20 border border-white/20 font-medium">
                                          {index + 1} / {fotos.length}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full opacity-30"><Sparkles size={40} className="text-[#C7977D]" /></div>
                              )}
                            </div>
                            <div className="p-6 relative z-20 -mt-6 bg-[#2D0A12]/90 backdrop-blur-sm rounded-t-3xl flex-1 flex flex-col border-t border-[#DCAE96]/10">
                              <h3 className="font-serif text-2xl text-white mb-2 truncate" title={serv.nome}>{serv.nome}</h3>
                              <p className="text-[#E8D3C8] text-sm mb-4 line-clamp-2 flex-1">{serv.descricao || 'Serviço de alto padrão.'}</p>
                              <div className="flex justify-between items-center pt-2">
                                <span className="text-[#C7977D] font-bold text-xl">R$ {serv.preco.toFixed(2).replace('.', ',')}</span>
                                <button onClick={() => {setServicoEscolhido(serv.id); setActiveTab('agendar');}} className="bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-5 py-2.5 rounded-full text-sm font-bold shadow-lg hover:scale-105 transition-transform">
                                  Agendar
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TELA DE AGENDAR RETORNO */}
              {abaAtiva === 'agendar' && (
                <div className="max-w-4xl animate-in fade-in slide-in-from-right-8 duration-700">
                  {agendamentoSucesso ? (
                    <div className="flex flex-col items-center justify-center bg-[#2D0A12]/60 border border-emerald-500/50 p-12 rounded-3xl animate-in zoom-in-95 duration-500 shadow-[0_0_40px_rgba(16,185,129,0.2)] text-center">
                      <CheckCircle2 size={64} className="text-emerald-400 mb-6" />
                      <h2 className="font-serif text-4xl text-white mb-4">Retorno Confirmado!</h2>
                      <p className="text-xl text-[#E8D3C8]">A Débora já recebeu o aviso no sistema.</p>
                      <p className="text-emerald-400 mt-6 font-medium">Voltando ao início...</p>
                    </div>
                  ) : (
                    <>
                      <h2 className="font-serif text-4xl text-[#F8D1BE] mb-2">Agende seu Retorno</h2>
                      <p className="text-[#E8D3C8] text-lg mb-10">Você já está logada. Escolha o serviço, o dia e a hora para a sua próxima produção.</p>
                      
                      <div className="bg-[#2D0A12]/60 border border-[#DCAE96]/30 p-8 rounded-3xl shadow-xl flex flex-col xl:flex-row gap-8">
                        <div className="flex-1 border-b xl:border-b-0 xl:border-r border-[#DCAE96]/20 pb-6 xl:pb-0 xl:pr-8">
                          <h3 className="text-white font-medium mb-4 flex items-center gap-2"><Sparkles className="text-[#C7977D]" size={20}/> Qual o serviço?</h3>
                          <select value={servicoEscolhido} onChange={(e) => setServicoEscolhido(e.target.value)} className="w-full bg-[#120308] border border-[#DCAE96]/30 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-[#F8D1BE] appearance-none">
                            <option value="">Selecione...</option>
                            {servicosDb.map(s => <option key={s.id} value={s.id}>{s.nome} - R$ {s.preco.toFixed(2).replace('.', ',')}</option>)}
                          </select>
                        </div>

                        <div className="flex-1 border-b xl:border-b-0 xl:border-r border-[#DCAE96]/20 pb-6 xl:pb-0 xl:pr-8">
                          <h3 className="text-white font-medium mb-4 flex items-center gap-2"><CalendarDays className="text-[#C7977D]" size={20}/> Escolha a Data</h3>
                          <div className="grid grid-cols-4 md:grid-cols-5 gap-3">
                            {proximosDias.map((data, idx) => (
                              <button key={idx} onClick={() => setDataEscolhida(data)} className={`p-3 rounded-2xl flex flex-col items-center justify-center transition-all border ${dataEscolhida?.getDate() === data.getDate() ? 'bg-[#C7977D] text-[#120308] border-[#C7977D] shadow-[0_0_15px_rgba(199,151,125,0.4)] font-bold scale-105' : 'bg-[#120308]/50 text-gray-300 border-[#DCAE96]/10 hover:border-[#DCAE96]/50'}`}>
                                <span className="text-[10px] uppercase opacity-70 mb-1">{data.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                <span className="text-lg">{data.getDate()}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex-1 flex flex-col">
                          <h3 className="text-white font-medium mb-4 flex items-center gap-2"><Clock className="text-[#C7977D]" size={20}/> Horário</h3>
                          <div className="grid grid-cols-2 gap-3 mb-8">
                            {horariosLivres.map(hora => (
                              <button key={hora} onClick={() => setHoraEscolhida(hora)} className={`py-3 rounded-xl transition-all border ${horaEscolhida === hora ? 'bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] font-bold shadow-lg border-transparent' : 'bg-[#120308] border-[#DCAE96]/30 text-white hover:bg-[#DCAE96]/20'}`}>
                                {hora}
                              </button>
                            ))}
                          </div>
                          <button onClick={confirmarAgendamento} disabled={isAgendando} className="mt-auto w-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50">
                            {isAgendando ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} /> Confirmar Retorno</>}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      )}

      {/* MODAL DO QR CODE PIX */}
      {isModalPixOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md px-4 animate-in fade-in">
          <div className="bg-[#120308] border border-emerald-500/40 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(16,185,129,0.2)]">
            <h2 className="font-serif text-3xl text-emerald-400 mb-2">Pagamento PIX</h2>
            <p className="text-[#E8D3C8] mb-6">Escaneie o código abaixo com o aplicativo do seu banco.</p>
            
            <div className="bg-white p-4 rounded-2xl inline-block mb-6 shadow-xl border-4 border-emerald-500/20">
              <QrCode size={180} className="text-[#120308]" />
            </div>

            <p className="text-2xl text-white font-bold mb-1">R$ {valorRestante.toFixed(2).replace('.', ',')}</p>
            <p className="text-gray-400 text-sm mb-8">Débora da Silva</p>

            <div className="flex gap-3">
              <button onClick={() => setIsModalPixOpen(false)} className="flex-1 py-4 rounded-xl border border-[#DCAE96]/30 text-gray-400 hover:text-white transition-colors">Voltar</button>
              <button onClick={processarPagamentoMonitor} disabled={isProcessandoPix} className="flex-1 bg-emerald-500 text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-emerald-600 transition-colors">
                {isProcessandoPix ? <Loader2 className="animate-spin" size={20}/> : 'Simular Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESTILOS PARA ESCONDER A BARRA DE ROLAGEM MAS MANTER O SCROLL (SWIPE) */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(199, 151, 125, 0.3); border-radius: 10px; }
        
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}