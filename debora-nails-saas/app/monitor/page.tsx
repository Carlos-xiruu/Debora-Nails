'use client'

import { useState, useEffect } from 'react';
import { Wifi, Sparkles, Clock, CalendarDays, Image as ImageIcon, CheckCircle2, PlayCircle, Maximize, Loader2, QrCode, Download, ChevronRight, AlertCircle, ShieldCheck, Copy, Ban } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DISPONIBILIDADE_PADRAO = {
  0: { ativo: false, abertura: '08:00', fechamento: '12:00' },
  1: { ativo: true, abertura: '08:00', fechamento: '18:00' },
  2: { ativo: true, abertura: '09:00', fechamento: '19:00' },
  3: { ativo: true, abertura: '08:00', fechamento: '17:00' },
  4: { ativo: true, abertura: '10:00', fechamento: '20:00' },
  5: { ativo: true, abertura: '08:00', fechamento: '18:00' },
  6: { ativo: true, abertura: '08:00', fechamento: '13:00' }
};

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
  const [qrCodeCopiaCola, setQrCodeCopiaCola] = useState<string | null>(null);
  const [pagamentoMercadoPagoId, setPagamentoMercadoPagoId] = useState<string | null>(null);
  const [isGerandoPix, setIsGerandoPix] = useState(false);

  const [servicosDb, setServicosDb] = useState<any[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const [imagemAtualIndex, setImagemAtualIndex] = useState(0);
  
  // 🛡️ SLIDES COM O VÍDEO VERTICAL
  const slides = [
    { bg: '/trabalho.mp4', tipo: 'video' }, 
    { bg: '/01.jpg', tipo: 'intro' },
    { bg: '/debora.jpg', tipo: 'sobre' }, 
    { bg: '/02.jpg', tipo: 'intro' },
    { bg: '/make01.jpeg', tipo: 'intro' },
    { bg: '/vermelha.jpeg', tipo: 'intro' },
    { bg: '/branca-nude.jpeg', tipo: 'intro' },
    { bg: '/nude-dourada.jpeg', tipo: 'intro' }
  ];

  const [configuracoes, setConfiguracoes] = useState<any>(null);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [diasDisponiveis, setDiasDisponiveis] = useState<Date[]>([]);
  const [horariosLivres, setHorariosLivres] = useState<string[]>([]);
  
  const [servicoEscolhido, setServicoEscolhido] = useState<any>(null);
  const [dataEscolhida, setDataEscolhida] = useState<Date | null>(null);
  const [horaEscolhida, setHoraEscolhida] = useState('');
  
  const [etapaAgendamento, setEtapaAgendamento] = useState(1);
  const [isProcessandoAgendamento, setIsProcessandoAgendamento] = useState(false);
  const [qrCodeAgendamento, setQrCodeAgendamento] = useState<string | null>(null);
  const [pixIdAgendamento, setPixIdAgendamento] = useState<string | null>(null);

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

  const formatarDataLocalStr = (d: Date) => {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

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

      const { data: config } = await supabase.from('configuracoes').select('*').eq('id', 1).single();
      if (config) {
        setConfiguracoes({ 
          disponibilidade: Object.keys(config.disponibilidade).length > 0 ? config.disponibilidade : DISPONIBILIDADE_PADRAO, 
          bloqueios: config.bloqueios || [],
          mensagem_confirmacao: config.mensagem_confirmacao
        });
      }

      const hojeStr = formatarDataLocalStr(new Date());
      const { data: agends } = await supabase.from('agendamentos').select('inicio, fim').gte('inicio', `${hojeStr}T00:00:00`);
      if (agends) setAgendamentos(agends);

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
          setDataEscolhida(null);
          setHoraEscolhida('');
          setServicoEscolhido(null);
          setEtapaAgendamento(1);
          setQrCodeImagem(null);
          setQrCodeCopiaCola(null);
          setPagamentoMercadoPagoId(null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, []);

  useEffect(() => {
    if (!configuracoes) return;
    const dias = [];
    let d = new Date();
    let count = 0;
    while (count < 14) {
      d.setDate(d.getDate() + 1);
      const diaDaSemana = d.getDay();
      const regra = configuracoes.disponibilidade[diaDaSemana];
      if (regra && regra.ativo) {
        dias.push(new Date(d));
        count++;
      }
    }
    setDiasDisponiveis(dias);
  }, [configuracoes]);

  useEffect(() => {
    if (!dataEscolhida || !servicoEscolhido || !configuracoes) return;
    const dataStr = formatarDataLocalStr(dataEscolhida);
    const diaDaSemana = dataEscolhida.getDay();
    const regraDoDia = configuracoes.disponibilidade[diaDaSemana];

    if (!regraDoDia || !regraDoDia.ativo) { setHorariosLivres([]); return; }

    const aberturaMin = converterParaMinutos(regraDoDia.abertura);
    const fechamentoMin = converterParaMinutos(regraDoDia.fechamento);
    const duracaoServicoMin = extrairMinutosDuracao(servicoEscolhido.duracao);
    const passoIntervalo = 30;

    const agendsDoDia = agendamentos.filter(a => new Date(a.inicio).toISOString().split('T')[0] === dataStr);
    const blocksDoDia = configuracoes.bloqueios.filter((b: any) => b.data === dataStr);

    const slotsLivres = [];
    for (let minAtual = aberturaMin; minAtual <= (fechamentoMin - duracaoServicoMin); minAtual += passoIntervalo) {
      const fimMin = minAtual + duracaoServicoMin;
      const conflitoAgendamento = agendsDoDia.some(a => {
        const dInicio = new Date(a.inicio); const dFim = new Date(a.fim);
        const minInicio = dInicio.getHours() * 60 + dInicio.getMinutes(); const minFim = dFim.getHours() * 60 + dFim.getMinutes();
        return (minAtual < minFim) && (fimMin > minInicio);
      });
      const conflitoBloqueio = blocksDoDia.some((b: any) => {
        const minInicio = converterParaMinutos(b.inicio); const minFim = converterParaMinutos(b.fim);
        return (minAtual < minFim) && (fimMin > minInicio);
      });
      if (!conflitoAgendamento && !conflitoBloqueio) slotsLivres.push(converterParaHoraStr(minAtual));
    }
    setHorariosLivres(slotsLivres);
    setHoraEscolhida('');
  }, [dataEscolhida, servicoEscolhido, configuracoes, agendamentos]);


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
      carrossel = setInterval(() => setImagemAtualIndex((prev) => (prev + 1) % slides.length), 10000); 
    }
    return () => clearInterval(carrossel);
  }, [atendimentoAtivo, slides.length]);


  const precoTotal = dadosServicoSessao?.preco || 0;
  const taxaSinal = dadosServicoSessao?.taxa_sinal || 0;
  const valorRestante = precoTotal - (precoTotal * (taxaSinal / 100));

  useEffect(() => {
    const gerarPixFinal = async () => {
      if (!dadosServicoSessao || !sessaoData || qrCodeImagem || isGerandoPix) return;
      if (valorRestante <= 0 || statusPagamento === 'pago') return;
      
      setIsGerandoPix(true);
      try {
        const res = await fetch('/api/pagamento-monitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valor: valorRestante, descricao: `Pagamento Final - ${sessaoData.servico_nome} (${sessaoData.cliente_nome})` })
        });
        const data = await res.json();
        if (data.qr_code_base64 && data.id) {
          setQrCodeImagem(data.qr_code_base64); 
          setQrCodeCopiaCola(data.qr_code);
          setPagamentoMercadoPagoId(data.id);
        }
      } catch (error) {
        console.error("Erro ao gerar PIX", error);
      } finally {
        setIsGerandoPix(false);
      }
    };

    if (atendimentoAtivo) gerarPixFinal();
  }, [dadosServicoSessao, atendimentoAtivo, statusPagamento, valorRestante]);

  useEffect(() => {
    let intervalo: NodeJS.Timeout;
    const checarPagamento = async () => {
      if (!pagamentoMercadoPagoId) return;
      try {
        const res = await fetch('/api/checar-pagamento', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: pagamentoMercadoPagoId })
        });
        const data = await res.json();

        if (data.status === 'approved') {
          setPagamentoMercadoPagoId(null); 
          setStatusPagamento('pago'); 
          await supabase.from('sessao_monitor').update({ status_pagamento: 'pago' }).eq('id', 1);
          await supabase.from('transacoes').insert([{
            descricao: `Pagamento Restante PIX (Tablet): ${sessaoData.cliente_nome}`,
            tipo: 'entrada', valor: valorRestante, categoria: 'Atendimento'
          }]);
        }
      } catch (err) {}
    };

    if (pagamentoMercadoPagoId && statusPagamento === 'pendente') {
      intervalo = setInterval(checarPagamento, 5000); 
    }
    return () => clearInterval(intervalo);
  }, [pagamentoMercadoPagoId, statusPagamento, sessaoData, valorRestante]);


  const iniciarProcessoAgendamento = async () => {
    if (!servicoEscolhido || !dataEscolhida || !horaEscolhida) return;
    setIsProcessandoAgendamento(true);

    const dataFiltroBase = formatarDataLocalStr(new Date(dataEscolhida));
    const inicioDate = new Date(`${dataFiltroBase}T${horaEscolhida}:00-03:00`);
    const duracaoMins = extrairMinutosDuracao(servicoEscolhido.duracao);
    const fimDate = new Date(inicioDate);
    fimDate.setMinutes(fimDate.getMinutes() + duracaoMins);

    const { data: vagaOcupada } = await supabase.from('agendamentos').select('id')
      .lt('inicio', fimDate.toISOString()).gt('fim', inicioDate.toISOString());

    if (vagaOcupada && vagaOcupada.length > 0) {
      alert("Poxa! 😢 Alguém acabou de reservar esse horário online. Por favor, escolha outro.");
      setIsProcessandoAgendamento(false);
      setEtapaAgendamento(1);
      return; 
    }

    const valorSinal = servicoEscolhido.preco * (servicoEscolhido.taxa_sinal / 100);

    if (valorSinal > 0) {
      try {
        const res = await fetch('/api/pagamento-monitor', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valor: valorSinal, descricao: `Sinal Retorno - ${servicoEscolhido.nome}` })
        });
        const data = await res.json();
        if (data.id) {
          setQrCodeAgendamento(data.qr_code_base64);
          setPixIdAgendamento(data.id);
          setEtapaAgendamento(2); 
        }
      } catch (e) { alert("Erro ao gerar QR Code de reserva."); }
    } else {
      salvarAgendamentoRetornoBD(inicioDate, fimDate, 0);
    }
    setIsProcessandoAgendamento(false);
  };

  useEffect(() => {
    let intervaloRetorno: NodeJS.Timeout;
    if (pixIdAgendamento && etapaAgendamento === 2) {
      intervaloRetorno = setInterval(async () => {
        try {
          const res = await fetch('/api/checar-pagamento', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: pixIdAgendamento })
          });
          const data = await res.json();
          if (data.status === 'approved') {
            clearInterval(intervaloRetorno);
            setPixIdAgendamento(null);
            
            const dataFiltroBase = formatarDataLocalStr(new Date(dataEscolhida!));
            const inicioDate = new Date(`${dataFiltroBase}T${horaEscolhida}:00-03:00`);
            const duracaoMins = extrairMinutosDuracao(servicoEscolhido.duracao);
            const fimDate = new Date(inicioDate);
            fimDate.setMinutes(fimDate.getMinutes() + duracaoMins);
            const valorSinal = servicoEscolhido.preco * (servicoEscolhido.taxa_sinal / 100);
            
            salvarAgendamentoRetornoBD(inicioDate, fimDate, valorSinal);
          }
        } catch (e) {}
      }, 5000);
    }
    return () => clearInterval(intervaloRetorno);
  }, [pixIdAgendamento, etapaAgendamento, servicoEscolhido, dataEscolhida, horaEscolhida]);

  const salvarAgendamentoRetornoBD = async (inicioDate: Date, fimDate: Date, valorSinal: number) => {
    const { data: clienteData } = await supabase.from('clientes').select('id, telefone').eq('nome', sessaoData.cliente_nome).limit(1).single();
    
    if (clienteData) {
      await supabase.from('agendamentos').insert([{
        cliente_id: clienteData.id, servico_id: servicoEscolhido.id,
        tipo: 'agendado', inicio: inicioDate.toISOString(), fim: fimDate.toISOString()
      }]);

      if (valorSinal > 0) {
        await supabase.from('transacoes').insert([{
          descricao: `Sinal Retorno PIX (Tablet): ${sessaoData.cliente_nome}`,
          tipo: 'entrada', valor: valorSinal, categoria: 'Sinal'
        }]);
      }

      if (clienteData.telefone) {
        const dataFormatada = inicioDate.toLocaleDateString('pt-BR');
        const textoBase = configuracoes?.mensagem_confirmacao || "Oii! 💕 Passando para confirmar seu retorno.";
        const sinalTexto = valorSinal > 0 ? '\n✅ *Sinal recebido com sucesso!*' : '';
        const mensagemCliente = `${textoBase}\n\n*Detalhes do Retorno:*\n👤 Cliente: ${sessaoData.cliente_nome.split(' ')[0]}\n💅 Serviço: *${servicoEscolhido.nome}*\n📅 Data: *${dataFormatada}*\n⏰ Horário: *${horaEscolhida}*${sinalTexto}\n\nTe esperamos! ✨`;
        
        try {
          await fetch('/api/whatsapp', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telefone: clienteData.telefone, mensagem: mensagemCliente })
          });
        } catch (e) {}
      }
    }
    
    setEtapaAgendamento(3); 
    setTimeout(() => { setActiveTab('inicio'); setEtapaAgendamento(1); }, 5000);
  };

  const ativarTelaCheia = () => { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); };
  const formatarTempo = (s: number) => {
    if (s < 0) return "00:00";
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
    return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-[100dvh] w-full bg-[#0A0205] text-white flex flex-row overflow-hidden font-sans select-none relative pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <button onClick={ativarTelaCheia} className="absolute top-2 left-2 z-50 p-2 text-[#C7977D] opacity-20 hover:opacity-100 bg-black/40 rounded-full transition-opacity"><Maximize size={16} /></button>
      
      {deferredPrompt && (
        <button onClick={handleInstallClick} className="absolute top-2 right-2 z-50 flex items-center gap-1.5 bg-[#00B1EA] text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-[0_0_15px_rgba(0,177,234,0.4)] animate-pulse">
          <Download size={12} /> Instalar
        </button>
      )}

      {/* MODO DESCANSO */}
      {!atendimentoAtivo && (
        <div className="absolute inset-0 z-0 flex flex-col justify-between h-[100dvh] bg-black overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          
          {/* 🛡️ RENDERIZADOR DE SLIDES (VOLTAMOS PARA OS 3 VÍDEOS COM PRELOAD) */}
          {slides.map((slide, idx) => {
            if (slide.tipo === 'video') {
              return (
                <div key={idx} className="absolute inset-0 flex gap-2 sm:gap-4 p-2 sm:p-4" style={{ opacity: idx === imagemAtualIndex ? 0.4 : 0, transition: 'opacity 2s ease-in-out' }}>
                  {/* Tríptico: 3 Colunas com preload="auto" para carregar junto e evitar engasgos */}
                  <div className="flex-1 rounded-3xl overflow-hidden border border-[#DCAE96]/20 shadow-2xl">
                    <video src={slide.bg} autoPlay loop muted playsInline preload="auto" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 rounded-3xl overflow-hidden border border-[#DCAE96]/20 shadow-2xl hidden sm:block">
                    <video src={slide.bg} autoPlay loop muted playsInline preload="auto" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 rounded-3xl overflow-hidden border border-[#DCAE96]/20 shadow-2xl hidden md:block">
                    <video src={slide.bg} autoPlay loop muted playsInline preload="auto" className="w-full h-full object-cover" />
                  </div>
                </div>
              );
            }
            return (
              <div key={idx} className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[2000ms]" style={{ backgroundImage: `url('${slide.bg}')`, opacity: idx === imagemAtualIndex ? 0.4 : 0, transform: idx === imagemAtualIndex ? 'scale(1.03)' : 'scale(1)', transition: 'opacity 2s ease-in-out, transform 10s ease-out' }} />
            );
          })}
          
          {/* EFEITO FUMÊ GERAL */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0205] via-[#0A0205]/40 to-[#0A0205]/90 z-10 pointer-events-none"></div>
          
          <header className="w-full p-4 md:px-8 flex justify-between items-center z-30 shrink-0">
            <div className="flex items-center gap-3 pl-8">
              <img src="/fotonova.jpeg" className="h-10 w-10 rounded-full object-cover border border-[#C7977D]" alt="Débora Silva" />
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

          <main className="flex-1 flex flex-col items-center justify-center text-center z-30 px-4 overflow-hidden w-full">
            {(slides[imagemAtualIndex].tipo === 'intro' || slides[imagemAtualIndex].tipo === 'video') ? (
              <div className="animate-in zoom-in-95 duration-700 fade-in my-auto py-4">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="w-12 md:w-20 h-[1px] bg-gradient-to-r from-transparent to-[#C7977D]/80"></div>
                  <Sparkles size={24} className="text-[#C7977D] opacity-90 animate-pulse" />
                  <div className="w-12 md:w-20 h-[1px] bg-gradient-to-l from-transparent to-[#C7977D]/80"></div>
                </div>
                <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-white mb-4 tracking-wide drop-shadow-[0_2px_15px_rgba(0,0,0,1)]">
                  Cuidado em cada <span className="text-[#F8D1BE] italic">detalhe</span>.
                </h1>
                <p className="text-sm md:text-xl text-[#E8D3C8] font-light tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  Uma pausa merecida para o seu bem-estar começará em breve.
                </p>
              </div>
            ) : slides[imagemAtualIndex].tipo === 'sobre' ? (
              <div className="animate-in zoom-in-95 duration-700 fade-in my-auto py-4 flex flex-col items-center">
                <img src="/fotonova.jpeg" className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border border-[#C7977D] mb-4 shadow-[0_0_20px_rgba(199,151,125,0.4)]" alt="Débora" />
                <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl text-white mb-4 tracking-wide drop-shadow-[0_2px_15px_rgba(0,0,0,1)]">
                  Muito prazer, sou a <span className="text-[#F8D1BE] italic">Debora.</span>
                </h2>
                <p className="text-sm md:text-xl text-[#E8D3C8] font-light tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] max-w-2xl px-4 leading-relaxed">
                  Há mais de 6 anos transformando autoestima com dedicação e amor. A verdadeira beleza mora na simplicidade de se sentir bem e confiante.
                </p>
              </div>
            ) : null}
          </main>

          <footer className="w-full p-4 z-30 flex justify-center gap-2 shrink-0">
            {slides.map((_, idx) => (
              <div key={idx} className={`h-1 rounded-full transition-all duration-500 ${idx === imagemAtualIndex ? 'w-8 bg-[#F8D1BE] shadow-[0_0_10px_#F8D1BE]' : 'w-3 bg-white/20'}`}></div>
            ))}
          </footer>
        </div>
      )}

      {/* MODO SESSÃO VIP ATIVA */}
      {atendimentoAtivo && sessaoData && (
        <div className="absolute inset-0 z-40 flex flex-row bg-[#0A0205] animate-in slide-in-from-bottom-8 duration-700 h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] overflow-hidden">
          
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#DCAE96]/10 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDuration: '6s' }}></div>
          
          <aside className="w-[30%] min-w-[140px] sm:min-w-[200px] max-w-[260px] bg-[#120308]/90 backdrop-blur-xl border-r border-[#DCAE96]/20 flex flex-col z-20 h-full shrink-0 shadow-2xl">
            <div className="p-3 sm:p-5 border-b border-[#DCAE96]/10 flex flex-col items-start shrink-0">
              <img src="/fotonova.jpeg" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover mb-2 border border-[#C7977D] shadow-lg" alt="Débora Silva" />
              <p className="text-[8px] sm:text-[9px] text-[#C7977D] uppercase tracking-[0.1em] sm:tracking-[0.15em] mb-0.5 font-bold">Sessão Exclusiva</p>
              <h2 className="font-serif text-base sm:text-xl text-[#F8D1BE] truncate w-full drop-shadow-md">{sessaoData.cliente_nome.split(' ')[0]}</h2>
            </div>

            <nav className="flex-1 p-2 sm:p-3 flex flex-col gap-1 sm:gap-2 overflow-y-auto custom-scrollbar min-h-0">
              <button onClick={() => setActiveTab('inicio')} className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl transition-all ${abaAtiva === 'inicio' ? 'bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#0A0205] font-bold shadow-[0_0_20px_rgba(248,209,190,0.4)]' : 'text-[#E8D3C8] hover:bg-[#DCAE96]/10 hover:text-white'}`}>
                <Sparkles size={16} className="shrink-0" /> <span className="text-xs sm:text-sm">Atendimento</span>
              </button>
              <button onClick={() => setActiveTab('cardapio')} className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl transition-all ${abaAtiva === 'cardapio' ? 'bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#0A0205] font-bold shadow-[0_0_20px_rgba(248,209,190,0.4)]' : 'text-[#E8D3C8] hover:bg-[#DCAE96]/10 hover:text-white'}`}>
                <ImageIcon size={16} className="shrink-0" /> <span className="text-xs sm:text-sm">Serviços</span>
              </button>
              <button onClick={() => { setActiveTab('agendar'); setEtapaAgendamento(1); }} className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl transition-all ${abaAtiva === 'agendar' ? 'bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#0A0205] font-bold shadow-[0_0_20px_rgba(248,209,190,0.4)]' : 'text-[#E8D3C8] hover:bg-[#DCAE96]/10 hover:text-white'}`}>
                <CalendarDays size={16} className="shrink-0" /> <span className="text-xs sm:text-sm">Agendar</span>
              </button>
            </nav>

            <div className="p-2 sm:p-4 border-t border-[#DCAE96]/10 shrink-0">
              <div className="bg-black/40 p-2 sm:p-3 rounded-lg flex items-center justify-between border border-[#DCAE96]/10">
                <div>
                  <p className="text-[8px] sm:text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">Wi-Fi Premium</p>
                  <p className="text-[9px] sm:text-[11px] text-[#F8D1BE]">Rede: <span className="font-bold text-white">Madalenas 5G</span></p>
                  <p className="text-[9px] sm:text-[11px] text-[#F8D1BE]">Senha: <span className="font-bold text-white">madalenas2025</span></p>
                </div>
                <Wifi className="text-[#C7977D] opacity-80" size={14} />
              </div>
            </div>
          </aside>

          <main className="flex-1 relative z-10 flex flex-col h-[100dvh] overflow-hidden min-h-0">
            <header className="p-2 sm:p-4 flex justify-end shrink-0">
              <div className="flex items-center gap-2 bg-[#120308]/60 border border-[#DCAE96]/20 backdrop-blur-md px-3 py-1 sm:px-4 sm:py-1.5 rounded-full shadow-lg">
                <Clock size={12} className="text-[#C7977D]" />
                <span className="text-white font-medium text-xs sm:text-sm tracking-widest">{horaAtual}</span>
              </div>
            </header>

            <div className="flex-1 px-4 pb-4 sm:px-6 sm:pb-6 overflow-hidden flex flex-col min-h-0">
              
              {abaAtiva === 'inicio' && (
                <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-0">
                  <div className="mb-2 shrink-0">
                    <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-white mb-0.5 leading-tight drop-shadow-lg">
                      {saudacao}, <span className="text-[#F8D1BE]">{sessaoData.cliente_nome.split(' ')[0]}!</span> ✨
                    </h1>
                    <p className="text-[10px] sm:text-xs text-[#E8D3C8] font-light opacity-80">Relaxe e aproveite o seu momento.</p>
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-4 w-full min-h-0">
                    
                    {/* ESQUERDA: CRONÔMETRO */}
                    <div className="flex-1 bg-gradient-to-br from-[#1A050B] to-[#0A0205] border border-[#DCAE96]/20 p-3 sm:p-4 rounded-2xl shadow-xl flex flex-col justify-between min-h-0 overflow-hidden">
                      <div>
                        <p className="text-[#C7977D] text-[9px] sm:text-[10px] uppercase tracking-widest font-bold mb-1">Em Andamento</p>
                        <h2 className="font-serif text-base sm:text-xl text-white leading-tight drop-shadow-md truncate">{sessaoData.servico_nome}</h2>
                      </div>
                      <div className="bg-black/50 border border-[#DCAE96]/10 rounded-xl p-2 flex flex-col items-center justify-center mt-auto shadow-inner min-h-[60px] shrink-0">
                        <PlayCircle size={14} className="text-[#F8D1BE] mb-1 animate-pulse" />
                        <span className="font-mono text-2xl sm:text-3xl text-white tracking-widest font-light drop-shadow-[0_0_10px_rgba(248,209,190,0.5)]">{formatarTempo(tempoDecorrido)}</span>
                      </div>
                    </div>

                    {/* DIREITA: RESUMO FINANCEIRO (BLINDADO CONTRA SCROLL) */}
                    {dadosServicoSessao && (
                      <div className="flex-1 bg-[#120308]/80 border border-[#DCAE96]/20 p-2 sm:p-4 rounded-2xl shadow-xl flex flex-col min-h-0 overflow-hidden justify-between">
                        
                        <div className="flex justify-between items-center mb-1 border-b border-[#DCAE96]/10 pb-1 shrink-0">
                          <h3 className="font-serif text-sm sm:text-base text-white">Resumo</h3>
                          {valorRestante <= 0 || statusPagamento === 'pago' ? (
                             <span className="bg-emerald-500/20 text-emerald-400 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 size={10}/> Pago</span>
                          ) : null}
                        </div>
                        
                        <div className="space-y-1 text-[10px] sm:text-xs shrink-0">
                          <div className="flex justify-between text-gray-400">
                            <span>Total:</span>
                            <span>R$ {precoTotal.toFixed(2).replace('.', ',')}</span>
                          </div>
                          {taxaSinal > 0 && (
                            <div className="flex justify-between text-emerald-400/80 border-b border-white/5 pb-1">
                              <span>Sinal ({taxaSinal}%):</span>
                              <span>- R$ {(precoTotal * (taxaSinal / 100)).toFixed(2).replace('.', ',')}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-[#F8D1BE] text-sm sm:text-base font-bold pt-1">
                            <span>Restante:</span>
                            <span>R$ {Math.max(0, valorRestante).toFixed(2).replace('.', ',')}</span>
                          </div>
                        </div>

                        {/* CAIXA DE PAGAMENTO EXTREMAMENTE COMPACTA */}
                        <div className="mt-auto pt-2 shrink-0">
                          {valorRestante > 0 && statusPagamento === 'pendente' && (
                            <div className="bg-black/40 border border-[#DCAE96]/20 rounded-xl p-1.5 sm:p-2 flex flex-row items-center gap-2 shadow-inner h-16 sm:h-20">
                              {isGerandoPix ? (
                                <div className="flex flex-col items-center justify-center w-full">
                                  <Loader2 className="animate-spin text-[#C7977D] mb-1" size={14} />
                                  <p className="text-[8px] text-gray-400 uppercase tracking-widest">Gerando PIX...</p>
                                </div>
                              ) : qrCodeImagem ? (
                                <>
                                  <div className="bg-white p-1 rounded-lg shrink-0 shadow-lg h-full aspect-square flex items-center justify-center">
                                    <img src={`data:image/jpeg;base64,${qrCodeImagem}`} alt="QR Code" className="w-full h-full object-contain" />
                                  </div>
                                  <div className="flex flex-col justify-center min-w-0 flex-1">
                                    <p className="text-[#E8D3C8] text-[9px] sm:text-[10px] leading-tight mb-0.5 font-bold truncate">Pagar Restante</p>
                                    <p className="text-emerald-400/70 text-[7px] sm:text-[8px] uppercase tracking-widest flex items-center gap-1">
                                      <Loader2 className="animate-spin shrink-0" size={10} /> Aguardando
                                    </p>
                                  </div>
                                </>
                              ) : (
                                 <p className="text-[9px] text-red-400 w-full text-center">Falha de conexão.</p>
                              )}
                            </div>
                          )}

                          {(valorRestante <= 0 || statusPagamento === 'pago') && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2 flex flex-row items-center justify-center gap-2 shadow-inner h-12 sm:h-16">
                               <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />
                               <div className="flex flex-col text-left">
                                 <p className="text-emerald-400 text-xs font-bold leading-tight">Confirmado!</p>
                                 <p className="text-gray-400 text-[8px] sm:text-[9px]">Aguarde finalização.</p>
                               </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {abaAtiva === 'cardapio' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full flex flex-col min-h-0">
                  <div className="mb-2 sm:mb-4 shrink-0">
                    <h2 className="font-serif text-xl sm:text-2xl text-[#F8D1BE] mb-0.5">Menu de Serviços</h2>
                    <p className="text-[#E8D3C8] text-[10px] sm:text-xs opacity-80">Inspire-se para a sua próxima visita.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 sm:gap-3 overflow-y-auto custom-scrollbar pr-1 flex-1 min-h-0">
                    {servicosDb.length === 0 ? (
                      <p className="text-gray-500 text-xs sm:text-sm">Nenhum serviço carregado.</p>
                    ) : (
                      servicosDb.map(serv => (
                        <div key={serv.id} className="flex bg-[#120308]/80 border border-[#DCAE96]/20 rounded-xl overflow-hidden shadow-lg h-20 sm:h-24 hover:border-[#DCAE96]/50 transition-colors shrink-0">
                          <div className="w-[30%] bg-black relative shrink-0">
                            {serv.imagens?.[0] ? (
                              <img src={serv.imagens[0]} alt={serv.nome} className="w-full h-full object-cover opacity-80" />
                            ) : (
                              <div className="flex items-center justify-center h-full opacity-20"><Sparkles size={20} className="text-[#C7977D]" /></div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#120308]/90"></div>
                          </div>
                          
                          <div className="flex-1 p-2 sm:p-3 flex flex-col justify-center min-w-0">
                            <h3 className="font-serif text-xs sm:text-sm text-white mb-0.5 truncate drop-shadow-md">{serv.nome}</h3>
                            <p className="text-gray-400 text-[9px] sm:text-[10px] line-clamp-1 mb-1">{serv.descricao || 'Serviço premium.'}</p>
                            
                            <div className="flex justify-between items-center mt-auto">
                              <span className="text-[#F8D1BE] font-bold text-xs sm:text-sm">R$ {serv.preco.toFixed(2).replace('.', ',')}</span>
                              <button onClick={() => {setServicoEscolhido(serv); setActiveTab('agendar'); setEtapaAgendamento(1);}} className="text-[#C7977D] flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider hover:text-white transition-colors shrink-0">
                                Agendar <ChevronRight size={10}/>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {abaAtiva === 'agendar' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full flex flex-col min-h-0">
                  <div className="mb-2 shrink-0">
                    <h2 className="font-serif text-xl sm:text-2xl text-[#F8D1BE] mb-0.5">Agende seu Retorno</h2>
                    <p className="text-[#E8D3C8] text-[10px] sm:text-xs opacity-80">Garante sua próxima vaga e pague o sinal agora mesmo.</p>
                  </div>
                  
                  <div className="flex-1 flex bg-[#120308]/60 border border-[#DCAE96]/20 rounded-2xl shadow-xl min-h-0 overflow-hidden">
                    
                    {etapaAgendamento === 1 && (
                      <div className="w-full flex flex-col sm:flex-row p-3 sm:p-4 gap-3 sm:gap-4 overflow-y-auto custom-scrollbar">
                        <div className="w-full sm:w-1/2 flex flex-col gap-2 sm:gap-3 sm:pr-4 sm:border-r border-[#DCAE96]/10 shrink-0">
                          <div>
                            <label className="block text-[9px] sm:text-[10px] text-[#C7977D] uppercase font-bold tracking-wider mb-1">1. Qual o serviço?</label>
                            <select value={servicoEscolhido?.id || ''} onChange={(e) => setServicoEscolhido(servicosDb.find(s => s.id === e.target.value))} className="w-full bg-black/50 border border-[#DCAE96]/20 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-white focus:outline-none focus:border-[#F8D1BE]">
                              <option value="">Selecione o serviço...</option>
                              {servicosDb.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                            </select>
                          </div>
                          <div className="flex-1 flex flex-col min-h-0">
                            <label className="block text-[9px] sm:text-[10px] text-[#C7977D] uppercase font-bold tracking-wider mb-1">2. Data</label>
                            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                              {diasDisponiveis.slice(0, 7).map((data, idx) => (
                                <button key={idx} onClick={() => setDataEscolhida(data)} className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg flex flex-col items-center justify-center transition-all border shrink-0 ${dataEscolhida?.getDate() === data.getDate() ? 'bg-[#DCAE96]/20 text-[#F8D1BE] border-[#F8D1BE] shadow-lg' : 'bg-black/30 text-gray-400 border-[#DCAE96]/10 hover:border-[#DCAE96]/40'}`}>
                                  <span className="text-[8px] sm:text-[9px] uppercase opacity-70">{data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.','')}</span>
                                  <span className="text-xs sm:text-sm font-bold">{data.getDate()}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="w-full sm:w-1/2 flex flex-col min-h-0">
                          <label className="block text-[9px] sm:text-[10px] text-[#C7977D] uppercase font-bold tracking-wider mb-1">3. Horário</label>
                          {horariosLivres.length === 0 && dataEscolhida && servicoEscolhido ? (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 flex items-center justify-center gap-2 h-10"><Ban size={12} className="text-red-400"/><span className="text-[9px] text-red-400">Sem horários livres</span></div>
                          ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-2 gap-1.5 mb-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
                              {horariosLivres.map(hora => (
                                <button key={hora} onClick={() => setHoraEscolhida(hora)} className={`py-1.5 rounded-lg transition-all border text-[10px] sm:text-xs h-8 ${horaEscolhida === hora ? 'bg-[#DCAE96]/20 text-[#F8D1BE] font-bold border-[#F8D1BE]' : 'bg-black/30 border-[#DCAE96]/10 text-gray-400 hover:border-[#DCAE96]/40'}`}>
                                  {hora}
                                </button>
                              ))}
                            </div>
                          )}
                          
                          <button onClick={iniciarProcessoAgendamento} disabled={isProcessandoAgendamento || !servicoEscolhido || !dataEscolhida || !horaEscolhida} className="mt-auto w-full bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#0A0205] py-2 sm:py-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-30 text-[10px] sm:text-xs shrink-0 shadow-[0_0_15px_rgba(248,209,190,0.3)]">
                            {isProcessandoAgendamento ? <Loader2 className="animate-spin" size={14} /> : servicoEscolhido?.taxa_sinal > 0 ? <><QrCode size={14} /> Pagar Sinal (R$ {(servicoEscolhido.preco * (servicoEscolhido.taxa_sinal / 100)).toFixed(2).replace('.', ',')})</> : <><CheckCircle2 size={14} /> Agendar Agora</>}
                          </button>
                        </div>
                      </div>
                    )}

                    {etapaAgendamento === 2 && (
                      <div className="w-full flex flex-col items-center justify-center p-4 animate-in zoom-in-95 text-center bg-black/40">
                        <h3 className="text-[#00B1EA] font-bold mb-2 flex items-center gap-2 text-sm"><QrCode size={16}/> Escaneie para Confirmar a Vaga</h3>
                        <p className="text-[9px] sm:text-[10px] text-gray-400 mb-3">Sinal exigido de R$ {(servicoEscolhido.preco * (servicoEscolhido.taxa_sinal / 100)).toFixed(2).replace('.', ',')} para {servicoEscolhido.nome}.</p>
                        <div className="bg-white p-2 rounded-xl mb-3 shadow-[0_0_20px_rgba(0,177,234,0.3)] w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
                          {qrCodeAgendamento ? <img src={`data:image/jpeg;base64,${qrCodeAgendamento}`} className="w-full h-full object-contain" /> : <Loader2 className="animate-spin text-[#00B1EA]" size={24} />}
                        </div>
                        <div className="flex items-center gap-2 text-emerald-400 text-[9px] font-bold uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                           <Loader2 className="animate-spin shrink-0" size={12} /> Aguardando Pagamento...
                        </div>
                      </div>
                    )}

                    {etapaAgendamento === 3 && (
                      <div className="w-full flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 bg-black/40">
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-3 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                          <CheckCircle2 size={24} className="text-emerald-400" />
                        </div>
                        <h2 className="font-serif text-lg sm:text-xl text-white mb-1">Vaga Reservada!</h2>
                        <p className="text-[10px] sm:text-xs text-gray-400">Você receberá a confirmação no WhatsApp do seu celular.</p>
                      </div>
                    )}

                  </div>
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