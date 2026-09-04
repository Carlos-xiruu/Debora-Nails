'use client'

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; 
import { CalendarDays, Sparkles, Clock, ArrowRight, CheckCircle2, ShieldCheck, Loader2, X, CreditCard, QrCode, AlertCircle, Award, LogOut, Crown, User, Copy, Ban, Info, AlertTriangle, Check } from 'lucide-react';
import { supabase } from './lib/supabase';
import Link from 'next/link';

// 🛡️ Ferramentas Isoladas
import { converterParaMinutos, converterParaHoraStr, extrairMinutosDuracao, formatarDataLocalStr } from './utils/helpers';

// 🛡️ Componentes Isolados
import Sobre from './components/Sobre';
import Portfolio from './components/Portfolio';
import Espaco from './components/Espaco';
import FAQ from './components/FAQ';

const DISPONIBILIDADE_PADRAO = {
  0: { ativo: false, abertura: '08:00', fechamento: '12:00' },
  1: { ativo: true, abertura: '08:00', fechamento: '18:00' },
  2: { ativo: true, abertura: '09:00', fechamento: '19:00' },
  3: { ativo: true, abertura: '08:00', fechamento: '17:00' },
  4: { ativo: true, abertura: '10:00', fechamento: '20:00' },
  5: { ativo: true, abertura: '08:00', fechamento: '18:00' },
  6: { ativo: true, abertura: '08:00', fechamento: '13:00' }
};

