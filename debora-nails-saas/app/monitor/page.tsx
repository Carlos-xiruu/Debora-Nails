'use client'

import { useState, useEffect } from 'react';
import { Wifi, Sparkles, Clock, CalendarDays, Image as ImageIcon, CheckCircle2, PlayCircle, Maximize, Loader2, QrCode, Download, ChevronRight, AlertCircle, ShieldCheck, Copy, Ban, Crown, Info, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Image from 'next/image';

const DISPONIBILIDADE_PADRAO = {
  0: { ativo: false, abertura: '08:00', fechamento: '12:00' },
  1: { ativo: true, abertura: '08:00', fechamento: '18:00' },
  2: { ativo: true, abertura: '09:00', fechamento: '19:00' },
  3: { ativo: true, abertura: '08:00', fechamento: '17:00' },
  4: { ativo: true, abertura: '10:00', fechamento: '20:00' },
  5: { ativo: true, abertura: '08:00', fechamento: '18:00' },
  6: { ativo: true, abertura: '08:00', fechamento: '13:00' }
};

const FRASES_INSTAGRAMAVEIS = [
  "Sua única competição é com a mulher maravilhosa que você está se tornando. ✨",
  "O mundo fica muito mais bonito quando você decide brilhar. 💖",
  "Unhas feitas, autoestima blindada e pronta para conquistar o mundo. 💅",
  "Um momento de pausa para quem passa a vida fazendo acontecer. 🥂",
  "Você é o seu projeto mais importante. Invista em você. 👑",
  "A verdadeira beleza começa no momento em que você decide ser você mesma. 🌷",
  "Que a sua semana seja tão impecável quanto as suas unhas. ✨",
  "O seu brilho é único, não deixe ninguém apagar. 💎"
];

export default function MonitorPage() {
  const [horaAtual, setHoraAtual] = useState('');
  const [saudacao, setSaudacao] = useState('Olá');
  
  const [abaAtiva, setActiveTab] = useState<'inicio' | 'cardapio' | 'agendar' | 'ideias'>('inicio');
  const [atendimentoAtivo, setAtendimentoAtivo] = useState(false);
  
  const [sessaoData, setSessaoData] = useState<any>(null);
  const [dadosServicoSessao, setDadosServicoSessao] = useState<any>(null);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  
  const [fraseDoDia, setFraseDoDia] = useState('');

  const [statusPagamento, setStatusPagamento] = useState('pendente');
  const [qrCodeImagem, setQrCodeImagem] = useState<string | null>(null);
  const [qrCodeCopiaCola, setQrCodeCopiaCola] = useState<string | null>(null);
  const [pagamentoMercadoPagoId, setPagamentoMercadoPagoId] = useState<string | null>(null);
  const [isGerandoPix, setIsGerandoPix] = useState(false);

  const [servicosDb, setServicosDb] = useState<any[]>([]);
  const [pacotesDb, setPacotesDb] = useState<any[]>([]); 
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const [imagemAtualIndex, setImagemAtualIndex] = useState(0);
  
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
  const [sessoesSelecionadas, setSessoesSelecionadas] = useState<{data: Date, hora: string}[]>([]);

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
    const tzOffset = d.getTimezoneOffset() * 60000; 
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
    return localISOTime;
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
      const { data: servs } = await supabase.from('servicos').select('*').eq('ativo', true).order('preco');
      if (servs) {
        setServicosDb(servs.filter(s => !s.is_pacote));
        setPacotesDb(servs.filter(s => s.is_pacote));
      }

      const { data: config } = await supabase.from('configuracoes').select('*').eq('id', 1).single();
      if (config) {
        setConfiguracoes({ 
          disponibilidade: Object.keys(config.disponibilidade).length > 0 ? config.disponibilidade : DISPONIBILIDADE_PADRAO, 
          bloqueios: config.bloqueios || [],
          mensagem_confirmacao: config.mensagem_confirmacao
        });
      }

      const hojeStr = formatarDataLocalStr(new Date());
      const { data: agends } = await supabase.from('agendamentos').select('inicio, fim').gte('inicio', `${hojeStr}T00:00:00-03:00`);
      if (agends) setAgendamentos(agends);

      const { data: sessao } = await supabase.from('sessao_monitor').select('*').eq('id', 1).single();
      if (sessao) {
        setAtendimentoAtivo(sessao.ativo);
        setSessaoData(sessao);
        setStatusPagamento(sessao.status_pagamento || 'pendente');
        if (sessao.ativo && sessao.servico_nome) {
          carregarDetalhesServico(sessao.servico_nome);
          setFraseDoDia(FRASES_INSTAGRAMAVEIS[Math.floor(Math.random() * FRASES_INSTAGRAMAVEIS.length)]);
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
          setFraseDoDia(FRASES_INSTAGRAMAVEIS[Math.floor(Math.random() * FRASES_INSTAGRAMAVEIS.length)]);
        } else {
          setActiveTab('inicio');
          setDadosServicoSessao(null);
          setDataEscolhida(null);
          setHoraEscolhida('');
          setServicoEscolhido(null);
          setSessoesSelecionadas([]);
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
    d.setHours(0,0,0,0);
    let count = 0;
    
    while (count < 45) {
      const diaDaSemana = d.getDay();
      const regra = configuracoes.disponibilidade[diaDaSemana];
      if (regra && regra.ativo) {
        dias.push(new Date(d));
        count++;
      }
      d.setDate(d.getDate() + 1);
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
      
      const conflitoNoCarrinho = sessoesSelecionadas.some(s => {
          if(formatarDataLocalStr(new Date(s.data)) !== dataStr) return false;
          const minCarrinho = converterParaMinutos(s.hora);
          const fimCarrinho = minCarrinho + duracaoServicoMin;
          return (minAtual < fimCarrinho) && (fimMin > minCarrinho);
      });

      if (!conflitoAgendamento && !conflitoBloqueio && !conflitoNoCarrinho) slotsLivres.push(converterParaHoraStr(minAtual));
    }
    setHorariosLivres(slotsLivres);
    setHoraEscolhida('');
  }, [dataEscolhida, servicoEscolhido, configuracoes, agendamentos, sessoesSelecionadas]);

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
  const isUpsell = dadosServicoSessao && !dadosServicoSessao.is_pacote && pacotesDb.length > 0;

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

  // 🛡️ FUNÇÕES DE PACOTE (Avançar e Voltar) RESTAURADAS!
  const avancarData = () => {
    const novaSessao = { data: dataEscolhida!, hora: horaEscolhida };
    const numSessoes = servicoEscolhido?.qtd_sessoes || 1;

    if (sessoesSelecionadas.length + 1 < numSessoes) {
      const proximaDataAlvo = new Date(dataEscolhida!);
      proximaDataAlvo.setDate(proximaDataAlvo.getDate() + 15);
      proximaDataAlvo.setHours(0,0,0,0);

      let dataSugerida = null;
      for (const dia of diasDisponiveis) {
        if (dia.getTime() >= proximaDataAlvo.getTime()) {
          dataSugerida = dia;
          break;
        }
      }

      setSessoesSelecionadas([...sessoesSelecionadas, novaSessao]);
      setDataEscolhida(dataSugerida); 
      setHoraEscolhida('');
    }
  };

  const desfazerUltimaData = () => {
    const sessoesSalvas = [...sessoesSelecionadas];
    const ultimaSessao = sessoesSalvas.pop();
    if (ultimaSessao) {
      setSessoesSelecionadas(sessoesSalvas);
      setDataEscolhida(ultimaSessao.data);
      setHoraEscolhida(ultimaSessao.hora);
    }
  };

  const iniciarProcessoAgendamento = async () => {
    if (!servicoEscolhido || !dataEscolhida || !horaEscolhida) return;
    setIsProcessandoAgendamento(true);

    const sessoesFinais = [...sessoesSelecionadas, { data: dataEscolhida!, hora: horaEscolhida }];

    for (const sessao of sessoesFinais) {
      const dataFiltroBase = formatarDataLocalStr(new Date(sessao.data));
      const inicioDate = new Date(`${dataFiltroBase}T${sessao.hora}:00-03:00`);
      const duracaoMins = extrairMinutosDuracao(servicoEscolhido.duracao);
      const fimDate = new Date(inicioDate);
      fimDate.setMinutes(fimDate.getMinutes() + duracaoMins);

      const { data: vagaOcupada } = await supabase.from('agendamentos').select('id')
        .lt('inicio', fimDate.toISOString()).gt('fim', inicioDate.toISOString());

      if (vagaOcupada && vagaOcupada.length > 0) {
        alert(`Poxa! 😢 Alguém acabou de reservar o horário das ${sessao.hora}. Por favor, recomece.`);
        setIsProcessandoAgendamento(false);
        setSessoesSelecionadas([]);
        setDataEscolhida(null);
        setHoraEscolhida('');
        return; 
      }
    }

    setSessoesSelecionadas(sessoesFinais);

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
      salvarAgendamentoRetornoBD(sessoesFinais, 0);
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
            const valorSinal = servicoEscolhido.preco * (servicoEscolhido.taxa_sinal / 100);
            salvarAgendamentoRetornoBD(sessoesSelecionadas, valorSinal);
          }
        } catch (e) {}
      }, 5000);
    }
    return () => clearInterval(intervaloRetorno);
  }, [pixIdAgendamento, etapaAgendamento, servicoEscolhido, sessoesSelecionadas]);

  const salvarAgendamentoRetornoBD = async (sessoesParaSalvar: any[], valorSinal: number) => {
    const { data: clienteData } = await supabase.from('clientes').select('id, telefone').eq('nome', sessaoData.cliente_nome).limit(1).single();
    
    if (clienteData) {
      const grupoPacoteId = servicoEscolhido.is_pacote ? crypto.randomUUID() : null;
      const agendamentosParaInserir = [];

      for (const sessao of sessoesParaSalvar) {
        const dataFiltroBase = formatarDataLocalStr(new Date(sessao.data));
        const inicioDate = new Date(`${dataFiltroBase}T${sessao.hora}:00-03:00`);
        const duracaoMins = extrairMinutosDuracao(servicoEscolhido.duracao);
        const fimDate = new Date(inicioDate);
        fimDate.setMinutes(fimDate.getMinutes() + duracaoMins);

        agendamentosParaInserir.push({
          cliente_id: clienteData.id, 
          servico_id: servicoEscolhido.id,
          tipo: 'agendado', 
          inicio: inicioDate.toISOString(), 
          fim: fimDate.toISOString(),
          grupo_pacote_id: grupoPacoteId
        });
      }

      await supabase.from('agendamentos').insert(agendamentosParaInserir);

      if (valorSinal > 0) {
        await supabase.from('transacoes').insert([{
          descricao: `Sinal Retorno PIX (Tablet): ${sessaoData.cliente_nome}`,
          tipo: 'entrada', valor: valorSinal, categoria: 'Sinal'
        }]);
      }

      if (clienteData.telefone) {
        const textoBase = configuracoes?.mensagem_confirmacao || "Oii! 💕 Passando para confirmar seu retorno.";
        const sinalTexto = valorSinal > 0 ? '\n✅ *Sinal recebido com sucesso!*' : '';
        
        const datasFormatadasMsg = sessoesParaSalvar.map((s: any, i: number) => {
           return `🔹 Sessão ${i + 1}: ${new Date(s.data).toLocaleDateString('pt-BR')} às ${s.hora}`;
        }).join('\n');

        const mensagemCliente = `${textoBase}\n\n*Detalhes do Retorno:*\n👤 Cliente: ${sessaoData.cliente_nome.split(' ')[0]}\n💅 Serviço: *${servicoEscolhido.nome}*\n\n*Datas Agendadas:*\n${datasFormatadasMsg}\n${sinalTexto}\n\nTe esperamos! ✨`;
        
        let numeroLimpo = clienteData.telefone.replace(/\D/g, '');
        if (numeroLimpo.length === 10 || numeroLimpo.length === 11) {
           numeroLimpo = '55' + numeroLimpo;
        }

        try {
          await fetch('/api/whatsapp', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telefone: numeroLimpo, mensagem: mensagemCliente })
          });
        } catch (e) {}
      }
    }
    
    setEtapaAgendamento(3); 
    setTimeout(() => { setActiveTab('inicio'); setEtapaAgendamento(1); setSessoesSelecionadas([]); }, 5000);
  };

  const abrirWppParaPacote = (nomePacote: string) => {
    const url = `https://wa.me/5547996987519?text=${encodeURIComponent(`Oii! Estava olhando o menu de vocês e me interessei pela assinatura do *${nomePacote}*. Como faço para começar?`)}`;
    window.open(url, '_blank');
  }

  const ativarTelaCheia = () => { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); };
  const formatarTempo = (s: number) => {
    if (s < 0) return "00:00";
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
    return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-[100dvh] w-full bg-[#0A0205] text-white flex flex-col-reverse sm:flex-row overflow-hidden font-sans select-none relative pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      
      {/* 🛡️ RELÓGIO FLUTUANTE (Desktop/Tablet) */}
      <div className="hidden sm:flex absolute top-4 right-4 lg:top-8 lg:right-8 z-50 items-center gap-2 bg-[#120308]/60 border border-[#DCAE96]/20 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg pointer-events-none">
        <Clock size={12} className="text-[#C7977D]" />
        <span className="text-white font-medium text-xs lg:text-base tracking-widest">{horaAtual}</span>
      </div>

      <button onClick={ativarTelaCheia} className="absolute top-2 left-2 z-50 p-2 text-[#C7977D] opacity-20 hover:opacity-100 bg-black/40 rounded-full transition-opacity hidden sm:block"><Maximize size={16} /></button>
      
      {deferredPrompt && (
        <button onClick={handleInstallClick} className="absolute top-2 right-2 z-50 flex items-center gap-1.5 bg-[#00B1EA] text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-[0_0_15px_rgba(0,177,234,0.4)] animate-pulse">
          <Download size={12} /> Instalar
        </button>
      )}

      {/* MODO DESCANSO */}
      {!atendimentoAtivo && (
        <div className="absolute inset-0 z-0 flex flex-col justify-between h-[100dvh] bg-black overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          {slides.map((slide, idx) => {
            if (slide.tipo === 'video') {
              return (
                <div key={idx} className="absolute inset-0 flex gap-2 sm:gap-4 p-2 sm:p-4" style={{ opacity: idx === imagemAtualIndex ? 0.4 : 0, transition: 'opacity 2s ease-in-out' }}>
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
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0205] via-[#0A0205]/40 to-[#0A0205]/90 z-10 pointer-events-none"></div>
          
          <header className="w-full p-4 md:px-8 flex justify-between items-center z-30 shrink-0">
            <div className="flex items-center gap-3 pl-2 sm:pl-8">
              <img src="/fotonova.jpeg" className="h-10 w-10 rounded-full object-cover border border-[#C7977D]" alt="Débora Silva" />
              <div className="flex flex-col">
                <span className="font-serif text-[#F8D1BE] text-xl leading-tight drop-shadow-md">Debora Nails</span>
                <span className="text-[#E8D3C8] text-[9px] tracking-[0.2em] uppercase font-bold opacity-80">Studio de Alto Padrão</span>
              </div>
            </div>
            <div className="sm:hidden flex items-center gap-1.5 bg-black/40 border border-[#DCAE96]/20 px-3 py-1.5 rounded-full">
              <Clock size={12} className="text-[#C7977D]" />
              <span className="text-white font-medium text-xs tracking-widest">{horaAtual}</span>
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
                <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl text-white mb-4 tracking-wide drop-shadow-[0_2px_15px_rgba(0,0,0,1)]">
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

      {/* MODO SESSÃO VIP ATIVA - HYBRID LAYOUT (App + Monitor) */}
      {atendimentoAtivo && sessaoData && (
        <div className="absolute inset-0 z-40 flex flex-col-reverse sm:flex-row bg-[#0A0205] animate-in slide-in-from-bottom-8 duration-700 h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] overflow-hidden">
          
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#DCAE96]/10 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDuration: '6s' }}></div>
          
          {/* 🛡️ SIDEBAR OTIMIZADA */}
          <aside className="w-full sm:w-[25%] sm:max-w-[220px] lg:max-w-[280px] bg-[#120308]/95 backdrop-blur-xl border-t sm:border-t-0 sm:border-r border-[#DCAE96]/20 flex flex-row sm:flex-col z-50 h-[65px] sm:h-full shrink-0 shadow-2xl">
            
            <div className="hidden sm:flex p-3 sm:p-4 lg:p-8 border-b border-[#DCAE96]/10 flex-col items-start shrink-0">
              <div className="flex items-center gap-3">
                 <img src="/fotonova.jpeg" className="h-10 w-10 lg:h-14 lg:w-14 rounded-full object-cover border border-[#C7977D] shadow-lg" alt="Débora Silva" />
                 <div className="flex flex-col">
                   <span className="font-serif text-[#F8D1BE] text-sm lg:text-xl leading-tight drop-shadow-md">Debora Nails</span>
                   <span className="text-[#E8D3C8] text-[7px] lg:text-[9px] tracking-[0.2em] uppercase font-bold opacity-80">Studio de Alto Padrão</span>
                 </div>
              </div>
            </div>

            <nav className="flex-1 p-2 sm:p-3 lg:p-6 flex flex-row sm:flex-col justify-around sm:justify-start gap-1 sm:gap-2 lg:gap-3 overflow-y-auto custom-scrollbar min-h-0">
              <button onClick={() => setActiveTab('inicio')} className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2.5 p-2 sm:p-2.5 lg:p-4 rounded-xl transition-all flex-1 sm:flex-none ${abaAtiva === 'inicio' ? 'bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#0A0205] font-bold shadow-[0_0_20px_rgba(248,209,190,0.4)]' : 'text-[#E8D3C8] hover:bg-[#DCAE96]/10 hover:text-white'}`}>
                <Sparkles size={16} className="shrink-0" /> <span className="text-[9px] sm:text-xs lg:text-base">Atendimento</span>
              </button>
              
              <button onClick={() => setActiveTab('cardapio')} className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2.5 p-2 sm:p-2.5 lg:p-4 rounded-xl transition-all flex-1 sm:flex-none ${abaAtiva === 'cardapio' ? 'bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#0A0205] font-bold shadow-[0_0_20px_rgba(248,209,190,0.4)]' : 'text-[#E8D3C8] hover:bg-[#DCAE96]/10 hover:text-white'} ${isUpsell && abaAtiva !== 'cardapio' ? 'animate-pulse shadow-[0_0_15px_rgba(220,174,150,0.3)] border border-[#C7977D]/40' : ''}`}>
                <ImageIcon size={16} className="shrink-0" /> <span className="text-[9px] sm:text-xs lg:text-base">Catálogo VIP</span>
              </button>
              
              <button onClick={() => { setActiveTab('agendar'); setEtapaAgendamento(1); }} className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2.5 p-2 sm:p-2.5 lg:p-4 rounded-xl transition-all flex-1 sm:flex-none ${abaAtiva === 'agendar' ? 'bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#0A0205] font-bold shadow-[0_0_20px_rgba(248,209,190,0.4)]' : 'text-[#E8D3C8] hover:bg-[#DCAE96]/10 hover:text-white'}`}>
                <CalendarDays size={16} className="shrink-0" /> <span className="text-[9px] sm:text-xs lg:text-base">Retorno</span>
              </button>

              <button onClick={() => setActiveTab('ideias')} className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2.5 p-2 sm:p-2.5 lg:p-4 rounded-xl transition-all flex-1 sm:flex-none ${abaAtiva === 'ideias' ? 'bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#0A0205] font-bold shadow-[0_0_20px_rgba(248,209,190,0.4)]' : 'text-[#E8D3C8] hover:bg-[#DCAE96]/10 hover:text-white'}`}>
                <Heart size={16} className="shrink-0" /> <span className="text-[9px] sm:text-xs lg:text-base">Ideias</span>
              </button>
            </nav>

            <div className="hidden sm:block p-2 lg:p-6 border-t border-[#DCAE96]/10 shrink-0">
              <div className="bg-black/40 p-2 lg:p-4 rounded-xl flex items-center justify-between border border-[#DCAE96]/10">
                <div>
                  <p className="text-[7px] lg:text-xs text-gray-500 uppercase tracking-widest mb-0.5">Wi-Fi Premium</p>
                  <p className="text-[8px] lg:text-sm text-[#F8D1BE]">Rede: <span className="font-bold text-white">Madalenas 5G</span></p>
                  <p className="text-[8px] lg:text-sm text-[#F8D1BE]">Senha: <span className="font-bold text-white">madalenas2025</span></p>
                </div>
                <Wifi className="text-[#C7977D] opacity-80" size={14} />
              </div>
            </div>
          </aside>

          {/* 🛡️ ÁREA PRINCIPAL: BLINDADA CONTRA OVERFLOW (COMPRESSÃO HÍBRIDA) */}
          <main className="flex-1 relative z-10 flex flex-col h-full overflow-hidden min-h-0">

            {/* HEADER EXCLUSIVO PARA O CELULAR EM PÉ */}
            <header className="sm:hidden w-full p-2 bg-[#120308]/90 backdrop-blur-md border-b border-[#DCAE96]/20 flex justify-between items-center shrink-0 z-40 shadow-lg">
              <div className="flex items-center gap-2">
                <img src="/fotonova.jpeg" className="h-8 w-8 rounded-full border border-[#C7977D]" alt="Débora" />
                <div className="flex flex-col">
                  <span className="font-serif text-[#F8D1BE] text-sm leading-tight">Debora Nails</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-black/50 border border-[#DCAE96]/20 px-2 py-1 rounded-full">
                <Clock size={10} className="text-[#C7977D]" />
                <span className="text-white font-medium text-[10px] tracking-widest">{horaAtual}</span>
              </div>
            </header>

            <div className={`flex-1 p-2 sm:p-3 lg:p-8 flex flex-col items-center w-full ${abaAtiva === 'inicio' ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}>
              
              <div className="w-full max-w-6xl h-full flex flex-col min-h-0">
                
                {abaAtiva === 'inicio' && (
                  <div className="h-full flex flex-col animate-in fade-in duration-700 min-h-0 w-full gap-2 sm:gap-3 lg:gap-6">
                    
                    {/* Título de Boas Vindas + Frase Instagramável */}
                    <div className="shrink-0 flex flex-col">
                      <div className="flex justify-between items-start">
                        <h1 className="font-serif text-2xl sm:text-2xl lg:text-5xl text-white leading-tight drop-shadow-lg mb-1 sm:mb-2">
                          {saudacao}, <span className="text-[#F8D1BE]">{sessaoData.cliente_nome.split(' ')[0]}!</span> ✨
                        </h1>
                        {/* Relógio Mobile Escondido */}
                        <div className="sm:hidden flex items-center gap-1 bg-[#120308]/60 border border-[#DCAE96]/20 px-2 py-1 rounded-full">
                          <Clock size={10} className="text-[#C7977D]" />
                          <span className="text-white font-medium text-[9px] tracking-widest">{horaAtual}</span>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-[#DCAE96]/15 to-transparent p-1.5 sm:p-2 rounded-r-xl border-l-[3px] border-[#DCAE96] mt-1 shadow-sm max-w-2xl backdrop-blur-sm">
                        <p className="text-[11px] sm:text-[11px] lg:text-lg text-[#F8D1BE] font-medium italic opacity-100 tracking-wide drop-shadow-md">
                          "{fraseDoDia}"
                        </p>
                      </div>
                    </div>

                    {/* CARDS PRINCIPAIS: Proporção 40/60 no A10 */}
                    <div className="flex-1 flex flex-row gap-2 sm:gap-3 lg:gap-8 w-full min-h-0 overflow-hidden">
                      
                      {/* ESQUERDA: CRONÔMETRO (TRAVADO E MENOR NO A10) */}
                      <div className="w-full sm:w-[40%] lg:flex-1 bg-gradient-to-br from-[#1A050B] to-[#0A0205] border border-[#DCAE96]/20 p-2 sm:p-2 lg:p-8 rounded-2xl sm:rounded-2xl lg:rounded-[24px] shadow-xl flex flex-col justify-between min-h-0 overflow-hidden relative">
                        <div className="shrink-0 mb-1">
                          <p className="text-[#C7977D] text-[8px] sm:text-[8px] lg:text-sm uppercase tracking-widest font-bold mb-0.5">Em Andamento</p>
                          <h2 className="font-serif text-lg sm:text-base lg:text-4xl text-white leading-tight drop-shadow-md line-clamp-1 lg:line-clamp-2">{sessaoData.servico_nome}</h2>
                        </div>

                        <div className="flex-1 bg-black/50 border border-[#DCAE96]/10 rounded-xl p-2 sm:p-2 lg:p-10 flex flex-col items-center justify-center mt-auto shadow-inner min-h-0 overflow-hidden">
                          <PlayCircle size={14} className="text-[#F8D1BE] mb-1 lg:mb-4 animate-pulse hidden lg:block lg:w-6 lg:h-6" />
                          <span className="font-mono text-3xl sm:text-3xl lg:text-7xl text-white tracking-widest font-light drop-shadow-[0_0_20px_rgba(248,209,190,0.5)]">{formatarTempo(tempoDecorrido)}</span>
                        </div>
                      </div>

                      {/* DIREITA: RESUMO E PIX (MAIS ESPAÇO PARA O QR CODE) */}
                      {dadosServicoSessao && (
                        <div className="w-full sm:w-[60%] lg:flex-1 bg-[#120308]/80 border border-[#DCAE96]/20 p-2 sm:p-3 lg:p-8 rounded-2xl sm:rounded-2xl lg:rounded-[24px] shadow-xl flex flex-col min-h-0 overflow-hidden justify-between">
                          
                          <div className="shrink-0">
                            <div className="flex justify-between items-center mb-1 sm:mb-1.5 lg:mb-3 border-b border-[#DCAE96]/10 pb-1 lg:pb-3 shrink-0">
                              <h3 className="font-serif text-xs sm:text-xs lg:text-xl text-white">Resumo Financeiro</h3>
                              {valorRestante <= 0 || statusPagamento === 'pago' ? (
                                 <span className="bg-emerald-500/20 text-emerald-400 text-[8px] lg:text-xs px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1 font-bold"><CheckCircle2 size={10}/> PAGO</span>
                              ) : null}
                            </div>
                            
                            <div className="space-y-1 lg:space-y-3 text-[9px] sm:text-[9px] lg:text-base shrink-0 pt-1">
                              <div className="flex justify-between text-gray-400">
                                <span>Total do Serviço:</span>
                                <span>R$ {precoTotal.toFixed(2).replace('.', ',')}</span>
                              </div>
                              {taxaSinal > 0 && (
                                <div className="flex justify-between text-emerald-400/80 border-b border-white/5 pb-1 lg:pb-2">
                                  <span>Sinal Pago ({taxaSinal}%):</span>
                                  <span>- R$ {(precoTotal * (taxaSinal / 100)).toFixed(2).replace('.', ',')}</span>
                                </div>
                              )}
                              <div className="flex justify-between text-[#F8D1BE] text-xs sm:text-xs lg:text-2xl font-bold pt-1">
                                <span>Restante:</span>
                                <span>R$ {Math.max(0, valorRestante).toFixed(2).replace('.', ',')}</span>
                              </div>
                            </div>
                          </div>

                          {/* ÁREA DO PIX: Refeita com Padding elegante */}
                          <div className="flex-1 mt-1 sm:mt-1.5 lg:mt-6 flex flex-col min-h-0 justify-end">
                            {valorRestante > 0 && statusPagamento === 'pendente' && (
                              <div className="flex-1 bg-black/40 border border-[#DCAE96]/20 rounded-xl sm:rounded-xl lg:rounded-2xl p-2 sm:p-2 lg:p-6 flex items-center justify-center sm:justify-start gap-3 sm:gap-4 lg:gap-6 shadow-inner min-h-0 overflow-hidden">
                                {isGerandoPix ? (
                                  <div className="flex flex-col items-center justify-center w-full h-full">
                                    <Loader2 className="animate-spin text-[#C7977D] mb-1 lg:mb-2" size={16} />
                                    <p className="text-[7px] lg:text-[10px] text-gray-400 uppercase tracking-widest font-bold">Gerando PIX...</p>
                                  </div>
                                ) : qrCodeImagem ? (
                                  <>
                                    <div className="bg-white p-2 sm:p-2.5 rounded-xl shrink-0 shadow-[0_0_20px_rgba(220,174,150,0.3)] h-[90px] w-[90px] sm:h-[100px] sm:w-[100px] lg:h-[160px] lg:w-[160px] flex items-center justify-center">
                                      <img src={`data:image/jpeg;base64,${qrCodeImagem}`} alt="QR Code" className="w-full h-full object-contain rounded-md" />
                                    </div>
                                    <div className="flex flex-col justify-center min-w-0">
                                      <p className="text-[#E8D3C8] text-[11px] sm:text-sm lg:text-xl leading-tight mb-0.5 lg:mb-1 font-bold truncate">Pagar Restante</p>
                                      <p className="text-emerald-400/80 text-[8px] sm:text-[9px] lg:text-sm uppercase tracking-widest flex items-center gap-1 font-bold">
                                        <Loader2 className="animate-spin shrink-0" size={12} /> Aguardando
                                      </p>
                                    </div>
                                  </>
                                ) : (
                                   <p className="text-[8px] lg:text-sm text-red-400 w-full text-center">Falha de conexão.</p>
                                )}
                              </div>
                            )}

                            {(valorRestante <= 0 || statusPagamento === 'pago') && (
                              <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl sm:rounded-xl lg:rounded-2xl p-2 lg:p-5 flex flex-row items-center justify-center gap-2 lg:gap-4 shadow-inner min-h-0">
                                 <CheckCircle2 className="text-emerald-400 shrink-0 lg:w-8 lg:h-8" size={20} />
                                 <div className="flex flex-col text-left">
                                   <p className="text-emerald-400 text-[10px] sm:text-xs lg:text-lg font-bold leading-tight mb-0.5">Pagamento Confirmado!</p>
                                   <p className="text-gray-400 text-[7px] sm:text-[8px] lg:text-[10px]">Aguarde a finalização.</p>
                                 </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ABA INSPIRAÇÕES / IDEIAS */}
                {abaAtiva === 'ideias' && (
                  <div className="animate-in fade-in duration-500 w-full pb-10">
                    <div className="mb-4 sm:mb-8 shrink-0">
                      <h2 className="font-serif text-2xl sm:text-4xl text-[#F8D1BE] mb-1.5">Mural de Inspirações</h2>
                      <p className="text-[#E8D3C8] text-[10px] sm:text-sm opacity-80">Encontre o estilo perfeito para a sua próxima visita. Qual vai ser?</p>
                    </div>
                    
                    <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
                      {['/01.jpg', '/vermelha.jpeg', '/02.jpg','/nude-branca.jpeg','/delicada.jpeg','/branca-nude.jpeg','/roxa.jpeg','/nude-dourada.jpeg'].map((img, i) => (
                        <div key={i} className="relative rounded-2xl overflow-hidden shadow-lg border border-[#DCAE96]/20 group break-inside-avoid">
                          <Image src={img} alt="Inspiração" width={400} height={500} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                            <Heart size={24} className="text-[#F8D1BE] drop-shadow-md" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {abaAtiva === 'cardapio' && (
                  <div className="animate-in fade-in duration-500 w-full pb-10">
                    <div className="mb-4 sm:mb-8 shrink-0">
                      <h2 className="font-serif text-2xl sm:text-4xl text-[#F8D1BE] mb-1.5">Catálogo Exclusivo</h2>
                      <p className="text-[#E8D3C8] text-[10px] sm:text-sm opacity-80">Inspire-se para a sua próxima visita ou assine um Clube VIP.</p>
                    </div>
                    
                    <div className="space-y-8">
                      {pacotesDb.length > 0 && (
                        <div>
                          <h3 className="text-sm sm:text-base text-[#C7977D] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-[#DCAE96]/20 pb-2"><Crown size={16}/> Assinaturas VIP</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {pacotesDb.map(pacote => {
                              const imagem = pacote.imagens && pacote.imagens.length > 0 ? pacote.imagens[0] : null;
                              return (
                                <div key={pacote.id} className="relative rounded-[24px] overflow-hidden group flex flex-col bg-[#1A050B] border border-[#3a2522] hover:border-[#DCAE96]/50 transition-all duration-300 shadow-xl">
                                  <div className="h-32 sm:h-40 relative overflow-hidden bg-black shrink-0">
                                    {imagem ? (
                                      <img src={imagem} alt={pacote.nome} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
                                    ) : (
                                      <div className="flex items-center justify-center h-full opacity-30"><Sparkles size={30} className="text-[#C7977D]" /></div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#180A0D] via-[#180A0D]/40 to-transparent"></div>
                                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-[#DCAE96]/30 flex items-center gap-1.5 shadow-lg">
                                       <Crown size={12} className="text-[#C7977D]"/>
                                       <span className="text-[9px] text-[#F8D1BE] uppercase font-bold tracking-widest">{pacote.qtd_sessoes} Sessões</span>
                                    </div>
                                  </div>
                                  
                                  <div className="p-4 sm:p-5 flex flex-col flex-1 relative z-10 -mt-4">
                                    <h3 className="font-serif text-lg sm:text-xl text-white leading-tight mb-2 group-hover:text-[#F8D1BE] transition-colors line-clamp-2">{pacote.nome}</h3>
                                    <div className="flex items-end gap-1 mb-4 border-b border-[#3a2522] pb-3">
                                      <span className="text-[#C7977D] text-xs font-bold mb-0.5">R$</span>
                                      <span className="text-3xl font-bold text-white tracking-tight">{pacote.preco.toFixed(2).replace('.', ',')}</span>
                                      <span className="text-gray-500 text-[10px] mb-1">/mês</span>
                                    </div>
                                    
                                    <ul className="space-y-2 mb-5 flex-1 min-h-[60px]">
                                      <li className="flex items-start gap-1.5 text-xs text-gray-300">
                                        <CheckCircle2 size={14} className="text-[#C7977D] shrink-0 mt-0.5" />
                                        <span className="line-clamp-1">Direito a {pacote.qtd_sessoes} horários</span>
                                      </li>
                                      <li className="flex items-start gap-1.5 text-xs text-gray-300">
                                        <CheckCircle2 size={14} className="text-[#C7977D] shrink-0 mt-0.5" />
                                        <span className="line-clamp-1">Vagas fixas garantidas</span>
                                      </li>
                                    </ul>
                                    
                                    <button onClick={() => abrirWppParaPacote(pacote.nome)} className="w-full bg-gradient-to-r from-[#DCAE96] to-[#C7977D] text-[#120308] py-3 rounded-lg font-bold text-[11px] uppercase tracking-wider shadow-[0_0_15px_rgba(220,174,150,0.3)] flex justify-center items-center gap-1.5 mt-auto hover:scale-[1.02] transition-transform">
                                      <Crown size={16} /> Assinar VIP
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      <div className="mt-8">
                        <h3 className="text-xs sm:text-sm text-[#C7977D] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-[#DCAE96]/20 pb-2"><ImageIcon size={18}/> Serviços Avulsos</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                          {servicosDb.length === 0 ? (
                            <p className="text-gray-500 text-sm">Nenhum serviço carregado.</p>
                          ) : (
                            servicosDb.map(serv => {
                              const imagem = serv.imagens && serv.imagens.length > 0 ? serv.imagens[0] : null;
                              return (
                                <div key={serv.id} className="flex bg-[#120308]/80 border border-[#DCAE96]/20 rounded-2xl overflow-hidden shadow-xl h-28 sm:h-36 hover:border-[#DCAE96]/50 transition-colors shrink-0">
                                  <div className="w-[35%] bg-black relative shrink-0">
                                    {imagem ? (
                                      <img src={imagem} alt={serv.nome} className="w-full h-full object-cover opacity-80" />
                                    ) : (
                                      <div className="flex items-center justify-center h-full opacity-20"><Sparkles size={24} className="text-[#C7977D]" /></div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#120308]/90"></div>
                                  </div>
                                  
                                  <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
                                    <h3 className="font-serif text-base sm:text-lg text-white mb-1 truncate drop-shadow-md">{serv.nome}</h3>
                                    <p className="text-gray-400 text-[10px] sm:text-xs line-clamp-2 mb-3">{serv.descricao || 'Serviço premium do estúdio.'}</p>
                                    
                                    <div className="flex justify-between items-center mt-auto">
                                      <span className="text-[#F8D1BE] font-bold text-sm sm:text-base">R$ {serv.preco.toFixed(2).replace('.', ',')}</span>
                                      <button onClick={() => {setServicoEscolhido(serv); setActiveTab('agendar'); setEtapaAgendamento(1);}} className="bg-[#DCAE96]/10 text-[#C7977D] border border-[#DCAE96]/30 px-3 py-1.5 rounded-lg flex items-center gap-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider hover:bg-[#DCAE96] hover:text-[#120308] transition-colors shrink-0">
                                        Agendar <ChevronRight size={14}/>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {abaAtiva === 'agendar' && (
                  <div className="animate-in fade-in duration-500 w-full pb-10">
                    <div className="mb-4 sm:mb-6 shrink-0">
                      <h2 className="font-serif text-2xl sm:text-4xl text-[#F8D1BE] mb-1.5">Agende seu Retorno</h2>
                      <p className="text-[#E8D3C8] text-[10px] sm:text-sm opacity-80">Garanta sua próxima vaga com facilidade e segurança.</p>
                    </div>
                    
                    <div className="flex bg-[#120308]/60 border border-[#DCAE96]/20 rounded-[24px] shadow-2xl overflow-hidden">
                      
                      {etapaAgendamento === 1 && (
                        <div className="w-full flex flex-col sm:flex-row p-4 sm:p-6 lg:p-8 gap-4 sm:gap-6">
                          <div className="w-full sm:w-1/2 flex flex-col gap-4 lg:gap-6 sm:pr-8 sm:border-r border-[#DCAE96]/10 shrink-0">
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <label className="block text-[10px] lg:text-[11px] text-[#C7977D] uppercase font-bold tracking-wider">1. Selecione o Serviço</label>
                                {servicoEscolhido?.is_pacote && <span className="text-[#C7977D] text-[9px] uppercase font-bold tracking-widest">Sessão {sessoesSelecionadas.length + 1} de {servicoEscolhido.qtd_sessoes}</span>}
                              </div>
                              
                              <select value={servicoEscolhido?.id || ''} onChange={(e) => {
                                setServicoEscolhido([...servicosDb, ...pacotesDb].find(s => s.id === e.target.value));
                                setSessoesSelecionadas([]);
                                setDataEscolhida(null);
                                setHoraEscolhida('');
                              }} className="w-full bg-black/50 border border-[#DCAE96]/20 rounded-xl px-3 sm:px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE] appearance-none">
                                <option value="">Toque para escolher...</option>
                                {pacotesDb.length > 0 && <optgroup label="👑 Assinaturas VIP">{pacotesDb.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.qtd_sessoes}x)</option>)}</optgroup>}
                                {servicosDb.length > 0 && <optgroup label="💅 Serviços Avulsos">{servicosDb.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</optgroup>}
                              </select>
                            </div>

                            {sessoesSelecionadas.length > 0 && (
                              <div className="bg-black/40 border border-[#DCAE96]/20 p-3 rounded-xl animate-in fade-in">
                                <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold mb-2">Sessões escolhidas:</p>
                                <div className="space-y-2">
                                  {sessoesSelecionadas.map((sessao, index) => (
                                    <div key={index} className="flex justify-between items-center text-xs border-b border-white/5 pb-1 last:border-0 last:pb-0">
                                      <span className="text-[#E8D3C8] flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-400"/> Sessão {index + 1}</span>
                                      <span className="font-bold text-[#F8D1BE]">{new Date(sessao.data).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})} às {sessao.hora}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex-1 flex flex-col min-h-0 mt-2">
                              <div className="flex justify-between items-end mb-2">
                                <label className="block text-[10px] lg:text-[11px] text-[#C7977D] uppercase font-bold tracking-wider">2. Escolha o Dia</label>
                                {sessoesSelecionadas.length > 0 && (
                                  <button onClick={desfazerUltimaData} className="text-[#C7977D] text-[10px] font-bold hover:text-white transition-colors underline underline-offset-2 mb-1">Desfazer Data</button>
                                )}
                              </div>
                              <div className="flex gap-2 sm:gap-3 overflow-x-auto custom-scrollbar pb-3">
                                {diasDisponiveis.slice(0, 14).map((data, idx) => (
                                  <button key={idx} id={`dia-${data.getTime()}`} onClick={() => setDataEscolhida(data)} className={`shrink-0 w-16 sm:w-20 lg:w-24 py-3 lg:py-4 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition-all border shrink-0 ${dataEscolhida?.getDate() === data.getDate() ? 'bg-gradient-to-b from-[#DCAE96] to-[#C7977D] text-[#120308] border-transparent shadow-[0_0_15px_rgba(220,174,150,0.4)]' : 'bg-black/30 text-gray-400 border-[#DCAE96]/10 hover:border-[#DCAE96]/40'}`}>
                                    <span className={`text-[9px] lg:text-[10px] uppercase font-bold ${dataEscolhida?.getDate() === data.getDate() ? 'opacity-80' : 'opacity-60'}`}>{data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.','')}</span>
                                    <span className="text-xl sm:text-2xl lg:text-3xl font-serif my-1">{data.getDate()}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          <div className="w-full sm:w-1/2 flex flex-col">
                            <label className="block text-[10px] lg:text-[11px] text-[#C7977D] uppercase font-bold tracking-wider mb-2">3. Escolha o Horário</label>
                            
                            {horariosLivres.length === 0 && dataEscolhida && servicoEscolhido ? (
                              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-center gap-3 h-16 mb-4"><Ban size={18} className="text-red-400"/><span className="text-sm text-red-400 font-bold">Sem horários livres</span></div>
                            ) : (
                              <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 mb-4 overflow-y-auto custom-scrollbar pr-1 sm:pr-2" style={{maxHeight: '200px'}}>
                                {horariosLivres.map(hora => (
                                  <button key={hora} onClick={() => setHoraEscolhida(hora)} className={`py-2 lg:py-3 rounded-xl transition-all border text-[11px] sm:text-sm lg:text-base font-medium ${horaEscolhida === hora ? 'bg-gradient-to-r from-[#DCAE96] to-[#C7977D] text-[#120308] border-transparent shadow-md' : 'bg-black/30 border-[#DCAE96]/10 text-gray-300 hover:border-[#DCAE96]/40'}`}>
                                    {hora}
                                  </button>
                                ))}
                              </div>
                            )}
                            
                            <button 
                              onClick={(!servicoEscolhido?.is_pacote || sessoesSelecionadas.length + 1 >= (servicoEscolhido?.qtd_sessoes || 1)) ? iniciarProcessoAgendamento : avancarData} 
                              disabled={isProcessandoAgendamento || !servicoEscolhido || !dataEscolhida || !horaEscolhida} 
                              className="mt-auto w-full bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] py-3 sm:py-4 lg:py-5 rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-30 text-xs sm:text-sm lg:text-base shrink-0 shadow-[0_0_20px_rgba(248,209,190,0.3)] hover:scale-[1.02] uppercase tracking-wider"
                            >
                              {isProcessandoAgendamento ? <Loader2 className="animate-spin" size={20} /> : 
                               (servicoEscolhido?.is_pacote && sessoesSelecionadas.length + 1 < servicoEscolhido.qtd_sessoes) ? 'Salvar Data e Escolher a Próxima' :
                               servicoEscolhido?.taxa_sinal > 0 ? <><QrCode size={20} /> Pagar Sinal (R$ {(servicoEscolhido.preco * (servicoEscolhido.taxa_sinal / 100)).toFixed(2).replace('.', ',')})</> : 
                               <><CheckCircle2 size={20} /> Confirmar Agendamento</>}
                            </button>
                          </div>
                        </div>
                      )}

                      {etapaAgendamento === 2 && (
                        <div className="w-full flex flex-col items-center justify-center p-6 sm:p-8 animate-in zoom-in-95 text-center bg-black/40">
                          <h3 className="text-[#00B1EA] font-bold mb-2 sm:mb-3 flex items-center gap-2 text-base sm:text-xl lg:text-2xl"><QrCode className="sm:w-6 sm:h-6" size={20}/> Escaneie para Confirmar a Vaga</h3>
                          <p className="text-[10px] sm:text-sm text-gray-400 mb-4 sm:mb-6">Sinal exigido de R$ {(servicoEscolhido.preco * (servicoEscolhido.taxa_sinal / 100)).toFixed(2).replace('.', ',')} para {servicoEscolhido.nome}.</p>
                          <div className="bg-white p-3 sm:p-4 rounded-[24px] mb-4 sm:mb-6 shadow-[0_0_40px_rgba(0,177,234,0.3)] w-40 h-40 sm:w-48 sm:h-48 lg:w-64 lg:h-64 flex items-center justify-center">
                            {qrCodeAgendamento ? <img src={`data:image/jpeg;base64,${qrCodeAgendamento}`} className="w-full h-full object-contain" /> : <Loader2 className="animate-spin text-[#00B1EA]" size={32} />}
                          </div>
                          <div className="flex items-center gap-2 text-emerald-400 text-[10px] sm:text-xs lg:text-sm font-bold uppercase tracking-widest bg-emerald-500/10 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full border border-emerald-500/20">
                             <Loader2 className="animate-spin shrink-0 sm:w-4 sm:h-4" size={14} /> Aguardando Pagamento...
                          </div>
                        </div>
                      )}

                      {etapaAgendamento === 3 && (
                        <div className="w-full flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 bg-black/40">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 sm:mb-6 border-2 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                            <CheckCircle2 size={32} className="text-emerald-400 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
                          </div>
                          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-white mb-2 sm:mb-3">{servicoEscolhido?.is_pacote ? 'Vagas Reservadas!' : 'Vaga Reservada!'}</h2>
                          <p className="text-xs sm:text-sm lg:text-base text-gray-400">Você receberá a confirmação no WhatsApp com todas as datas.</p>
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(248, 209, 190, 0.2); border-radius: 10px; }
      `}} />
    </div>
  );
}