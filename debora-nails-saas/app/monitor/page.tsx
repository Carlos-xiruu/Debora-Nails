'use client'

import { useState, useEffect } from 'react';
import { Wifi, Sparkles, Clock, CalendarDays, Image as ImageIcon, CheckCircle2, PlayCircle, Maximize, Loader2, QrCode, Download, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function MonitorPage() {
  const [horaAtual, setHoraAtual] = useState('');
  const [saudacao, setSaudacao] = useState('Olá');
  
  const [abaAtiva, setActiveTab] = useState<'inicio' | 'cardapio' | 'agendar'>('inicio');
  const [atendimentoAtivo, setAtendimentoAtivo] = useState(false);
  
  const [sessaoData, setSessaoData] = useState<any>(null);
  const [dadosServicoSessao, setDadosServicoSessao] = useState<any>(null);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  
  const [statusPagamento, setStatusPagamento] = useState('pendente');
  const [qrCodeImagem, setQrCodeImagem] = useState<string | null>(null);
  const [pagamentoMercadoPagoId, setPagamentoMercadoPagoId] = useState<string | null>(null);
  const [isGerandoPix, setIsGerandoPix] = useState(false);

  const [servicosDb, setServicosDb] = useState<any[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // -----------------------------------------------------
  // NOVA INTELIGÊNCIA DO CARROSSEL (FOTOS + CARD QUEM SOU EU)
  // -----------------------------------------------------
  const [imagemAtualIndex, setImagemAtualIndex] = useState(0);
  
  // Isso aqui em breve virá do Supabase! Por enquanto está preparado.
  const slides = [
    { bg: '/01.jpg', tipo: 'intro' },
    { bg: '/debora.jpg', tipo: 'sobre' }, // Este slide aciona o "Quem Sou Eu"
    { bg: '/02.jpg', tipo: 'intro' },
    { bg: '/make01.jpeg', tipo: 'intro' },
    { bg: '/vermelha.jpeg', tipo: 'intro' }
  ];

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

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

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

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  const carregarDetalhesServico = async (nomeServico: string) => {
    const { data } = await supabase.from('servicos').select('*').eq('nome', nomeServico).single();
    if (data) setDadosServicoSessao(data);
  };

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
          setAgendamentoSucesso(false);
          setDataEscolhida(null);
          setHoraEscolhida('');
          setQrCodeImagem(null);
          setPagamentoMercadoPagoId(null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, []);

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

  useEffect(() => {
    let carrossel: NodeJS.Timeout;
    if (!atendimentoAtivo) {
      carrossel = setInterval(() => setImagemAtualIndex((prev) => (prev + 1) % slides.length), 8000); // 8 Segundos
    }
    return () => clearInterval(carrossel);
  }, [atendimentoAtivo, slides.length]);

  useEffect(() => {
    const gerarPix = async () => {
      if (!dadosServicoSessao || !sessaoData || statusPagamento === 'pago' || qrCodeImagem || isGerandoPix) return;
      
      setIsGerandoPix(true);
      
      const preco = dadosServicoSessao.preco;
      const taxa = dadosServicoSessao.taxa_sinal || 0;
      const restante = preco - (preco * (taxa / 100));

      try {
        const res = await fetch('/api/pagamento-monitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            valor: restante,
            descricao: `Pagamento Final - ${sessaoData.servico_nome} (${sessaoData.cliente_nome})`
          })
        });
        const data = await res.json();
        
        if (data.qr_code_base64 && data.id) {
          setQrCodeImagem(data.qr_code_base64); 
          setPagamentoMercadoPagoId(data.id);
        }
      } catch (error) {
        console.error("Erro ao gerar PIX", error);
      } finally {
        setIsGerandoPix(false);
      }
    };

    if (atendimentoAtivo) {
      gerarPix();
    }
  }, [dadosServicoSessao, atendimentoAtivo, statusPagamento]);

  useEffect(() => {
    let intervalo: NodeJS.Timeout;

    const checarPagamento = async () => {
      if (!pagamentoMercadoPagoId) return;

      try {
        const res = await fetch('/api/checar-pagamento', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: pagamentoMercadoPagoId })
        });
        const data = await res.json();

        if (data.status === 'approved') {
          setPagamentoMercadoPagoId(null); 
          setStatusPagamento('pago'); 

          const preco = dadosServicoSessao.preco;
          const taxa = dadosServicoSessao.taxa_sinal || 0;
          const restante = preco - (preco * (taxa / 100));

          await supabase.from('sessao_monitor').update({ status_pagamento: 'pago' }).eq('id', 1);
          await supabase.from('transacoes').insert([{
            descricao: `Pagamento PIX (Tablet): ${sessaoData.cliente_nome}`,
            tipo: 'entrada',
            valor: restante,
            categoria: 'Atendimento'
          }]);
        }
      } catch (err) {
        console.error("Erro na checagem automática", err);
      }
    };

    if (pagamentoMercadoPagoId && statusPagamento === 'pendente') {
      intervalo = setInterval(checarPagamento, 5000); 
    }

    return () => clearInterval(intervalo);
  }, [pagamentoMercadoPagoId, statusPagamento, dadosServicoSessao, sessaoData]);

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

  const confirmarAgendamento = async () => {
    if (!servicoEscolhido || !dataEscolhida || !horaEscolhida) return;
    setIsAgendando(true);

    const { data: clienteData } = await supabase.from('clientes').select('id').eq('nome', sessaoData.cliente_nome).limit(1).single();
    
    if (clienteData) {
      const inicioDate = new Date(`${dataEscolhida.toISOString().split('T')[0]}T${horaEscolhida}:00-03:00`);
      const fimDate = new Date(inicioDate.getTime() + 2 * 60 * 60 * 1000);

      await supabase.from('agendamentos').insert([{
        cliente_id: clienteData.id,
        servico_id: servicoEscolhido,
        tipo: 'agendado',
        inicio: inicioDate.toISOString(),
        fim: fimDate.toISOString()
      }]);

      setAgendamentoSucesso(true);
      setTimeout(() => {
        setAgendamentoSucesso(false);
        setActiveTab('inicio');
      }, 4000);
    }
    setIsAgendando(false);
  };

  const precoTotal = dadosServicoSessao?.preco || 0;
  const taxaSinal = dadosServicoSessao?.taxa_sinal || 0;
  const valorRestante = precoTotal - (precoTotal * (taxaSinal / 100));

  return (
    <div className="h-[100dvh] w-full bg-[#0A0205] text-white flex flex-row overflow-hidden font-sans select-none relative">
      <button onClick={ativarTelaCheia} className="absolute top-2 left-2 z-50 p-2 text-[#C7977D] opacity-20 hover:opacity-100 bg-black/40 rounded-full transition-opacity"><Maximize size={16} /></button>
      
      {deferredPrompt && (
        <button onClick={handleInstallClick} className="absolute top-2 right-2 z-50 flex items-center gap-1.5 bg-[#00B1EA] text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-[0_0_15px_rgba(0,177,234,0.4)] animate-pulse">
          <Download size={12} /> Instalar
        </button>
      )}

      {/* ============================================== */}
      {/* MODO DESCANSO OTIMIZADO (SEM A PALAVRA "LUXO") */}
      {/* ============================================== */}
      {!atendimentoAtivo && (
        <div className="absolute inset-0 z-0 flex flex-col justify-between h-[100dvh] bg-black overflow-hidden">
          {slides.map((slide, idx) => (
             <div key={idx} className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[2000ms]" style={{ backgroundImage: `url('${slide.bg}')`, opacity: idx === imagemAtualIndex ? 0.5 : 0, transform: idx === imagemAtualIndex ? 'scale(1.03)' : 'scale(1)', transition: 'opacity 2s ease-in-out, transform 10s ease-out' }} />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0205] via-[#0A0205]/40 to-[#0A0205]/90 z-10"></div>
          
          <header className="w-full p-4 md:px-8 flex justify-between items-center z-30 shrink-0">
            <div className="flex items-center gap-3 pl-8">
              <img src="/debora.jpg" className="h-10 w-10 rounded-full object-cover border border-[#C7977D]" alt="Débora Silva" />
              <div className="flex flex-col">
                <span className="font-serif text-[#F8D1BE] text-xl leading-tight drop-shadow-md">Debora Nails</span>
                <span className="text-[#E8D3C8] text-[9px] tracking-[0.2em] uppercase font-bold opacity-80">Studio de Alto Padrão</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-[#DCAE96]/20 shadow-lg">
              <Clock size={16} className="text-[#C7977D]" />
              <span className="text-white font-medium text-lg tracking-wider">{horaAtual}</span>
            </div>
          </header>

          <main className="flex-1 flex flex-col items-center justify-center text-center z-30 px-4">
            
            {/* CONTEÚDO DINÂMICO (Alterna entre a frase e o "Quem sou eu") */}
            {slides[imagemAtualIndex].tipo === 'intro' ? (
              <div className="animate-in zoom-in-95 duration-700 fade-in">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="w-12 md:w-20 h-[1px] bg-gradient-to-r from-transparent to-[#C7977D]/80"></div>
                  <Sparkles size={24} className="text-[#C7977D] opacity-90 animate-pulse" />
                  <div className="w-12 md:w-20 h-[1px] bg-gradient-to-l from-transparent to-[#C7977D]/80"></div>
                </div>
                <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white mb-4 tracking-wide drop-shadow-[0_2px_15px_rgba(0,0,0,1)]">
                  Cuidado em cada <span className="text-[#F8D1BE] italic">detalhe</span>.
                </h1>
                <p className="text-sm md:text-lg text-[#E8D3C8] font-light tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  Uma pausa merecida para o seu bem-estar começará em breve.
                </p>
              </div>
            ) : (
              <div className="bg-[#120308]/60 backdrop-blur-xl border border-[#DCAE96]/30 p-6 md:p-8 rounded-[32px] max-w-xl mx-auto shadow-[0_0_40px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-8 duration-700 fade-in">
                <img src="/debora.jpg" className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-full object-cover border border-[#C7977D] mb-4 shadow-lg" alt="Débora" />
                <h2 className="font-serif text-2xl md:text-3xl text-[#F8D1BE] mb-2 drop-shadow-md">Muito prazer, sou a Débora.</h2>
                <p className="text-xs md:text-sm text-gray-300 leading-relaxed font-light mb-5 px-4">
                  Há mais de 6 anos venho transformando a autoestima de mulheres através de um trabalho feito com muita dedicação e amor. Para mim, a beleza mora na simplicidade de se sentir bem e confiante consigo mesma.
                </p>
                <span className="inline-flex items-center gap-1.5 border border-[#C7977D]/50 text-[#C7977D] bg-black/40 text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-full font-bold">
                  <Sparkles size={12}/> A Especialista
                </span>
              </div>
            )}

          </main>

          <footer className="w-full p-6 z-30 flex justify-center gap-2 shrink-0">
            {slides.map((_, idx) => (
              <div key={idx} className={`h-1 rounded-full transition-all duration-500 ${idx === imagemAtualIndex ? 'w-8 bg-[#F8D1BE] shadow-[0_0_10px_#F8D1BE]' : 'w-3 bg-white/20'}`}></div>
            ))}
          </footer>
        </div>
      )}

      {/* ============================================== */}
      {/* MODO SESSÃO VIP ATIVA */}
      {/* ============================================== */}
      {atendimentoAtivo && sessaoData && (
        <div className="absolute inset-0 z-40 flex flex-row bg-[#0A0205] animate-in slide-in-from-bottom-8 duration-700 h-[100dvh]">
          
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#DCAE96]/10 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDuration: '6s' }}></div>
          
          <aside className="w-[30%] min-w-[140px] sm:min-w-[200px] max-w-[260px] bg-[#120308]/90 backdrop-blur-xl border-r border-[#DCAE96]/20 flex flex-col z-20 h-full shrink-0 shadow-2xl">
            <div className="p-3 sm:p-5 border-b border-[#DCAE96]/10 flex flex-col items-start shrink-0">
              <img src="/debora.jpg" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover mb-2 border border-[#C7977D] shadow-lg" alt="Débora Silva" />
              <p className="text-[8px] sm:text-[9px] text-[#C7977D] uppercase tracking-[0.1em] sm:tracking-[0.15em] mb-0.5 font-bold">Sessão Exclusiva</p>
              <h2 className="font-serif text-base sm:text-xl text-[#F8D1BE] truncate w-full drop-shadow-md">{sessaoData.cliente_nome.split(' ')[0]}</h2>
            </div>

            <nav className="flex-1 p-2 sm:p-3 flex flex-col gap-1 sm:gap-2 overflow-y-auto custom-scrollbar">
              <button onClick={() => setActiveTab('inicio')} className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl transition-all ${abaAtiva === 'inicio' ? 'bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#0A0205] font-bold shadow-[0_0_20px_rgba(248,209,190,0.4)]' : 'text-[#E8D3C8] hover:bg-[#DCAE96]/10 hover:text-white'}`}>
                <Sparkles size={16} className="shrink-0" /> <span className="text-xs sm:text-sm">Atendimento</span>
              </button>
              <button onClick={() => setActiveTab('cardapio')} className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl transition-all ${abaAtiva === 'cardapio' ? 'bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#0A0205] font-bold shadow-[0_0_20px_rgba(248,209,190,0.4)]' : 'text-[#E8D3C8] hover:bg-[#DCAE96]/10 hover:text-white'}`}>
                <ImageIcon size={16} className="shrink-0" /> <span className="text-xs sm:text-sm">Serviços</span>
              </button>
              <button onClick={() => { setActiveTab('agendar'); setAgendamentoSucesso(false); }} className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl transition-all ${abaAtiva === 'agendar' ? 'bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#0A0205] font-bold shadow-[0_0_20px_rgba(248,209,190,0.4)]' : 'text-[#E8D3C8] hover:bg-[#DCAE96]/10 hover:text-white'}`}>
                <CalendarDays size={16} className="shrink-0" /> <span className="text-xs sm:text-sm">Agendar</span>
              </button>
            </nav>

            <div className="p-2 sm:p-4 border-t border-[#DCAE96]/10 shrink-0">
              <div className="bg-black/40 p-2 sm:p-3 rounded-lg flex items-center justify-between border border-[#DCAE96]/10">
                <div>
                  <p className="text-[8px] sm:text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">Wi-Fi Premium</p>
                  <p className="text-[9px] sm:text-[11px] text-[#F8D1BE]">Rede: <span className="font-bold text-white">Debora_VIP</span></p>
                  <p className="text-[9px] sm:text-[11px] text-[#F8D1BE]">Senha: <span className="font-bold text-white">fiquelinda</span></p>
                </div>
                <Wifi className="text-[#C7977D] opacity-80" size={14} />
              </div>
            </div>
          </aside>

          <main className="flex-1 relative z-10 flex flex-col h-[100dvh] overflow-hidden">
            <header className="p-2 sm:p-4 flex justify-end shrink-0">
              <div className="flex items-center gap-2 bg-[#120308]/60 border border-[#DCAE96]/20 backdrop-blur-md px-3 py-1 sm:px-4 sm:py-1.5 rounded-full shadow-lg">
                <Clock size={12} className="text-[#C7977D]" />
                <span className="text-white font-medium text-xs sm:text-sm tracking-widest">{horaAtual}</span>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6 custom-scrollbar">
              
              {abaAtiva === 'inicio' && (
                <div className="min-h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="mb-2 sm:mb-4 shrink-0">
                    <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-white mb-0.5 leading-tight drop-shadow-lg">
                      {saudacao}, <span className="text-[#F8D1BE]">{sessaoData.cliente_nome.split(' ')[0]}!</span> ✨
                    </h1>
                    <p className="text-[10px] sm:text-xs text-[#E8D3C8] font-light opacity-80">Relaxe e aproveite o seu momento.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1 min-h-0">
                    
                    <div className="flex-1 bg-gradient-to-br from-[#1A050B] to-[#0A0205] border border-[#DCAE96]/20 p-3 sm:p-5 rounded-2xl shadow-xl flex flex-col justify-between min-h-[140px]">
                      <div>
                        <p className="text-[#C7977D] text-[9px] sm:text-[10px] uppercase tracking-widest font-bold mb-1">Em Andamento</p>
                        <h2 className="font-serif text-base sm:text-xl text-white leading-tight drop-shadow-md">{sessaoData.servico_nome}</h2>
                      </div>
                      <div className="bg-black/50 border border-[#DCAE96]/10 rounded-xl p-2 sm:p-4 flex flex-col items-center justify-center mt-2 shadow-inner">
                        <PlayCircle size={16} className="text-[#F8D1BE] mb-1 sm:mb-2 animate-pulse" />
                        <span className="font-mono text-2xl sm:text-3xl lg:text-4xl text-white tracking-widest font-light drop-shadow-[0_0_10px_rgba(248,209,190,0.5)]">{formatarTempo(tempoDecorrido)}</span>
                      </div>
                    </div>

                    {dadosServicoSessao && (
                      <div className="flex-1 bg-[#120308]/80 border border-[#DCAE96]/20 p-3 sm:p-5 rounded-2xl shadow-xl flex flex-col justify-between min-h-[140px]">
                        <div>
                          <div className="flex justify-between items-center mb-2 sm:mb-3 border-b border-[#DCAE96]/10 pb-1.5 sm:pb-2">
                            <h3 className="font-serif text-sm sm:text-lg text-white">Resumo</h3>
                            {statusPagamento === 'pago' && <span className="bg-emerald-500/20 text-emerald-400 text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 size={10}/> Pago</span>}
                          </div>
                          
                          <div className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs">
                            <div className="flex justify-between text-gray-400">
                              <span>Total:</span>
                              <span>R$ {precoTotal.toFixed(2).replace('.', ',')}</span>
                            </div>
                            {taxaSinal > 0 && (
                              <div className="flex justify-between text-emerald-400/80 border-b border-white/5 pb-1 sm:pb-2">
                                <span>Sinal ({taxaSinal}%):</span>
                                <span>- R$ {(precoTotal * (taxaSinal / 100)).toFixed(2).replace('.', ',')}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-[#F8D1BE] text-sm sm:text-lg font-bold pt-1">
                              <span>Restante:</span>
                              <span>R$ {valorRestante.toFixed(2).replace('.', ',')}</span>
                            </div>
                          </div>
                        </div>

                        {statusPagamento === 'pendente' && (
                          <div className="mt-2 sm:mt-3 bg-black/40 border border-[#DCAE96]/20 rounded-xl p-2 sm:p-3 flex items-center gap-2 sm:gap-3 shadow-inner">
                            {isGerandoPix ? (
                              <div className="flex flex-col items-center justify-center w-full py-1 sm:py-2">
                                <Loader2 className="animate-spin text-[#C7977D] mb-1" size={16} />
                                <p className="text-[8px] sm:text-[9px] text-gray-400 uppercase tracking-widest">Gerando PIX...</p>
                              </div>
                            ) : qrCodeImagem ? (
                              <>
                                <div className="bg-white p-1 rounded-lg shrink-0 shadow-lg">
                                  <img src={`data:image/jpeg;base64,${qrCodeImagem}`} alt="QR Code PIX" className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[#E8D3C8] text-[9px] sm:text-[10px] md:text-[11px] leading-tight mb-1 font-medium truncate sm:whitespace-normal">Adiantar via PIX?</p>
                                  <p className="text-emerald-400/70 text-[7px] sm:text-[8px] uppercase tracking-widest flex items-center gap-1 truncate">
                                    <Loader2 className="animate-spin shrink-0" size={10} /> Aguardando
                                  </p>
                                </div>
                              </>
                            ) : (
                               <p className="text-[9px] text-red-400 w-full text-center">Falha de conexão.</p>
                            )}
                          </div>
                        )}

                        {statusPagamento === 'pago' && (
                          <div className="mt-2 sm:mt-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2 sm:p-4 flex flex-col items-center justify-center shadow-inner text-center">
                             <CheckCircle2 className="text-emerald-400 mb-0.5 sm:mb-1" size={20} />
                             <p className="text-emerald-400 text-xs sm:text-sm font-bold">Pagamento Confirmado!</p>
                             <p className="text-gray-400 text-[8px] sm:text-[10px] mt-0.5 sm:mt-1">Aguarde a finalização.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {abaAtiva === 'cardapio' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full flex flex-col">
                  <div className="mb-2 sm:mb-4 shrink-0">
                    <h2 className="font-serif text-xl sm:text-2xl text-[#F8D1BE] mb-0.5">Menu de Serviços</h2>
                    <p className="text-[#E8D3C8] text-[10px] sm:text-xs opacity-80">Inspire-se para a sua próxima visita.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 sm:gap-3 overflow-y-auto custom-scrollbar pb-4 pr-1 sm:pr-2 flex-1">
                    {servicosDb.length === 0 ? (
                      <p className="text-gray-500 text-xs sm:text-sm">Nenhum serviço carregado.</p>
                    ) : (
                      servicosDb.map(serv => {
                        const foto = serv.imagens?.[0]; 

                        return (
                          <div key={serv.id} className="flex bg-[#120308]/80 border border-[#DCAE96]/20 rounded-xl overflow-hidden shadow-lg h-20 sm:h-24 hover:border-[#DCAE96]/50 transition-colors">
                            <div className="w-[30%] bg-black relative shrink-0">
                              {foto ? (
                                <img src={foto} alt={serv.nome} className="w-full h-full object-cover opacity-80" />
                              ) : (
                                <div className="flex items-center justify-center h-full opacity-20"><Sparkles size={20} className="text-[#C7977D]" /></div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#120308]/90"></div>
                            </div>
                            
                            <div className="flex-1 p-2 sm:p-3 flex flex-col justify-center">
                              <h3 className="font-serif text-xs sm:text-sm text-white mb-0.5 truncate drop-shadow-md">{serv.nome}</h3>
                              <p className="text-gray-400 text-[9px] sm:text-[10px] line-clamp-1 mb-1 sm:mb-2">{serv.descricao || 'Serviço de alto padrão.'}</p>
                              
                              <div className="flex justify-between items-center mt-auto">
                                <span className="text-[#F8D1BE] font-bold text-xs sm:text-sm">R$ {serv.preco.toFixed(2).replace('.', ',')}</span>
                                <button onClick={() => {setServicoEscolhido(serv.id); setActiveTab('agendar');}} className="text-[#C7977D] flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider hover:text-white transition-colors">
                                  Agendar <ChevronRight size={10}/>
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

              {abaAtiva === 'agendar' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 min-h-full flex flex-col">
                  {agendamentoSucesso ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-[#120308]/60 border border-emerald-500/30 rounded-2xl p-6 text-center shadow-2xl">
                      <CheckCircle2 size={32} className="text-emerald-400 mb-2 sm:mb-3" />
                      <h2 className="font-serif text-lg sm:text-xl text-white mb-1">Retorno Confirmado!</h2>
                      <p className="text-[10px] sm:text-xs text-[#E8D3C8]">A Débora já recebeu o aviso.</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col">
                      <div className="mb-2 sm:mb-4 shrink-0">
                        <h2 className="font-serif text-xl sm:text-2xl text-[#F8D1BE] mb-0.5">Agende seu Retorno</h2>
                        <p className="text-[#E8D3C8] text-[10px] sm:text-xs opacity-80">Escolha os detalhes para a próxima produção.</p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1 min-h-0 bg-[#120308]/60 border border-[#DCAE96]/20 p-3 sm:p-4 rounded-2xl shadow-xl">
                        <div className="w-full sm:w-1/2 flex flex-col gap-2 sm:gap-3 sm:pr-4 sm:border-r border-[#DCAE96]/10">
                          <div>
                            <label className="block text-[9px] sm:text-[10px] text-[#C7977D] uppercase font-bold tracking-wider mb-1">1. Qual o serviço?</label>
                            <select value={servicoEscolhido} onChange={(e) => setServicoEscolhido(e.target.value)} className="w-full bg-black/50 border border-[#DCAE96]/20 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-white focus:outline-none focus:border-[#F8D1BE]">
                              <option value="">Selecione...</option>
                              {servicosDb.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                            </select>
                          </div>
                          
                          <div className="flex-1 flex flex-col min-h-0">
                            <label className="block text-[9px] sm:text-[10px] text-[#C7977D] uppercase font-bold tracking-wider mb-1">2. Data</label>
                            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                              {proximosDias.slice(0, 6).map((data, idx) => (
                                <button key={idx} onClick={() => setDataEscolhida(data)} className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg flex flex-col items-center justify-center transition-all border shrink-0 ${dataEscolhida?.getDate() === data.getDate() ? 'bg-[#DCAE96]/20 text-[#F8D1BE] border-[#F8D1BE]' : 'bg-black/30 text-gray-400 border-[#DCAE96]/10 hover:border-[#DCAE96]/40'}`}>
                                  <span className="text-[8px] sm:text-[9px] uppercase opacity-70">{data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.','')}</span>
                                  <span className="text-xs sm:text-sm font-bold">{data.getDate()}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="w-full sm:w-1/2 flex flex-col">
                          <label className="block text-[9px] sm:text-[10px] text-[#C7977D] uppercase font-bold tracking-wider mb-1">3. Horário</label>
                          <div className="grid grid-cols-3 sm:grid-cols-2 gap-1.5 sm:gap-2 mb-2 sm:mb-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
                            {horariosLivres.map(hora => (
                              <button key={hora} onClick={() => setHoraEscolhida(hora)} className={`py-1 sm:py-1.5 rounded-lg transition-all border text-[10px] sm:text-xs ${horaEscolhida === hora ? 'bg-[#DCAE96]/20 text-[#F8D1BE] font-bold border-[#F8D1BE]' : 'bg-black/30 border-[#DCAE96]/10 text-gray-400 hover:border-[#DCAE96]/40'}`}>
                                {hora}
                              </button>
                            ))}
                          </div>
                          
                          <button onClick={confirmarAgendamento} disabled={isAgendando || !servicoEscolhido || !dataEscolhida || !horaEscolhida} className="mt-auto w-full bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#0A0205] py-2 sm:py-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all disabled:opacity-30 disabled:grayscale text-[10px] sm:text-xs shadow-[0_0_15px_rgba(248,209,190,0.3)] shrink-0">
                            {isAgendando ? <Loader2 className="animate-spin" size={14} /> : <><CheckCircle2 size={14} /> Agendar</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 3px; height: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(248, 209, 190, 0.2); border-radius: 10px; }
      `}} />
    </div>
  );
}