export default function LandingPage() {
  const router = useRouter();
  
  const [servicosComuns, setServicosComuns] = useState<any[]>([]);
  const [pacotes, setPacotes] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); 
  const [servicoDetalhe, setServicoDetalhe] = useState<any>(null);
  
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
  const [dadosFidelidade, setDadosFidelidade] = useState({ atendimentos: 0, isVip: false });
  
  const [step, setStep] = useState(1);
  const [servicoEscolhido, setServicoEscolhido] = useState<any>(null);
  
  const [sessoesSelecionadas, setSessoesSelecionadas] = useState<{data: Date, hora: string}[]>([]);
  const [dataEscolhida, setDataEscolhida] = useState<Date | null>(null);
  const [horaEscolhida, setHoraEscolhida] = useState('');
  
  const [clienteDados, setClienteDados] = useState({ nome: '', telefone: '', observacoes: '', prefere_silencio: false });
  const [dividaPendente, setDividaPendente] = useState(0); 

  const [metodoPagamento, setMetodoPagamento] = useState<'pix' | 'cartao'>('pix');
  const [tempoRestante, setTempoRestante] = useState(300);
  const [isProcessando, setIsProcessando] = useState(false);
  const [isSalvandoDb, setIsSalvandoDb] = useState(false);
  const [idsReservados, setIdsReservados] = useState<number[]>([]); // 🚨 IDs dos cadeados da nossa vaga!

  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [configuracoes, setConfiguracoes] = useState<any>(null);

  const [qrCodePix, setQrCodePix] = useState<{base64: string, copiaCola: string} | null>(null);
  const [pixId, setPixId] = useState<string | null>(null);
  const [pixManualFallback, setPixManualFallback] = useState(false);

  const [showWaBubble, setShowWaBubble] = useState(false);
  const [bubbleFechado, setBubbleFechado] = useState(false);

  useEffect(() => {
    const fetchDadosGerais = async () => {
      const { data: servs } = await supabase.from('servicos').select('*').eq('ativo', true).order('preco', { ascending: true });
      if (servs) {
        setServicosComuns(servs.filter(s => !s.is_pacote));
        setPacotes(servs.filter(s => s.is_pacote));
      }

      const { data: config } = await supabase.from('configuracoes').select('*').eq('id', 1).single();
      if (config) {
        setConfiguracoes({
          disponibilidade: Object.keys(config.disponibilidade).length > 0 ? config.disponibilidade : DISPONIBILIDADE_PADRAO,
          bloqueios: config.bloqueios || [],
          chave_pix: config.chave_pix,
          tipo_chave_pix: config.tipo_chave_pix,
          mensagem_confirmacao: config.mensagem_confirmacao
        });
      }

      const hojeStr = formatarDataLocalStr(new Date());
      const limiteFuturo = new Date();
      limiteFuturo.setDate(limiteFuturo.getDate() + 45); 
      const limiteFuturoStr = formatarDataLocalStr(limiteFuturo);

      // 🚨 Puxamos o created_at para a inteligência dos 10 minutos
      const { data: agends } = await supabase
        .from('agendamentos')
        .select('id, inicio, fim, tipo, created_at')
        .gte('inicio', `${hojeStr}T00:00:00-03:00`)
        .lte('inicio', `${limiteFuturoStr}T23:59:59-03:00`)
        .neq('tipo', 'cancelado');
        
      if (agends) setAgendamentos(agends);
    };

    fetchDadosGerais();
    const waTimer = setTimeout(() => setShowWaBubble(true), 20000); 
    return () => clearTimeout(waTimer);
  }, []);

  const diasDisponiveis = useMemo(() => {
    if (!configuracoes) return [];
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
    return dias;
  }, [configuracoes]);

  // 🛡️ OTIMIZAÇÃO: A MÁGICA DOS 10 MINUTOS
  const horariosLivres = useMemo(() => {
    if (!dataEscolhida || !servicoEscolhido || !configuracoes) return [];

    const dataStr = formatarDataLocalStr(dataEscolhida);
    const diaDaSemana = dataEscolhida.getDay();
    const regraDoDia = configuracoes.disponibilidade[diaDaSemana];

    if (!regraDoDia || !regraDoDia.ativo) return [];

    const aberturaMin = converterParaMinutos(regraDoDia.abertura);
    const fechamentoMin = converterParaMinutos(regraDoDia.fechamento);
    const duracaoServicoMin = extrairMinutosDuracao(servicoEscolhido.duracao);
    const passoIntervalo = 30;

    const agendsDoDia = agendamentos.filter(a => new Date(a.inicio).toISOString().split('T')[0] === dataStr);
    const blocksDoDia = configuracoes.bloqueios.filter((b: any) => b.data === dataStr);

    const slotsLivres = [];
    const hojeStrBase = formatarDataLocalStr(new Date());
    const isHoje = dataStr === hojeStrBase;
    const dataAtualLocal = new Date();
    const minutosAtualReal = dataAtualLocal.getHours() * 60 + dataAtualLocal.getMinutes();

    for (let minAtual = aberturaMin; minAtual <= (fechamentoMin - duracaoServicoMin); minAtual += passoIntervalo) {
      const fimMin = minAtual + duracaoServicoMin;

      const conflitoAgendamento = agendsDoDia.some(a => {
        // Se a vaga for pendente de pagamento, só oculta se foi clicada há menos de 10 min.
        if (a.tipo === 'pendente_pagamento') {
          const idadeEmMinutos = (new Date().getTime() - new Date(a.created_at).getTime()) / 60000;
          if (idadeEmMinutos > 10) return false; // Vaga expirada volta a aparecer!
        }
        
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

      const tempoJaPassou = isHoje && (minAtual < minutosAtualReal);

      if (!conflitoAgendamento && !conflitoBloqueio && !conflitoNoCarrinho && !tempoJaPassou) {
        slotsLivres.push(converterParaHoraStr(minAtual));
      }
    }

    return slotsLivres;
  }, [dataEscolhida, servicoEscolhido, configuracoes, agendamentos, sessoesSelecionadas]);

  useEffect(() => {
    setHoraEscolhida('');
  }, [dataEscolhida, servicoEscolhido, sessoesSelecionadas]);

  useEffect(() => {
    const verificarSessaoEIntencao = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const userRole = session.user.user_metadata?.role;
        if (userRole === 'admin') { router.push('/dashboard'); return; } 
        else if (userRole === 'monitor') { router.push('/monitor'); return; }

        setUsuarioLogado(session.user);
        setClienteDados(prev => ({...prev, nome: session.user.user_metadata?.nome_completo || prev.nome}));
        
        const telefoneUser = session.user.user_metadata?.telefone;
        if (telefoneUser) {
          setClienteDados(prev => ({...prev, telefone: telefoneUser}));
          const { data: clienteBanco } = await supabase.from('clientes').select('atendimentos, divida_pendente').eq('telefone', telefoneUser).single();
          if (clienteBanco) {
            setDadosFidelidade({ atendimentos: clienteBanco.atendimentos, isVip: clienteBanco.atendimentos >= 10 });
            setDividaPendente(clienteBanco.divida_pendente || 0);
          }
        }
        
        const intencao = localStorage.getItem('intencao_agendamento');
        if (intencao) {
          localStorage.removeItem('intencao_agendamento');
          if (intencao === 'geral') iniciarAgendamento(null, true);
          else {
            try { iniciarAgendamento(JSON.parse(intencao), true); } 
            catch (e) { iniciarAgendamento(null, true); }
          }
        }
      }
    };
    verificarSessaoEIntencao();
  }, [router]);

  useEffect(() => {
    const processarRetornoCartao = async () => {
      const params = new URLSearchParams(window.location.search);
      const statusPagamento = params.get('pagamento');

      if (statusPagamento === 'sucesso') {
        const reservaSalva = localStorage.getItem('reserva_temp_debora');
        if (reservaSalva) {
          try {
            setIsSalvandoDb(true); 
            const dados = JSON.parse(reservaSalva);
            setServicoEscolhido(dados.servicoEscolhido);
            setSessoesSelecionadas(dados.sessoesSelecionadas);
            setClienteDados(dados.clienteDados);
            setMetodoPagamento(dados.metodoPagamento);
            setDividaPendente(dados.dividaPendente); 
            setIdsReservados(dados.idsReservados);
            
            const sucessoDb = await salvarAgendamentoOficial(dados);
            
            if (sucessoDb) {
              setStep(5);
              setIsModalOpen(true);
              localStorage.removeItem('reserva_temp_debora');
            } 
            setIsSalvandoDb(false);
          } catch(e) {
            console.error("Erro ao ler cache do agendamento", e);
            setIsSalvandoDb(false);
          }
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (statusPagamento === 'erro') {
        alert("O pagamento via cartão foi recusado pelo banco. Tente novamente.");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    setTimeout(() => {
      processarRetornoCartao();
    }, 300); 
  }, []);

  // O cancelamento automático se o tempo acabar!
  const cancelarVagaExpirada = async () => {
    if (idsReservados.length > 0) {
      await supabase.from('agendamentos').update({ tipo: 'cancelado' }).in('id', idsReservados);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 4 && tempoRestante > 0) {
      timer = setInterval(() => setTempoRestante(prev => prev - 1), 1000);
    } else if (step === 4 && tempoRestante === 0) {
      cancelarVagaExpirada(); // Libera a vaga
      alert("O tempo limite para pagamento expirou. A vaga foi liberada para outras clientes.");
      setIsModalOpen(false);
      setStep(1);
    }
    return () => clearInterval(timer);
  }, [step, tempoRestante]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pixId && step === 4 && !pixManualFallback && !isSalvandoDb) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/checar-pagamento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: pixId })
          });
          const data = await res.json();
          if (data.status === 'approved') {
            clearInterval(interval);
            setIsSalvandoDb(true); 
            const dados = { idsReservados, clienteDados, servicoEscolhido, sessoesSelecionadas, metodoPagamento, dividaPendente };
            
            const sucessoDb = await salvarAgendamentoOficial(dados);
            if (sucessoDb) {
              setStep(5);
            }
            setIsSalvandoDb(false);
          }
        } catch (e) {
           console.error("Erro ao checar PIX", e);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [pixId, step, pixManualFallback, clienteDados, servicoEscolhido, sessoesSelecionadas, metodoPagamento, dividaPendente, isSalvandoDb, idsReservados]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUsuarioLogado(null);
    setDadosFidelidade({ atendimentos: 0, isVip: false });
    setClienteDados({ nome: '', telefone: '', observacoes: '', prefere_silencio: false });
    setDividaPendente(0);
  };

  const iniciarAgendamento = (servico: any = null, forceLogado = false) => {
    if (usuarioLogado || forceLogado) {
      setServicoDetalhe(null);
      setServicoEscolhido(servico);
      setSessoesSelecionadas([]); 
      setDataEscolhida(null);
      setHoraEscolhida('');
      setStep(servico ? 2 : 1);
      setIsModalOpen(true);
      setTempoRestante(300);
      setQrCodePix(null);
      setPixId(null);
      setPixManualFallback(false);
      setIdsReservados([]);
    } else {
      localStorage.setItem('intencao_agendamento', servico ? JSON.stringify(servico) : 'geral');
      setServicoDetalhe(null);
      setIsAuthModalOpen(true); 
    }
  };

  const fecharModalECancelar = () => {
    if (step === 4) cancelarVagaExpirada(); // Libera se ela fechar no X
    setIsModalOpen(false);
    setSessoesSelecionadas([]);
  };

  const continuarComoConvidada = () => {
    setIsAuthModalOpen(false);
    const intencao = localStorage.getItem('intencao_agendamento');
    localStorage.removeItem('intencao_agendamento');
    if (intencao && intencao !== 'geral') {
      try { iniciarAgendamento(JSON.parse(intencao), true); } catch(e) { iniciarAgendamento(null, true); }
    } else {
      iniciarAgendamento(null, true);
    }
  };

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
      
      if (dataSugerida) {
         setTimeout(() => {
           try {
             const element = document.getElementById(`dia-${dataSugerida.getTime()}`);
             if(element) element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
           } catch(e) { console.log('Scroll interceptado') }
         }, 100);
      }
    } else {
      setSessoesSelecionadas([...sessoesSelecionadas, novaSessao]);
      setStep(3);
    }
  };

  const voltarData = () => {
    const sessoesSalvas = [...sessoesSelecionadas];
    const ultimaSessao = sessoesSalvas.pop();
    if (ultimaSessao) {
      setSessoesSelecionadas(sessoesSalvas);
      setDataEscolhida(ultimaSessao.data);
      setHoraEscolhida(ultimaSessao.hora);
    }
  };

  const calcularSinalBase = (servicoAtual = servicoEscolhido) => servicoAtual ? servicoAtual.preco * ((servicoAtual.taxa_sinal || 0) / 100) : 0;
  const calcularTotalSinalEDivida = () => calcularSinalBase() + dividaPendente;
  const calcularTaxaCartao = (valorBase: number) => valorBase * 0.05;
  const valorTotalCobrar = metodoPagamento === 'cartao' ? calcularTotalSinalEDivida() + calcularTaxaCartao(calcularTotalSinalEDivida()) : calcularTotalSinalEDivida();

  // 🚨 AQUI O CADEADO É COLOCADO NA VAGA!
  const validarEAvancarPagamento = async () => {
    if (isProcessando) return;
    setIsProcessando(true);
    let dividaAtual = 0;

    try {
      let numeroLimpo = clienteDados.telefone.replace(/\D/g, '');
      if (numeroLimpo.length >= 10) {
        if (numeroLimpo.length === 10 || numeroLimpo.length === 11) numeroLimpo = '55' + numeroLimpo;
        const { data: cli } = await supabase.from('clientes').select('divida_pendente').eq('telefone', numeroLimpo).limit(1).single();
        if (cli && cli.divida_pendente > 0) dividaAtual = cli.divida_pendente;
      }
      
      setDividaPendente(dividaAtual);

      const sessoesMapeadas = sessoesSelecionadas.map((s: any) => ({
        ...s, dataFiltroBase: formatarDataLocalStr(new Date(s.data))
      }));
      const duracaoMins = extrairMinutosDuracao(servicoEscolhido.duracao);

      // Bate na API para pedir o Bloqueio da Vaga!
      const resBloqueio = await fetch('/api/bloquear-vaga', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteDados, servicoEscolhido, sessoesSelecionadas: sessoesMapeadas, duracaoMins })
      });

      if (resBloqueio.status === 409) {
        alert("Poxa! 😢 Alguém acabou de pegar essa vaga na sua frente. Por favor, reinicie o agendamento escolhendo outro horário.");
        setIsProcessando(false); setIsModalOpen(false); setStep(1); return; 
      }

      if (!resBloqueio.ok) {
        alert("Erro de conexão ao reservar a vaga temporariamente.");
        setIsProcessando(false); return;
      }

      const dataBloqueio = await resBloqueio.json();
      const idsAprovados = dataBloqueio.idsReservados;
      setIdsReservados(idsAprovados); // Guardou no bolso!
      
      if (calcularSinalBase() > 0 || dividaAtual > 0) {
        setStep(4);
        processarPagamentoLocal(idsAprovados); 
      } else {
        // Se for de graça (sem sinal e sem dívida), já finaliza o cofre na hora
        await salvarAgendamentoOficial({ idsReservados: idsAprovados, clienteDados, servicoEscolhido, sessoesSelecionadas, metodoPagamento, dividaPendente });
        setStep(5);
        setIsProcessando(false);
      }
    } catch (e) {
      setIsProcessando(false);
    }
  };

  const processarPagamentoLocal = async (idsAprovados: number[]) => {
    if (metodoPagamento === 'pix') {
      try {
        const res = await fetch('/api/pagamento-monitor', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valor: valorTotalCobrar, descricao: `Sinal - ${servicoEscolhido.nome}` })
        });
        const data = await res.json();
        
        if (data.id) {
          setQrCodePix({ base64: data.qr_code_base64, copiaCola: data.qr_code });
          setPixId(data.id);
        } else {
          if (configuracoes?.chave_pix) setPixManualFallback(true);
          else alert("Ocorreu um erro ao gerar a chave PIX.");
        }
      } catch (e) {
        if (configuracoes?.chave_pix) setPixManualFallback(true);
        else alert("Ocorreu um erro ao processar.");
      } finally {
        setIsProcessando(false);
      }

    } else {
      localStorage.setItem('reserva_temp_debora', JSON.stringify({ idsReservados: idsAprovados, clienteDados, servicoEscolhido, sessoesSelecionadas, metodoPagamento, dividaPendente }));
      try {
        const resposta = await fetch('/api/pagamento', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titulo: servicoEscolhido.nome, preco: valorTotalCobrar, clienteNome: clienteDados.nome })
        });
        const data = await resposta.json();
        if (data.init_point) window.location.href = data.init_point;
        else { alert("Ocorreu um erro ao gerar o link. Tente novamente."); setIsProcessando(false); }
      } catch (erro) {
        alert("Erro de conexão. Verifique sua internet."); setIsProcessando(false);
      }
    }
  };

  const salvarAgendamentoOficial = async (dados: any) => {
    try {
      const valorSinalPago = dados.metodoPagamento === 'cartao' 
            ? calcularSinalBase(dados.servicoEscolhido) + calcularTaxaCartao(calcularSinalBase(dados.servicoEscolhido)) 
            : calcularSinalBase(dados.servicoEscolhido);

      const payload = {
        ...dados,
        valorSinalPago,
      };

      const response = await fetch('/api/finalizar-reserva', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });

      if (!response.ok) {
        alert("🚨 Erro ao efetivar a reserva. Chame a gente no WhatsApp.");
        return false;
      }

      const { numeroLimpo } = await response.json();

      const textoBase = configuracoes?.mensagem_confirmacao || "Olá, cliente. Tudo bem?\nSeu agendamento no Debora Nails Studio está confirmado.";
      const textoSilencio = dados.clienteDados.prefere_silencio ? "\n🤫 *Aviso:* A cliente optou pela Terapia Silenciosa." : "";
      const textoObs = dados.clienteDados.observacoes ? `\n📝 *Obs:* ${dados.clienteDados.observacoes}` : "";

      const datasFormatadasMsg = dados.sessoesSelecionadas.map((s: any, i: number) => {
         const [ano, mes, dia] = formatarDataLocalStr(new Date(s.data)).split('-');
         return `🔹 Sessão ${i + 1}: ${dia}/${mes}/${ano} às ${s.hora}`;
      }).join('\n');

      const mensagemCliente = `${textoBase}\n\n*Detalhes da Reserva:*\nCliente: ${dados.clienteDados.nome}\nServiço: ${dados.servicoEscolhido.nome}\n\n*Datas Agendadas:*\n${datasFormatadasMsg}\n\n*Política de Cancelamento:*\nLembre-se que em caso de cancelamento com menos de 24h ou falta, o valor restante do serviço será cobrado como multa na próxima reserva.${textoSilencio}${textoObs}\n\nNosso endereço é Rua Fritz Hasse, 38 - Centro, Jaraguá do Sul.\nAguardamos você.`;

      try {
        fetch('/api/whatsapp', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telefone: numeroLimpo, mensagem: mensagemCliente })
        });
      } catch (errWhatsApp) {}
      
      return true; 
    } catch (e) {
      console.error("Erro geral na função de salvamento", e);
      return false;
    }
  };

  const formatarTempo = (segundos: number) => `${Math.floor(segundos / 60).toString().padStart(2, '0')}:${(segundos % 60).toString().padStart(2, '0')}`;
  const rolarPara = (id: string) => {
    const elemento = document.getElementById(id);
    if (elemento) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = elemento.getBoundingClientRect().top;
      window.scrollTo({ top: elementRect - bodyRect - offset, behavior: 'smooth' });
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0204] text-white font-sans selection:bg-[#C7977D] selection:text-[#120308] relative overflow-x-hidden">
      
      {isSalvandoDb && (
         <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-[#DCAE96] mb-4" size={48} />
            <p className="text-[#F8D1BE] font-bold tracking-widest uppercase text-sm">Salvando sua reserva...</p>
         </div>
      )}

      <div className="fixed inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(199, 151, 125, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(199, 151, 125, 0.15) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#DCAE96]/5 rounded-full blur-[150px] pointer-events-none"></div>

      <nav className="fixed w-full top-0 left-0 z-[100] bg-[#0a0204]/90 backdrop-blur-xl border-b border-[#3a2522] px-5 py-3 md:px-8 md:py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
          <Image src="/debora.card.PNG" alt="Logo Debora Nails" width={48} height={48} priority className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border border-[#C7977D]/40 shadow-[0_0_10px_rgba(199,151,125,0.2)]" />
          <div className="flex flex-col">
            <span className="font-serif text-[18px] md:text-[22px] text-[#E8D3C8] leading-none mb-0.5">Debora Nails</span>
            <span className="text-[8px] md:text-[10px] text-gray-400 tracking-[0.15em] uppercase font-bold">Studio de Alto Padrão</span>
          </div>
        </div>
        
        <div className="hidden lg:flex items-center gap-2">
          <button onClick={() => rolarPara('sobre')} className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-[#F8D1BE] hover:bg-[#DCAE96]/10 transition-all">Quem sou eu?</button>
          <button onClick={() => rolarPara('servicos')} className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-[#F8D1BE] hover:bg-[#DCAE96]/10 transition-all">Serviços</button>
          {pacotes.length > 0 && <button onClick={() => rolarPara('pacotes')} className="px-5 py-2 rounded-full text-sm font-medium text-[#DCAE96] hover:text-[#F8D1BE] hover:bg-[#DCAE96]/10 transition-all flex items-center gap-1.5"><Crown size={14}/> Pacotes VIP</button>}
          <button onClick={() => rolarPara('portfolio')} className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-[#F8D1BE] hover:bg-[#DCAE96]/10 transition-all">Portfólio</button>
          <button onClick={() => rolarPara('espaco')} className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-[#F8D1BE] hover:bg-[#DCAE96]/10 transition-all">O Espaço</button>
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          {usuarioLogado ? (
            <div className="flex items-center gap-2 md:gap-4 md:border-r border-[#3a2522] md:pr-5">
              <Link href="/area-cliente" className="hidden md:flex items-center gap-1.5 text-[#C7977D] hover:text-white transition-colors text-xs font-bold uppercase tracking-wider bg-[#180A0D] border border-[#3a2522] px-3 py-1.5 rounded-full">
                {dadosFidelidade.isVip ? <Crown size={14} className="drop-shadow-[0_0_5px_#DCAE96]"/> : <User size={14}/>} Painel VIP
              </Link>
              <Link href="/area-cliente" className="md:hidden text-[#C7977D] p-2 bg-[#180A0D] border border-[#3a2522] rounded-full">
                {dadosFidelidade.isVip ? <Crown size={16}/> : <User size={16}/>}
              </Link>
              <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition-colors p-2 bg-[#180A0D] rounded-full border border-[#3a2522]" title="Sair da Conta">
                <LogOut size={16} className="md:w-4 md:h-4" />
              </button>
            </div>
          ) : (
            <Link href="/login" className="text-xs font-medium text-gray-500 hover:text-[#C7977D] transition-colors border-r border-[#3a2522] pr-3 md:pr-5">Login</Link>
          )}

          <button onClick={() => iniciarAgendamento()} className="bg-[#DCAE96] text-[#2D0A12] px-4 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-bold shadow-[0_0_15px_rgba(220,174,150,0.3)] hover:scale-105 transition-transform">
            Agendar
          </button>
        </div>
      </nav>

      <header className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 flex flex-col lg:flex-row items-center justify-between max-w-7xl mx-auto gap-12 z-10 overflow-visible">
        <div className="flex-1 text-center lg:text-left animate-in fade-in slide-in-from-left-8 duration-1000 fill-mode-both">
          <span className="inline-flex items-center gap-2 border border-[#C7977D]/30 bg-transparent px-5 py-1.5 rounded-full text-xs uppercase tracking-widest font-bold text-[#DCAE96] mb-8">
            <Award size={14} /> Design & Durabilidade
          </span>
          
          <h1 className="font-serif text-[42px] md:text-7xl text-white mb-6 leading-tight drop-shadow-lg">
            Sua melhor<br/>versão<br className="md:hidden"/> reflete nas suas<br/>
            <span className="text-[#F8D1BE] italic" style={{ textShadow: '0 0 25px rgba(248,209,190,0.6)' }}>mãos.</span>
          </h1>
          
          <p className="text-[17px] md:text-xl text-gray-300 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed font-light">
            Beleza com elegância e precisão. Alongamentos sofisticados com acabamento natural, simetria perfeita e durabilidade impecável. Agende uma experiência exclusiva.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-14">
            <button onClick={() => iniciarAgendamento()} className="w-full sm:w-auto bg-[#DCAE96] text-[#2D0A12] px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-[0_0_20px_rgba(220,174,150,0.4)]">
              Agendar Horário <ArrowRight size={20} />
            </button>
            <button onClick={() => rolarPara('portfolio')} className="w-full sm:w-auto bg-transparent border border-[#3a2522] text-white px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#120308] transition-colors">
              <Sparkles size={20} className="text-[#C7977D]" /> Explorar Galeria
            </button>
          </div>

          <div className="flex items-center justify-center lg:justify-start gap-4 md:gap-8 text-sm text-gray-400">
            <span className="flex flex-col items-center lg:items-start"><strong className="text-[#F8D1BE] text-lg font-serif">21 a 25 dias</strong> Durabilidade</span>
            <div className="w-px h-10 bg-[#3a2522]"></div>
            <span className="flex flex-col items-center lg:items-start"><strong className="text-[#F8D1BE] text-lg font-serif">100%</strong> Esterilizado</span>
            <div className="w-px h-10 bg-[#3a2522]"></div>
            <span className="flex flex-col items-center lg:items-start"><strong className="text-[#F8D1BE] text-lg font-serif">Premium</strong> Produtos</span>
          </div>
        </div>

        <div className="flex-1 relative w-full max-w-md h-[500px] hidden lg:block animate-in fade-in slide-in-from-right-8 duration-1000 delay-300 fill-mode-both">
          <div className="absolute top-10 right-0 w-64 glass-card neon-border rounded-3xl p-6 flex flex-col items-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-20 hover:-translate-y-2 transition-transform duration-500">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#C7977D] mb-4 shadow-[0_0_15px_rgba(199,151,125,0.5)] relative">
              <Image src="/debora.jpg" alt="Débora" fill priority sizes="(max-width: 768px) 100vw, 96px" className="object-cover" />
            </div>
            <strong className="text-[#F8D1BE] text-xl font-serif mb-1">Debora Nails Studio</strong>
            <span className="text-gray-400 text-xs uppercase tracking-widest mb-5">Beauty & Nail Design</span>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-3 py-1 rounded-full uppercase flex items-center gap-1.5 font-bold"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Atendendo</span>
          </div>

          <div className="absolute bottom-10 left-0 w-72 glass-card rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 border border-[#DCAE96]/20 hover:-translate-y-2 transition-transform duration-500">
            <div className="flex items-center gap-1.5 mb-5 border-b border-[#DCAE96]/10 pb-4">
              <div className="w-3 h-3 rounded-full bg-red-400/80"></div><div className="w-3 h-3 rounded-full bg-yellow-400/80"></div><div className="w-3 h-3 rounded-full bg-emerald-400/80"></div>
              <span className="text-xs text-gray-500 ml-2 font-mono">deboranails.com.br</span>
            </div>
            <div className="inline-flex items-center gap-2 text-xs text-[#C7977D] font-bold uppercase tracking-wider mb-2">
              <Award size={14} /> Assinatura de Estilo
            </div>
            <h3 className="font-serif text-white text-2xl mb-3">Realce sua beleza</h3>
            <p className="text-sm text-gray-400 leading-relaxed">Técnicas avançadas para alongamentos com aspecto incrivelmente natural.</p>
          </div>
        </div>
      </header>

      <Sobre />

      <section id="servicos" className="py-24 pl-6 md:pl-0 max-w-7xl mx-auto relative z-10">
        <div className="text-left md:text-center mb-12 md:px-6">
          <span className="glow-text text-sm font-bold uppercase tracking-widest">Nossos Serviços</span>
          <h2 className="font-serif text-4xl md:text-5xl text-white mt-2">Especialidades do Studio</h2>
        </div>

        <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-12 pr-6 md:px-6 hide-scroll">
          {servicosComuns.length === 0 ? (
            <div className="w-full py-10 text-center"><Loader2 className="animate-spin text-[#C7977D] mx-auto" size={40} /></div>
          ) : (
            servicosComuns.map((serv) => (
              <article 
                key={serv.id} 
                onClick={() => setServicoDetalhe(serv)} 
                className="shrink-0 w-[300px] md:w-[350px] snap-center h-[420px] rounded-3xl overflow-hidden relative cursor-pointer neon-hover transition-all duration-300 group border border-[#3a2522] shadow-xl"
              >
                {serv.imagens && serv.imagens.length > 0 ? (
                  <Image src={serv.imagens[0]} alt={serv.nome} fill sizes="(max-width: 768px) 100vw, 350px" className="object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full bg-[#120308] flex items-center justify-center"><Sparkles size={40} className="text-[#C7977D] opacity-30" /></div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0204] via-[#0a0204]/70 to-transparent pointer-events-none"></div>
                
                {serv.taxa_sinal > 0 && (
                  <div className="absolute top-4 left-4 glass-card border border-[#DCAE96]/30 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                    <ShieldCheck size={14} className="text-[#E8D3C8]" />
                    <span className="text-[10px] uppercase font-bold text-[#E8D3C8] tracking-wider">Requer Sinal ({serv.taxa_sinal}%)</span>
                  </div>
                )}

                <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col justify-end z-10">
                  <h3 className="font-serif text-2xl text-white mb-2 leading-tight group-hover:text-[#F8D1BE] transition-colors">{serv.nome}</h3>
                  <p className="text-gray-300 text-sm line-clamp-3 leading-relaxed mb-4">{serv.descricao}</p>
                  
                  <div className="flex justify-between items-center border-t border-white/20 pt-4">
                    <span className="text-[#F8D1BE] font-bold text-xl">R$ {serv.preco.toFixed(2).replace('.', ',')}</span>
                    <button className="bg-[#25D366] text-white w-10 h-10 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(37,211,102,0.4)] group-hover:scale-110 transition-transform">
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {pacotes.length > 0 && (
        <section id="pacotes" className="py-24 px-6 relative z-10 bg-gradient-to-b from-[#0a0204] to-[#120308] border-t border-[#3a2522]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="inline-flex items-center gap-2 bg-gradient-to-r from-[#DCAE96] to-[#C7977D] text-[#120308] px-4 py-1.5 rounded-full text-xs uppercase tracking-widest font-bold mb-4 shadow-[0_0_15px_rgba(220,174,150,0.3)]">
                Clube VIP
              </span>
              <h2 className="font-serif text-4xl md:text-5xl text-white mt-2 mb-4">Assinaturas Exclusivas</h2>
              <p className="text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
                A experiência definitiva. Garanta suas vagas fixas para o mês inteiro, mantenha suas mãos impecáveis e garanta a sua prioridade no estúdio.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center mt-12 items-center">
              {pacotes.map((pacote, index) => {
                const imagem = pacote.imagens && pacote.imagens.length > 0 ? pacote.imagens[0] : null;
                const isDestaque = index === 1;

                return (
                  <div 
                    key={pacote.id} 
                    onClick={() => setServicoDetalhe(pacote)} 
                    className={`relative rounded-3xl overflow-hidden group flex flex-col bg-[#180A0D] transition-all duration-500 cursor-pointer ${isDestaque ? 'border-2 border-[#C7977D] shadow-[0_0_40px_rgba(199,151,125,0.4)] scale-100 md:scale-105 z-10' : 'border border-[#3a2522] hover:border-[#DCAE96]/50 shadow-2xl'}`}
                  >
                    
                    {isDestaque && (
                      <div className="absolute top-4 right-4 z-30 bg-gradient-to-r from-[#DCAE96] to-[#C7977D] text-[#120308] px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-[0_0_20px_rgba(220,174,150,0.8)] animate-pulse" style={{ animationDuration: '3s' }}>
                        🔥 Mais Popular
                      </div>
                    )}
                    
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#DCAE96]/10 rounded-bl-full rounded-tr-3xl -z-10 transition-all duration-500 group-hover:bg-[#DCAE96]/20"></div>

                    <div className="h-48 relative overflow-hidden bg-black shrink-0">
                      {imagem ? (
                        <Image src={imagem} alt={pacote.nome} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100" />
                      ) : (
                        <div className="flex items-center justify-center h-full opacity-30"><Sparkles size={40} className="text-[#C7977D]" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#180A0D] via-[#180A0D]/50 to-transparent"></div>
                      
                      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#DCAE96]/30 flex items-center gap-1.5 shadow-lg">
                         <span className="text-[10px] text-[#F8D1BE] uppercase font-bold tracking-widest">
                           {pacote.qtd_sessoes} Sessões Mensais
                         </span>
                      </div>
                    </div>

                    <div className="p-6 relative z-10 flex flex-col flex-1 mt-2">
                      <h3 className="text-2xl font-serif text-white leading-tight mb-4 group-hover:text-[#F8D1BE] transition-colors min-h-[56px] line-clamp-2">{pacote.nome}</h3>
                      
                      <ul className="space-y-3 mb-6 flex-1 min-h-[90px]">
                        <li className="flex items-start gap-2 text-sm text-gray-300">
                          <CheckCircle2 size={18} className="text-[#C7977D] shrink-0 mt-0.5" />
                          <span className="line-clamp-2">Direito a <strong>{pacote.qtd_sessoes} horários</strong> no mês</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-gray-300">
                          <CheckCircle2 size={18} className="text-[#C7977D] shrink-0 mt-0.5" />
                          <span className="line-clamp-2">Vagas fixas e prioritárias</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-gray-300">
                          <CheckCircle2 size={18} className="text-[#C7977D] shrink-0 mt-0.5" />
                          <span className="line-clamp-2">Mais econômico que avulso</span>
                        </li>
                      </ul>

                      <div className="flex items-end gap-1 mb-4 border-t border-[#3a2522] pt-4">
                        <span className="text-[#C7977D] text-sm font-bold mb-1">R$</span>
                        <span className="text-4xl font-bold text-white tracking-tight break-all">{pacote.preco.toFixed(2).replace('.', ',')}</span>
                        <span className="text-gray-500 text-xs mb-1.5">/mês</span>
                      </div>

                      <div className="flex justify-center mb-4 mt-2 h-[18px]">
                        <span className="text-[9px] text-[#C7977D] uppercase tracking-widest font-bold flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <Info size={10} /> Clique na foto para detalhes
                        </span>
                      </div>

                      <button 
                        onClick={(e) => { e.stopPropagation(); iniciarAgendamento(pacote); }}
                        className="w-full bg-gradient-to-r from-[#DCAE96] to-[#C7977D] text-[#120308] py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:scale-[1.03] transition-transform shadow-[0_0_20px_rgba(220,174,150,0.3)] flex justify-center items-center gap-2 mt-auto relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
                        <Crown size={18} className="relative z-10" /> <span className="relative z-10">Garantir Minhas Vagas</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <Portfolio />
      <Espaco />
      <FAQ />

      <section className="py-24 px-6 relative z-10 border-t border-[#3a2522] bg-[#0a0204]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-5xl md:text-6xl text-white mb-6">Tá esperando o quê?</h2>
          <p className="text-xl text-[#E8D3C8] mb-10 font-light px-4">Suas unhas merecem esse nível de qualidade e durabilidade. As vagas da semana são limitadas, então não deixe para depois o autocuidado que você precisa hoje.</p>
          <button onClick={() => iniciarAgendamento()} className="bg-gradient-to-r from-[#DCAE96] to-[#C7977D] text-[#120308] px-8 py-4 md:px-12 md:py-5 rounded-full font-bold text-base md:text-xl flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-[0_0_40px_rgba(220,174,150,0.4)] mx-auto animate-pulse" style={{ animationDuration: '3s' }}>
            <CalendarDays size={20} className="md:w-6 md:h-6" /> Garantir Meu Horário
          </button>
        </div>
      </section>

      {!bubbleFechado && (
        <div className="fixed bottom-6 right-4 md:right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
          {showWaBubble && (
            <div className="bg-[#1a0c0f] border border-[#DCAE96]/20 p-5 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-[280px] animate-in slide-in-from-bottom-8 duration-700 relative pointer-events-auto">
              <button onClick={() => setBubbleFechado(true)} className="absolute top-2 right-2 text-gray-500 hover:text-white transition-colors bg-[#0a0204] rounded-full p-1"><X size={14}/></button>
              <div className="flex items-center gap-3 mb-3">
                <Image src="/debora.card.PNG" width={48} height={48} alt="Débora" className="w-12 h-12 rounded-full border border-[#DCAE96]/40 object-cover shrink-0" />
                <strong className="text-[#F8D1BE] text-lg font-serif">Oii! 👋🏼</strong>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-light">Ficou com alguma dúvida ou não encontrou o horário ideal para o seu agendamento? Fale comigo pelo WhatsApp e vou te ajudar a encontrar a melhor opção para você. 💕</p>
            </div>
          )}
          <a href="https://wa.me/5547996987519" target="_blank" className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,211,102,0.4)] hover:scale-110 transition-all cursor-pointer pointer-events-auto relative">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.88-.653-1.474-1.46-1.647-1.757-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
            {showWaBubble && <span className="absolute top-0 right-0 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-[#120308]"></span></span>}
          </a>
        </div>
      )}
      
      <footer className="bg-[#050102] py-10 px-6 border-t border-[#3a2522] text-center md:text-left relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div><span className="font-serif text-xl text-[#F8D1BE]">Debora Nails</span><p className="text-gray-500 text-xs mt-1">Qualidade e cuidado em cada detalhe.</p></div>
          <div className="text-gray-500 text-xs md:text-center"><p>© 2026 Debora Nails.</p><p>Todos os direitos reservados.</p></div>
        </div>
      </footer>

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md px-4 py-6">
          <div className="bg-[#0a0204] border border-[#3a2522] rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 p-8 text-center relative">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white bg-[#180A0D] p-2 rounded-full transition-colors"><X size={16} /></button>
            <div className="w-16 h-16 bg-gradient-to-r from-[#DCAE96] to-[#C7977D] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(220,174,150,0.4)]"><Sparkles size={28} className="text-[#120308]" /></div>
            <h2 className="font-serif text-3xl text-white mb-3">Acesso VIP ✨</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-8 font-light">Para ter acesso exclusivo ao seu histórico de agendamentos e fidelidade, crie sua conta.</p>
            <div className="flex flex-col gap-3">
               <Link href="/login?modo=cadastro" className="w-full bg-gradient-to-r from-[#DCAE96] to-[#C7977D] text-[#120308] py-3.5 rounded-full font-bold shadow-lg hover:scale-105 transition-transform text-sm">Criar Conta Rápida</Link>
               <Link href="/login" className="w-full bg-[#120308] border border-[#3a2522] text-white py-3.5 rounded-full font-bold hover:bg-[#180A0D] transition-colors text-sm">Fazer Login</Link>
               <div className="w-full h-px bg-[#3a2522] my-2"></div>
               <button onClick={continuarComoConvidada} className="w-full bg-transparent text-gray-400 py-2 rounded-full font-medium hover:text-white transition-colors text-xs underline underline-offset-4 mt-2">Continuar sem conta</button>
            </div>
          </div>
        </div>
      )}

      {servicoDetalhe && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md px-4 py-6">
          <div className="bg-[#120308] border border-[#3a2522] rounded-[32px] w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(199,151,125,0.2)] flex flex-col animate-in zoom-in-95 max-h-full">
            <div className="relative h-64 bg-[#2D0A12] shrink-0">
              <button onClick={() => setServicoDetalhe(null)} className="absolute top-4 right-4 z-20 bg-black/50 text-white rounded-full p-2 hover:bg-black transition-colors"><X size={20}/></button>
              {servicoDetalhe.imagens && servicoDetalhe.imagens.length > 0 ? (
                <Image src={servicoDetalhe.imagens[0]} alt={servicoDetalhe.nome} fill sizes="(max-width: 768px) 100vw, 350px" className="object-cover" />
              ) : <div className="flex items-center justify-center h-full"><Sparkles size={50} className="text-[#C7977D]" /></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-[#120308] via-[#120308]/40 to-transparent"></div>
            </div>
            
            <div className="p-8 -mt-12 relative z-20 bg-gradient-to-b from-transparent to-[#120308] overflow-y-auto hide-scroll flex-1">
              <h2 className="font-serif text-2xl text-white mb-3 leading-tight">{servicoDetalhe.nome}</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {servicoDetalhe.is_pacote && (
                   <span className="bg-gradient-to-r from-[#DCAE96] to-[#C7977D] text-[#120308] border border-[#DCAE96]/30 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider flex items-center gap-1"><Crown size={12}/> Clube VIP</span>
                )}
                <span className="bg-[#180A0D] text-[#E8D3C8] border border-[#3a2522] px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider"><Clock size={12} className="inline mr-1"/> {servicoDetalhe.duracao}</span>
                {servicoDetalhe.taxa_sinal > 0 && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider">Sinal {servicoDetalhe.taxa_sinal}%</span>}
              </div>
              
              <p className="text-gray-400 text-sm mb-6 leading-relaxed font-light">{servicoDetalhe.descricao}</p>

              {servicoDetalhe.is_pacote && (
                <div className="bg-gradient-to-br from-[#2D0A12] to-[#180A0D] border border-[#DCAE96]/30 p-5 rounded-2xl mb-6 shadow-inner">
                  <h4 className="text-[#F8D1BE] font-serif text-lg mb-3 flex items-center gap-2"><Award size={18} className="text-[#C7977D]"/> Por que assinar o Clube VIP?</h4>
                  <ul className="space-y-3">
                     <li className="flex items-start gap-2 text-xs text-gray-300">
                       <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                       <span><strong>Zero Preocupação:</strong> Suas {servicoDetalhe.qtd_sessoes} sessões já ficam garantidas sem precisar disputar agenda todo mês.</span>
                     </li>
                     <li className="flex items-start gap-2 text-xs text-gray-300">
                       <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                       <span><strong>Economia Real:</strong> Valor com desconto aplicado exclusivamente para assinantes do clube.</span>
                     </li>
                     <li className="flex items-start gap-2 text-xs text-gray-300">
                       <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                       <span><strong>Status VIP:</strong> Prioridade máxima no atendimento no nosso estúdio.</span>
                     </li>
                  </ul>
                </div>
              )}

              <div className="flex justify-between items-center border-t border-[#3a2522] pt-6 mt-auto">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">{servicoDetalhe.is_pacote ? 'Valor Mensal' : 'Valor Total'}</p>
                  <p className="text-xl font-bold text-[#F8D1BE]">R$ {servicoDetalhe.preco.toFixed(2).replace('.', ',')}</p>
                </div>
                <button onClick={() => iniciarAgendamento(servicoDetalhe)} className="bg-gradient-to-r from-[#DCAE96] to-[#C7977D] text-[#120308] px-6 py-2.5 rounded-xl font-bold shadow-[0_0_20px_rgba(220,174,150,0.3)] hover:scale-105 transition-transform text-sm uppercase tracking-wider">
                  {servicoDetalhe.is_pacote ? 'Assinar Agora' : 'Agendar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-md px-4 py-6">
          <div className="bg-[#0a0204] border border-[#3a2522] rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-[#3a2522] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                {step < 5 && <div className="bg-[#DCAE96] text-[#120308] w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">{step}</div>}
                <h2 className="text-sm md:text-base font-serif text-white">{step === 1 ? 'Escolha o Serviço' : step === 2 ? 'Data e Hora' : step === 3 ? 'Seus Dados' : step === 4 ? 'Pagamento Seguro' : 'Pronto!'}</h2>
              </div>
              {step < 5 && <button onClick={fecharModalECancelar} className="text-gray-500 hover:text-white bg-[#180A0D] p-1.5 rounded-full"><X size={16} /></button>}
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#120308]">
              {step === 1 && (
                <div className="space-y-3">
                  {servicosComuns.map(s => (
                    <div key={s.id} onClick={() => {setServicoEscolhido(s); setStep(2);}} className="glass-card neon-hover border border-[#3a2522] p-4 rounded-2xl cursor-pointer flex justify-between items-center group transition-all">
                      <div>
                        <h4 className="text-white font-serif text-base mb-1 group-hover:text-[#DCAE96] transition-colors">{s.nome}</h4>
                        <p className="text-[10px] text-gray-400">{s.duracao} • Sinal {s.taxa_sinal}%</p>
                      </div>
                      <span className="text-[#F8D1BE] font-bold text-sm">R$ {s.preco.toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>
              )}
              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  
                  <div className="text-center mb-4">
                    <h3 className="text-[#F8D1BE] font-serif text-xl">{servicoEscolhido?.nome}</h3>
                    {servicoEscolhido?.is_pacote && (
                       <p className="text-[#C7977D] text-xs uppercase tracking-widest font-bold mt-1">Agendando Sessão {sessoesSelecionadas.length + 1} de {servicoEscolhido.qtd_sessoes}</p>
                    )}
                  </div>

                  {sessoesSelecionadas.length > 0 && (
                    <div className="mb-6 bg-black/40 border border-[#DCAE96]/20 p-3 rounded-xl animate-in fade-in">
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold mb-2">Sessões já escolhidas:</p>
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

                  <div>
                    <div className="flex justify-between items-end mb-3">
                      <label className="block text-[10px] md:text-xs text-[#E8D3C8] font-bold uppercase tracking-wider">
                        Dias Disponíveis
                        {dataEscolhida && <span className="block text-[#C7977D] font-serif capitalize mt-0.5 text-sm">{dataEscolhida.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>}
                      </label>
                      {sessoesSelecionadas.length > 0 && (
                        <button onClick={voltarData} className="text-[#C7977D] text-xs font-bold hover:text-white transition-colors underline underline-offset-2 mb-1">Desfazer Data</button>
                      )}
                    </div>
                    {diasDisponiveis.length === 0 ? (
                      <p className="text-xs text-red-400">Nenhuma data disponível na agenda no momento.</p>
                    ) : (
                      <div className="flex gap-2 overflow-x-auto hide-scroll pb-2">
                        {diasDisponiveis.map((data, idx) => (
                          <button key={idx} id={`dia-${data.getTime()}`} onClick={() => setDataEscolhida(data)} className={`shrink-0 w-16 py-2.5 rounded-xl flex flex-col items-center justify-center transition-all border ${dataEscolhida?.getDate() === data.getDate() && dataEscolhida?.getMonth() === data.getMonth() ? 'bg-[#DCAE96] text-[#120308] border-transparent font-bold shadow-lg scale-105' : 'glass-card text-gray-400 border-[#3a2522] hover:border-[#DCAE96]/50'}`}>
                            <span className="text-[8px] sm:text-[9px] uppercase opacity-70">{data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.','')}</span>
                            <span className="text-base sm:text-lg font-serif my-0.5">{data.getDate()}</span>
                            <span className={`text-[8px] sm:text-[9px] uppercase font-bold ${dataEscolhida?.getDate() === data.getDate() && dataEscolhida?.getMonth() === data.getMonth() ? 'text-[#120308]' : 'text-[#C7977D]'}`}>{data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.','')}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {dataEscolhida && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                      <label className="block text-[10px] md:text-xs text-[#E8D3C8] font-bold uppercase tracking-wider mb-3">Horários Livres</label>
                      {horariosLivres.length === 0 ? (
                         <div className="bg-[#180A0D] border border-red-500/20 p-4 rounded-xl text-center">
                           <Ban size={24} className="text-red-400/50 mx-auto mb-2" />
                           <p className="text-xs text-red-400">Nenhum horário livre para essa data.</p>
                         </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {horariosLivres.map(hora => (
                            <button key={hora} onClick={() => setHoraEscolhida(hora)} className={`py-3 rounded-xl transition-all border text-sm ${horaEscolhida === hora ? 'bg-[#DCAE96] text-[#120308] font-bold border-transparent shadow-lg' : 'glass-card border-[#3a2522] text-white hover:border-[#DCAE96]/50'}`}>{hora}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <button disabled={!dataEscolhida || !horaEscolhida} onClick={avancarData} className="w-full bg-[#DCAE96] text-[#120308] py-4 rounded-full font-bold mt-2 disabled:opacity-50 text-sm shadow-lg hover:scale-105 transition-transform">
                    {servicoEscolhido?.is_pacote && sessoesSelecionadas.length + 1 < servicoEscolhido.qtd_sessoes ? 'Salvar Horário e Escolher o Próximo' : 'Continuar'}
                  </button>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                  <div className="glass-card p-5 rounded-2xl border border-[#3a2522] mb-6">
                    <p className="text-[10px] text-[#C7977D] uppercase tracking-widest font-bold mb-1">Resumo do Horário</p>
                    <p className="text-white font-serif text-lg mb-3 leading-tight">{servicoEscolhido.nome}</p>
                    
                    <div className="space-y-2">
                       {sessoesSelecionadas.map((sessao, index) => (
                         <div key={index} className="flex justify-between items-center text-xs bg-black/40 p-2 rounded-lg border border-[#DCAE96]/10">
                           <span className="text-gray-400">Sessão {index + 1}</span>
                           <span className="font-bold text-[#F8D1BE]">{new Date(sessao.data).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})} às {sessao.hora}</span>
                         </div>
                       ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-xs text-[#E8D3C8] mb-1 font-medium">Nome Completo</label>
                    <input type="text" value={clienteDados.nome} onChange={e => setClienteDados({...clienteDados, nome: e.target.value})} placeholder="Como gosta de ser chamada?" className="w-full bg-[#180A0D] border border-[#3a2522] rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none focus:border-[#F8D1BE]"/>
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-xs text-[#E8D3C8] mb-1 font-medium">Seu WhatsApp</label>
                    <input type="tel" value={clienteDados.telefone} onChange={e => setClienteDados({...clienteDados, telefone: e.target.value})} placeholder="(47) 99999-9999" className="w-full bg-[#180A0D] border border-[#3a2522] rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none focus:border-[#F8D1BE]"/>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] md:text-xs text-[#E8D3C8] mb-1 font-medium">Observações (Opcional)</label>
                    <textarea value={clienteDados.observacoes} onChange={e => setClienteDados({...clienteDados, observacoes: e.target.value})} placeholder="Ex: Unha encravada, sensibilidade a algum produto..." className="w-full bg-[#180A0D] border border-[#3a2522] rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none focus:border-[#F8D1BE] resize-none h-20 custom-scrollbar"/>
                  </div>
                  
                  <div className="bg-[#180A0D] border border-[#3a2522] rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-[#DCAE96]/50 transition-colors" onClick={() => setClienteDados({...clienteDados, prefere_silencio: !clienteDados.prefere_silencio})}>
                    <div>
                      <p className="text-white text-sm font-bold flex items-center gap-2">Terapia Silenciosa 🤫</p>
                      <p className="text-gray-500 text-[10px] mt-0.5">Prefiro um atendimento sem muita conversa para relaxar.</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${clienteDados.prefere_silencio ? 'bg-[#DCAE96]' : 'bg-[#3a2522]'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${clienteDados.prefere_silencio ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                  </div>

                  <button disabled={!clienteDados.nome || !clienteDados.telefone || isProcessando} onClick={validarEAvancarPagamento} className="w-full bg-[#DCAE96] text-[#120308] py-4 rounded-full font-bold mt-2 disabled:opacity-50 text-sm shadow-lg hover:scale-105 transition-transform flex justify-center items-center gap-2">
                    {isProcessando ? <Loader2 className="animate-spin" size={20} /> : 'Confirmar Agendamento'}
                  </button>
                </div>
              )}
              {step === 4 && (
                <div className="animate-in fade-in slide-in-from-right-4">
                  
                  {dividaPendente > 0 && (
                    <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl mb-6 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                      <p className="text-red-400 font-bold text-sm flex items-center gap-2 mb-1"><AlertTriangle size={18}/> Débito Pendente de Falta</p>
                      <p className="text-gray-400 text-xs leading-relaxed">Identificamos um cancelamento tardio/falta na sua última reserva no valor de <strong>R$ {dividaPendente.toFixed(2).replace('.', ',')}</strong>. Como manda nossa política de cancelamento, esse valor foi adicionado ao seu sinal para liberar este novo agendamento.</p>
                    </div>
                  )}

                  {pixManualFallback ? (
                    <div className="bg-black/50 border border-[#00B1EA]/30 rounded-2xl p-6 flex flex-col items-center justify-center animate-in zoom-in-95">
                      <h3 className="text-[#00B1EA] font-bold mb-4 flex items-center gap-2"><QrCode size={20}/> Pague com a Chave PIX</h3>
                      <p className="text-gray-400 text-xs text-center mb-4">Envie o valor exato abaixo para a chave e clique em confirmar.</p>
                      <div className="w-full bg-[#180A0D] border border-[#3a2522] p-4 rounded-xl mb-6">
                        <p className="text-[10px] text-[#C7977D] uppercase tracking-widest font-bold mb-1">Chave ({configuracoes?.tipo_chave_pix || 'PIX'})</p>
                        <div className="flex gap-2 items-center">
                          <input type="text" readOnly value={configuracoes?.chave_pix || ''} className="flex-1 bg-transparent border-none text-white text-sm outline-none truncate font-mono" />
                          <button onClick={() => {navigator.clipboard.writeText(configuracoes?.chave_pix || ''); alert("Chave copiada!");}} className="bg-[#3a2522] text-white p-2 rounded-lg hover:bg-[#DCAE96] hover:text-black transition-colors shrink-0"><Copy size={14}/></button>
                        </div>
                      </div>
                      <button onClick={async () => { 
                        setIsSalvandoDb(true);
                        const dados = { idsReservados, clienteDados, servicoEscolhido, sessoesSelecionadas, metodoPagamento, dividaPendente };
                        const sucesso = await salvarAgendamentoOficial(dados);
                        if(sucesso) setStep(5);
                        setIsSalvandoDb(false);
                      }} className="w-full bg-[#00B1EA] text-white py-4 rounded-full font-bold flex justify-center items-center gap-2 hover:bg-[#0098C7] transition-all text-sm shadow-[0_0_20px_rgba(0,177,234,0.4)]">
                        <CheckCircle2 size={18}/> Já realizei o pagamento
                      </button>
                    </div>

                  ) : qrCodePix ? (
                    <div className="bg-black/50 border border-[#00B1EA]/30 rounded-2xl p-6 flex flex-col items-center justify-center animate-in zoom-in-95">
                      <h3 className="text-[#00B1EA] font-bold mb-4 flex items-center gap-2"><QrCode size={20}/> Escaneie para Pagar</h3>
                      <div className="bg-white p-2 rounded-xl mb-4 shadow-[0_0_20px_rgba(0,177,234,0.3)]">
                        <img src={`data:image/jpeg;base64,${qrCodePix.base64}`} alt="QR Code PIX" className="w-48 h-48" />
                      </div>
                      <p className="text-gray-400 text-xs mb-2">Ou use o código Copia e Cola:</p>
                      <div className="w-full flex gap-2">
                         <input type="text" readOnly value={qrCodePix.copiaCola} className="w-full bg-[#180A0D] border border-[#3a2522] rounded-lg px-3 py-2 text-[10px] text-gray-500 truncate" />
                         <button onClick={() => {navigator.clipboard.writeText(qrCodePix.copiaCola); alert("PIX Copiado!");}} className="bg-[#3a2522] text-white px-3 rounded-lg text-xs font-bold hover:bg-[#DCAE96] hover:text-black transition-colors flex items-center gap-1 shrink-0"><Copy size={12}/> Copiar</button>
                      </div>
                      <div className="mt-6 flex items-center gap-2 text-emerald-400 text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                         <Loader2 className="animate-spin" size={14} /> Aguardando Pagamento...
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center justify-between mb-4 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="text-red-400" size={20} />
                          <div><p className="text-white font-bold text-xs">Vaga reservada temporariamente!</p><p className="text-red-300 text-[10px] mt-0.5">Pague o sinal para confirmar.</p></div>
                        </div>
                        <div className="text-lg font-mono text-red-400 font-bold bg-[#120308] px-3 py-1 rounded-lg border border-red-500/30">{formatarTempo(tempoRestante)}</div>
                      </div>

                      <div className="mb-6 bg-black/40 border border-[#DCAE96]/20 p-4 rounded-2xl flex items-start gap-3">
                        <Info size={16} className="text-[#C7977D] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[#E8D3C8] text-xs font-bold mb-1">Política de Cancelamento</p>
                          <p className="text-gray-400 text-[10px] leading-relaxed">
                            Ao prosseguir, você concorda que: Cancelamentos com até 48h de antecedência garantem <strong>100% de estorno</strong>. Faltas ou cancelamentos com menos de 24h implicam em retenção do sinal e multa do valor restante na sua próxima reserva.
                          </p>
                        </div>
                      </div>

                      <div className="mb-6 pb-6 border-b border-[#3a2522] space-y-2">
                        <div className="flex justify-between text-xs text-gray-400"><span>Valor Total do {servicoEscolhido?.is_pacote ? 'Pacote' : 'Serviço'}</span><span>R$ {servicoEscolhido.preco.toFixed(2).replace('.', ',')}</span></div>
                        <div className="flex justify-between text-sm text-[#F8D1BE] font-bold"><span>Sinal Exigido ({servicoEscolhido.taxa_sinal}%)</span><span>R$ {calcularSinalBase().toFixed(2).replace('.', ',')}</span></div>
                        {dividaPendente > 0 && <div className="flex justify-between text-sm text-red-400 font-bold mt-2 pt-2 border-t border-red-500/20"><span>Dívida de Falta Adicionada</span><span>+ R$ {dividaPendente.toFixed(2).replace('.', ',')}</span></div>}
                      </div>

                      <label className="block text-[10px] md:text-xs text-[#E8D3C8] mb-3 font-bold uppercase tracking-wider">Forma de Pagamento</label>
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <label className={`relative border p-4 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-2 transition-all ${metodoPagamento === 'pix' ? 'border-[#00B1EA] bg-[#00B1EA]/10 shadow-[0_0_15px_rgba(0,177,234,0.2)]' : 'glass-card border-[#3a2522]'}`}>
                          <input type="radio" name="pagamento" value="pix" checked={metodoPagamento === 'pix'} onChange={() => setMetodoPagamento('pix')} className="sr-only" />
                          <QrCode size={24} className={metodoPagamento === 'pix' ? 'text-[#00B1EA]' : 'text-gray-400'} />
                          <span className={`font-bold text-sm ${metodoPagamento === 'pix' ? 'text-[#00B1EA]' : 'text-white'}`}>PIX</span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full absolute top-2 right-2 font-bold">Sem taxa</span>
                        </label>
                        <label className={`relative border p-4 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-2 transition-all ${metodoPagamento === 'cartao' ? 'border-[#00B1EA] bg-[#00B1EA]/10 shadow-[0_0_15px_rgba(0,177,234,0.2)]' : 'glass-card border-[#3a2522]'}`}>
                          <input type="radio" name="pagamento" value="cartao" checked={metodoPagamento === 'cartao'} onChange={() => setMetodoPagamento('cartao')} className="sr-only" />
                          <CreditCard size={24} className={metodoPagamento === 'cartao' ? 'text-[#00B1EA]' : 'text-gray-400'} />
                          <span className={`font-bold text-sm ${metodoPagamento === 'cartao' ? 'text-[#00B1EA]' : 'text-white'}`}>Cartão</span>
                          <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded absolute top-2 right-2">+5% taxa</span>
                        </label>
                      </div>

                      <div className="bg-[#180A0D] p-5 rounded-2xl border border-[#3a2522] flex justify-between items-center mb-6">
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Total a pagar agora</p>
                          <p className="text-2xl font-bold text-white">R$ {valorTotalCobrar.toFixed(2).replace('.', ',')}</p>
                        </div>
                        {metodoPagamento === 'cartao' && <div className="text-right"><p className="text-[10px] text-red-400 font-medium">R$ {calcularTaxaCartao(calcularTotalSinalEDivida()).toFixed(2).replace('.', ',')} de taxa inclusa</p></div>}
                      </div>

                      <button onClick={() => processarPagamentoLocal(idsReservados)} disabled={isProcessando} className="w-full bg-[#00B1EA] text-white py-4 rounded-full font-bold flex justify-center items-center gap-2 hover:bg-[#0098C7] transition-all text-sm shadow-[0_0_20px_rgba(0,177,234,0.4)]">
                        {isProcessando ? <Loader2 className="animate-spin" size={20} /> : <><ShieldCheck size={18}/> Pagar Seguramente</>}
                      </button>
                    </>
                  )}
                  {!pixManualFallback && <p className="text-center text-[10px] text-gray-500 mt-3 flex items-center justify-center gap-1 font-medium"><ShieldCheck size={10}/> Processado pelo Mercado Pago</p>}
                </div>
              )}
              {step === 5 && (
                <div className="py-8 flex flex-col items-center text-center animate-in zoom-in-95">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <CheckCircle2 size={32} className="text-emerald-400" />
                  </div>
                  <h2 className="font-serif text-2xl text-white mb-2">Confirmado!</h2>
                  <p className="text-gray-400 mb-8 text-sm">Te enviamos os detalhes no WhatsApp.</p>
                  
                  <div className="bg-[#180A0D] border border-[#3a2522] p-5 rounded-2xl w-full text-left mb-8">
                    <p className="text-white font-bold mb-3 text-sm">{servicoEscolhido.nome}</p>
                    
                    <div className="space-y-1 mb-4">
                       {sessoesSelecionadas.map((sessao, index) => (
                         <p key={index} className="text-[#C7977D] text-xs font-medium bg-black/30 p-2 rounded-lg border border-[#DCAE96]/10">Sessão {index + 1}: {new Date(sessao.data).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})} às {sessao.hora}</p>
                       ))}
                    </div>

                    <div className="bg-[#0a0204] p-3 rounded-lg border border-[#3a2522]">
                      <p className="text-[10px] md:text-xs text-gray-400">Restará pagar <strong className="text-white">R$ {(servicoEscolhido.preco - calcularSinalBase()).toFixed(2).replace('.', ',')}</strong> no momento do atendimento.</p>
                    </div>
                  </div>

                  <button onClick={() => {setIsModalOpen(false); setStep(1);}} className="bg-[#DCAE96] text-[#120308] px-8 py-3.5 rounded-full font-bold w-full text-sm shadow-lg hover:scale-105 transition-transform">Concluir</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,700;1,400&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0a0204; }
        .font-serif { font-family: 'Playfair Display', serif; }
        
        .ambient-grid { position: fixed; inset: 0; z-index: -1; background-image: linear-gradient(rgba(199, 151, 125, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(199, 151, 125, 0.08) 1px, transparent 1px); background-size: 35px 35px; }
        .glass-card { background: rgba(18, 3, 8, 0.6); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
        .neon-border { border: 1px solid rgba(199, 151, 125, 0.5); box-shadow: 0 0 20px rgba(199, 151, 125, 0.1); }
        .neon-hover:hover { border-color: rgba(220, 174, 150, 0.6); box-shadow: 0 0 25px rgba(220, 174, 150, 0.2); transform: translateY(-3px); }
        .glow-text { background: linear-gradient(90deg, #F8D1BE, #C7977D); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 8px rgba(248, 209, 190, 0.4)); }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(199, 151, 125, 0.4); border-radius: 10px; }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </main>
  );
}