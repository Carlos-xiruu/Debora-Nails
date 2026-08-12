'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Sparkles, Clock, ArrowRight, CheckCircle2, ShieldCheck, Loader2, X, CreditCard, QrCode, AlertCircle, MapPin, ChevronDown, Award, Heart, Coffee, Wifi, Wind, CarFront, LogOut, Crown, User, Copy, Ban } from 'lucide-react';
import { supabase } from './lib/supabase';
import Link from 'next/link';

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
  const [servicos, setServicos] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); 
  const [servicoDetalhe, setServicoDetalhe] = useState<any>(null);
  
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
  const [dadosFidelidade, setDadosFidelidade] = useState({ atendimentos: 0, isVip: false });
  
  const [step, setStep] = useState(1);
  const [servicoEscolhido, setServicoEscolhido] = useState<any>(null);
  const [dataEscolhida, setDataEscolhida] = useState<Date | null>(null);
  const [horaEscolhida, setHoraEscolhida] = useState('');
  const [clienteDados, setClienteDados] = useState({ nome: '', telefone: '' });
  
  const [metodoPagamento, setMetodoPagamento] = useState<'pix' | 'cartao'>('pix');
  const [tempoRestante, setTempoRestante] = useState(300);
  const [isProcessando, setIsProcessando] = useState(false);

  // NOVOS ESTADOS PARA O CÉREBRO DA AGENDA
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [configuracoes, setConfiguracoes] = useState<any>(null);
  const [diasDisponiveis, setDiasDisponiveis] = useState<Date[]>([]);
  const [horariosLivres, setHorariosLivres] = useState<string[]>([]);

  // ESTADOS DO PIX NATIVO
  const [qrCodePix, setQrCodePix] = useState<{base64: string, copiaCola: string} | null>(null);
  const [pixId, setPixId] = useState<string | null>(null);
  const [pixManualFallback, setPixManualFallback] = useState(false);

  const [faqAberto, setFaqAberto] = useState<number | null>(null);
  const [showWaBubble, setShowWaBubble] = useState(false);
  const [bubbleFechado, setBubbleFechado] = useState(false);

  // ========================================================
  // MATEMÁTICA DE HORÁRIOS (MESMA INTELIGÊNCIA DO DASHBOARD)
  // ========================================================
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
    const fetchDadosGerais = async () => {
      const { data: servs } = await supabase.from('servicos').select('*').eq('ativo', true).order('nome');
      if (servs) setServicos(servs);

      const { data: config } = await supabase.from('configuracoes').select('*').eq('id', 1).single();
      if (config) {
        setConfiguracoes({
          disponibilidade: Object.keys(config.disponibilidade).length > 0 ? config.disponibilidade : DISPONIBILIDADE_PADRAO,
          bloqueios: config.bloqueios || [],
          chave_pix: config.chave_pix,
          tipo_chave_pix: config.tipo_chave_pix
        });
      }

      const hojeStr = formatarDataLocalStr(new Date());
      const { data: agends } = await supabase.from('agendamentos').select('inicio, fim').gte('inicio', `${hojeStr}T00:00:00`);
      if (agends) setAgendamentos(agends);
    };

    fetchDadosGerais();
    const waTimer = setTimeout(() => setShowWaBubble(true), 20000); 
    return () => clearTimeout(waTimer);
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

    if (!regraDoDia || !regraDoDia.ativo) {
      setHorariosLivres([]); return;
    }

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
        const dInicio = new Date(a.inicio);
        const dFim = new Date(a.fim);
        const minInicio = dInicio.getHours() * 60 + dInicio.getMinutes();
        const minFim = dFim.getHours() * 60 + dFim.getMinutes();
        return (minAtual < minFim) && (fimMin > minInicio);
      });

      const conflitoBloqueio = blocksDoDia.some((b: any) => {
        const minInicio = converterParaMinutos(b.inicio);
        const minFim = converterParaMinutos(b.fim);
        return (minAtual < minFim) && (fimMin > minInicio);
      });

      if (!conflitoAgendamento && !conflitoBloqueio) {
        slotsLivres.push(converterParaHoraStr(minAtual));
      }
    }

    setHorariosLivres(slotsLivres);
    setHoraEscolhida('');
  }, [dataEscolhida, servicoEscolhido, configuracoes, agendamentos]);


  // ========================================================
  // LÓGICA DE SESSÃO E PAGAMENTOS
  // ========================================================
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
          const { data: clienteBanco } = await supabase.from('clientes').select('atendimentos').eq('telefone', telefoneUser).single();
          if (clienteBanco) setDadosFidelidade({ atendimentos: clienteBanco.atendimentos, isVip: clienteBanco.atendimentos >= 10 });
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
    setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const statusPagamento = params.get('pagamento');

      if (statusPagamento === 'sucesso') {
        const reservaSalva = localStorage.getItem('reserva_temp_debora');
        if (reservaSalva) {
          const dados = JSON.parse(reservaSalva);
          
          setServicoEscolhido(dados.servicoEscolhido);
          setDataEscolhida(new Date(dados.dataEscolhida));
          setHoraEscolhida(dados.horaEscolhida);
          setClienteDados(dados.clienteDados);
          setMetodoPagamento(dados.metodoPagamento);
          
          salvarAgendamentoOficial(dados);
          
          setStep(5);
          setIsModalOpen(true);
          localStorage.removeItem('reserva_temp_debora');
        }
        window.history.replaceState({}, document.title, window.location.pathname);
        
      } else if (statusPagamento === 'erro') {
        alert("O pagamento via cartão foi recusado pelo banco. Tente novamente.");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }, 500); 
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 4 && tempoRestante > 0) {
      timer = setInterval(() => setTempoRestante(prev => prev - 1), 1000);
    } else if (step === 4 && tempoRestante === 0) {
      alert("O tempo limite para pagamento expirou. A vaga foi liberada para outras clientes.");
      setIsModalOpen(false);
      setStep(1);
    }
    return () => clearInterval(timer);
  }, [step, tempoRestante]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pixId && step === 4 && !pixManualFallback) {
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
            const dados = { clienteDados, servicoEscolhido, dataEscolhida, horaEscolhida, metodoPagamento };
            await salvarAgendamentoOficial(dados);
            setStep(5);
          }
        } catch (e) {
           console.error("Erro ao checar PIX", e);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [pixId, step, pixManualFallback, clienteDados, servicoEscolhido, dataEscolhida, horaEscolhida, metodoPagamento]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUsuarioLogado(null);
    setDadosFidelidade({ atendimentos: 0, isVip: false });
    setClienteDados({ nome: '', telefone: '' });
  };

  const iniciarAgendamento = (servico: any = null, forceLogado = false) => {
    if (usuarioLogado || forceLogado) {
      setServicoDetalhe(null);
      setServicoEscolhido(servico);
      setStep(servico ? 2 : 1);
      setIsModalOpen(true);
      setTempoRestante(300);
      setQrCodePix(null);
      setPixId(null);
      setPixManualFallback(false);
    } else {
      localStorage.setItem('intencao_agendamento', servico ? JSON.stringify(servico) : 'geral');
      setServicoDetalhe(null);
      setIsAuthModalOpen(true); 
    }
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

  const calcularSinal = (servicoAtual = servicoEscolhido) => servicoAtual ? servicoAtual.preco * ((servicoAtual.taxa_sinal || 0) / 100) : 0;
  const calcularTaxaCartao = (valorBase: number) => valorBase * 0.05;
  const valorTotalSinal = metodoPagamento === 'cartao' ? calcularSinal() + calcularTaxaCartao(calcularSinal()) : calcularSinal();

  const processarPagamento = async () => {
    setIsProcessando(true);
    
    // 🛡️ TRAVA 1: VERIFICA SE A VAGA AINDA EXISTE ANTES DE GERAR COBRANÇA!
    if (dataEscolhida && servicoEscolhido && horaEscolhida) {
      const dataFiltroBase = formatarDataLocalStr(new Date(dataEscolhida));
      const inicioDate = new Date(`${dataFiltroBase}T${horaEscolhida}:00-03:00`);
      const duracaoMins = extrairMinutosDuracao(servicoEscolhido.duracao);
      const fimDate = new Date(inicioDate);
      fimDate.setMinutes(fimDate.getMinutes() + duracaoMins);

      const { data: vagaOcupada } = await supabase
        .from('agendamentos')
        .select('id')
        .lt('inicio', fimDate.toISOString())
        .gt('fim', inicioDate.toISOString());

      if (vagaOcupada && vagaOcupada.length > 0) {
        alert("Poxa! 😢 Alguém acabou de reservar esse horário enquanto você preenchia os dados. Por favor, escolha outro horário.");
        setIsProcessando(false);
        setIsModalOpen(false);
        setStep(1); 
        return; 
      }
    }
    
    if (metodoPagamento === 'pix') {
      try {
        const res = await fetch('/api/pagamento-monitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valor: valorTotalSinal, descricao: `Sinal Reserva - ${servicoEscolhido.nome}` })
        });
        const data = await res.json();
        
        if (data.id) {
          setQrCodePix({ base64: data.qr_code_base64, copiaCola: data.qr_code });
          setPixId(data.id);
        } else {
          if (configuracoes?.chave_pix) {
            setPixManualFallback(true);
          } else {
            alert("Ocorreu um erro ao gerar a chave PIX. Tente novamente.");
          }
        }
      } catch (e) {
        console.error("Erro PIX:", e);
        if (configuracoes?.chave_pix) {
          setPixManualFallback(true);
        } else {
          alert("Ocorreu um erro ao processar. Tente novamente.");
        }
      } finally {
        setIsProcessando(false);
      }

    } else {
      localStorage.setItem('reserva_temp_debora', JSON.stringify({ clienteDados, servicoEscolhido, dataEscolhida, horaEscolhida, metodoPagamento }));
      try {
        const resposta = await fetch('/api/pagamento', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titulo: servicoEscolhido.nome, preco: valorTotalSinal, clienteNome: clienteDados.nome })
        });
        const data = await resposta.json();
        if (data.init_point) {
          window.location.href = data.init_point;
        } else {
          alert("Ocorreu um erro ao gerar o link. Tente novamente.");
          setIsProcessando(false);
        }
      } catch (erro) {
        console.error(erro);
        alert("Erro de conexão. Verifique sua internet.");
        setIsProcessando(false);
      }
    }
  };

  const salvarAgendamentoOficial = async (dados: any) => {
    try {
      let cliente_id;
      
      const { data: clientesEncontrados, error: errBusca } = await supabase.from('clientes').select('id').eq('telefone', dados.clienteDados.telefone).limit(1);
      
      if (clientesEncontrados && clientesEncontrados.length > 0) {
        cliente_id = clientesEncontrados[0].id;
      } else {
        const { data: novoCliente, error: errCli } = await supabase.from('clientes').insert([{ nome: dados.clienteDados.nome, telefone: dados.clienteDados.telefone, status: 'Novo' }]).select().limit(1);
        if (errCli) {
          alert("🚨 Erro ao salvar Cliente: " + errCli.message);
          return;
        }
        if (novoCliente && novoCliente.length > 0) cliente_id = novoCliente[0].id;
      }

      if (cliente_id) {
        const dataFiltroBase = formatarDataLocalStr(new Date(dados.dataEscolhida));
        const inicioDate = new Date(`${dataFiltroBase}T${dados.horaEscolhida}:00-03:00`);
        const duracaoMins = extrairMinutosDuracao(dados.servicoEscolhido.duracao);
        const fimDate = new Date(inicioDate);
        fimDate.setMinutes(fimDate.getMinutes() + duracaoMins);

        // 🛡️ TRAVA 2: VERIFICAÇÃO FINAL ANTES DO INSERT (Impede clonagem exata)
        const { data: conflitoFinal } = await supabase
          .from('agendamentos')
          .select('id')
          .lt('inicio', fimDate.toISOString())
          .gt('fim', inicioDate.toISOString());

        if (conflitoFinal && conflitoFinal.length > 0) {
           alert("🚨 Ocorreu um conflito de horário no momento exato da reserva. Entre em contato com o suporte para verificarmos o estorno ou remanejamento da vaga.");
           return; 
        }

        const { error: errAgendamento } = await supabase.from('agendamentos').insert([{
          cliente_id: cliente_id, 
          servico_id: dados.servicoEscolhido.id, 
          tipo: 'agendado', 
          inicio: inicioDate.toISOString(), 
          fim: fimDate.toISOString()
        }]);

        if (errAgendamento) {
          alert("🚨 Erro ao salvar na Agenda (Supabase): " + errAgendamento.message);
          return; 
        }

        const valorSinalPago = dados.metodoPagamento === 'cartao' 
            ? calcularSinal(dados.servicoEscolhido) + calcularTaxaCartao(calcularSinal(dados.servicoEscolhido)) 
            : calcularSinal(dados.servicoEscolhido);

        const { error: errTransacao } = await supabase.from('transacoes').insert([{
          descricao: `Sinal (LP via ${dados.metodoPagamento.toUpperCase()}): ${dados.clienteDados.nome}`, 
          tipo: 'entrada', 
          valor: valorSinalPago, 
          categoria: 'Sinal'
        }]);

        const dataFormatada = new Date(dados.dataEscolhida).toLocaleDateString('pt-BR');
        const mensagemCliente = `Oii, ${dados.clienteDados.nome}! 💕 Passando para confirmar seu agendamento de *${dados.servicoEscolhido.nome}* para o dia *${dataFormatada}* às *${dados.horaEscolhida}*. Seu sinal foi recebido com sucesso e sua vaga está garantida no Debora Nails Studio! Te esperamos lá! ✨`;

        try {
          await fetch('/api/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telefone: dados.clienteDados.telefone, mensagem: mensagemCliente })
          });
        } catch (errWhatsApp) {
          console.error('Erro ao chamar API do WhatsApp:', errWhatsApp);
        }
      }
    } catch (e) {
      console.error("Erro geral na função de salvamento", e);
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
      
      <div className="fixed inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(199, 151, 125, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(199, 151, 125, 0.15) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#DCAE96]/5 rounded-full blur-[150px] pointer-events-none"></div>

      <nav className="fixed w-full top-0 left-0 z-[100] bg-[#0a0204]/90 backdrop-blur-xl border-b border-[#3a2522] px-5 py-3 md:px-8 md:py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
          <img src="/debora.card.PNG" alt="Logo Debora Nails" fetchPriority="high" className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border border-[#C7977D]/40 shadow-[0_0_10px_rgba(199,151,125,0.2)]" />
          <div className="flex flex-col">
            <span className="font-serif text-[18px] md:text-[22px] text-[#E8D3C8] leading-none mb-0.5">Debora Nails</span>
            <span className="text-[8px] md:text-[10px] text-gray-400 tracking-[0.15em] uppercase font-bold">Studio de Alto Padrão</span>
          </div>
        </div>
        
        <div className="hidden lg:flex items-center gap-2">
          <button onClick={() => rolarPara('sobre')} className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-[#F8D1BE] hover:bg-[#DCAE96]/10 transition-all">Quem sou eu?</button>
          <button onClick={() => rolarPara('servicos')} className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-[#F8D1BE] hover:bg-[#DCAE96]/10 transition-all">Serviços</button>
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
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#C7977D] mb-4 shadow-[0_0_15px_rgba(199,151,125,0.5)]">
              <img src="/debora.jpg" alt="Débora" fetchPriority="high" className="w-full h-full object-cover" />
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

      <section id="sobre" className="py-20 px-6 relative z-10">
        <div className="max-w-5xl mx-auto glass-card rounded-3xl p-6 md:p-12 border border-[#3a2522] flex flex-col md:flex-row items-center gap-10 shadow-2xl">
          <div className="w-full md:w-1/3 relative group">
            <img src="/debora.jpg" alt="Débora Silva" loading="lazy" decoding="async" className="w-full rounded-2xl relative z-10 border border-[#DCAE96]/20 object-cover aspect-square md:aspect-[4/5]" />
            <div className="absolute -bottom-5 -right-5 bg-[#0a0204] border border-[#C7977D]/40 text-[#F8D1BE] p-4 rounded-xl shadow-2xl z-20 flex flex-col items-center">
              <span className="text-3xl font-serif font-bold text-[#DCAE96]">6+</span>
              <span className="text-[9px] uppercase tracking-widest text-center font-bold mt-1">Anos de<br/>Experiência</span>
            </div>
          </div>
          <div className="w-full md:w-2/3">
            <span className="text-[#C7977D] text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-2"><Heart size={14}/> A Especialista</span>
            <h2 className="font-serif text-4xl text-white mb-5">Muito prazer, sou a <span className="italic text-[#DCAE96]">Debora.</span></h2>
            <div className="space-y-4 text-gray-300 text-base leading-relaxed font-light">
              <p>Por trás de cada detalhe, existe uma mulher que ama transformar beleza em autoestima.</p>
              <p>Há mais de 6 anos venho aperfeiçoando minhas técnicas, aprendendo, evoluindo e construindo um trabalho que carrega muito de quem eu sou: <strong>dedicação, delicadeza, perfeccionismo e amor pelo que faço</strong>.<br/>Para mim, cada cliente é única, e cada atendimento é uma oportunidade de fazer você se olhar no espelho e pensar: “uau, era exatamente isso que eu queria.” Mais do que unhas, eu entrego cuidado, confiança e uma experiência feita para você. </p>
            </div>
          </div>
        </div>
      </section>

      <section id="servicos" className="py-24 pl-6 md:pl-0 max-w-7xl mx-auto relative z-10">
        <div className="text-left md:text-center mb-12 md:px-6">
          <span className="glow-text text-sm font-bold uppercase tracking-widest">Nossos Serviços</span>
          <h2 className="font-serif text-4xl md:text-5xl text-white mt-2">Especialidades do Studio</h2>
        </div>

        <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-12 pr-6 md:px-6 hide-scroll">
          {servicos.length === 0 ? (
            <div className="w-full py-10 text-center"><Loader2 className="animate-spin text-[#C7977D] mx-auto" size={40} /></div>
          ) : (
            servicos.map((serv) => (
              <article 
                key={serv.id} 
                onClick={() => setServicoDetalhe(serv)} 
                className="shrink-0 w-[300px] md:w-[350px] snap-center h-[420px] rounded-3xl overflow-hidden relative cursor-pointer neon-hover transition-all duration-300 group border border-[#3a2522] shadow-xl"
              >
                {serv.imagens && serv.imagens.length > 0 ? (
                  <img src={serv.imagens[0]} alt={serv.nome} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
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

                <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col justify-end">
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

      <section id="portfolio" className="py-20 px-6 bg-[#050102] border-y border-[#3a2522] relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="glow-text text-sm font-bold uppercase tracking-widest">Galeria de Arte</span>
            <h2 className="font-serif text-4xl md:text-5xl text-white mt-2 mb-4">Transformações Reais</h2>
          </div>

          <h3 className="text-2xl font-serif text-[#F8D1BE] mb-6 border-l-4 border-[#C7977D] pl-4">Nails Design</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-16">
            {['/01.jpg', '/vermelha.jpeg', '/02.jpg'].map((img, i) => (
              <article key={i} className="glass-card neon-hover rounded-2xl overflow-hidden aspect-[4/5] border border-[#DCAE96]/20 group cursor-pointer">
                <img src={img} alt="Trabalho Debora Nails" loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              </article>
            ))}
          </div>

          <h3 className="text-2xl font-serif text-[#F8D1BE] mb-6 border-l-4 border-[#C7977D] pl-4">Maquiagem Profissional</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {['/make01.jpeg', '/make02.jpeg', '/make03.jpeg', '/make04.jpeg'].map((img, i) => (
              <article key={i} className="glass-card neon-hover rounded-2xl overflow-hidden aspect-square border border-[#DCAE96]/20 group cursor-pointer">
                <img src={img} alt="Maquiagem Profissional" loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="espaco" className="py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 grid grid-cols-2 gap-4 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#120308] to-transparent z-10 pointer-events-none rounded-3xl"></div>
            <div className="rounded-3xl w-full h-[300px] md:h-64 overflow-hidden border border-[#DCAE96]/20 mt-8 shadow-xl group">
               <img src="/cadeiras.png" alt="Interior do Ateliê" loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="rounded-3xl w-full h-[300px] md:h-64 overflow-hidden border-2 border-[#C7977D] shadow-[0_0_30px_rgba(199,151,125,0.3)]">
               <video autoPlay loop muted playsInline className="w-full h-full object-cover">
                  <source src="/espaco.mp4" type="video/mp4" />
               </video>
            </div>
            <div className="col-span-2 rounded-3xl w-full h-[200px] md:h-48 overflow-hidden border border-[#DCAE96]/20 shadow-xl group">
               <img src="/mesa.png" alt="Detalhe do Ateliê" loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            </div>
          </div>

          <div className="order-1 lg:order-2 text-center lg:text-left">
            <span className="glow-text text-xs md:text-sm font-bold uppercase tracking-widest mb-2 block">Onde a Mágica Acontece</span>
            <h2 className="font-serif text-4xl md:text-5xl text-white mb-6">Seu momento de <span className="text-[#F8D1BE] italic">paz e luxo.</span></h2>
            <p className="text-gray-400 text-sm md:text-lg mb-10 leading-relaxed font-light px-4 lg:px-0">
              Muito mais do que fazer as unhas, oferecemos uma experiência de relaxamento completa. 
              Nosso ateliê foi projetado para ser o seu refúgio da rotina corrida, com atendimento pontual e exclusivo.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 px-4 lg:px-0 text-left">
              <div className="flex items-center gap-3 bg-[#120308] p-3 rounded-xl border border-[#3a2522]">
                <div className="w-10 h-10 rounded-full bg-[#0a0204] flex items-center justify-center shrink-0"><Coffee className="text-[#C7977D]" size={18}/></div>
                <span className="text-[#E8D3C8] font-medium text-xs md:text-sm">Menu de Bebidas</span>
              </div>
              <div className="flex items-center gap-3 bg-[#120308] p-3 rounded-xl border border-[#3a2522]">
                <div className="w-10 h-10 rounded-full bg-[#0a0204] flex items-center justify-center shrink-0"><Wifi className="text-[#C7977D]" size={18}/></div>
                <span className="text-[#E8D3C8] font-medium text-xs md:text-sm">Wi-Fi Exclusivo</span>
              </div>
              <div className="flex items-center gap-3 bg-[#120308] p-3 rounded-xl border border-[#3a2522]">
                <div className="w-10 h-10 rounded-full bg-[#0a0204] flex items-center justify-center shrink-0"><CarFront className="text-[#C7977D]" size={18}/></div>
                <span className="text-[#E8D3C8] font-medium text-xs md:text-sm">Estacionamento</span>
              </div>
              <div className="flex items-center gap-3 bg-[#120308] p-3 rounded-xl border border-[#3a2522]">
                <div className="w-10 h-10 rounded-full bg-[#0a0204] flex items-center justify-center shrink-0"><Wind className="text-[#C7977D]" size={18}/></div>
                <span className="text-[#E8D3C8] font-medium text-xs md:text-sm">Climatização</span>
              </div>
            </div>

            <div className="glass-card p-5 md:p-6 rounded-[24px] border border-[#DCAE96]/20 shadow-xl mx-4 lg:mx-0 text-left">
              <h3 className="text-white font-bold mb-2 flex items-center gap-2 text-sm md:text-base"><MapPin className="text-[#C7977D]" size={18}/> Madalena Ateliê de Beleza</h3>
              <p className="text-gray-400 text-xs md:text-sm mb-4">Rua Fritz Hasse, 38 - Centro<br/>Jaraguá do Sul - SC, 89251-180</p>
              <div className="h-40 md:h-48 rounded-xl overflow-hidden border border-[#DCAE96]/10">
                 <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3570.9757661162407!2d-49.07930872662806!3d-26.4887251245534!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94de953cae7f01db%3A0x3b361fd6e7bd4a66!2sMadalena%20Ateli%C3%AA%20de%20Beleza!5e0!3m2!1spt-BR!2sbr!4v1785889183146!5m2!1spt-BR!2sbr" 
                  width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                  className="filter invert-[.9] hue-rotate-180 opacity-80"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 max-w-3xl mx-auto relative z-10 border-t border-[#3a2522]">
        <div className="text-center mb-10">
          <span className="glow-text text-sm font-bold uppercase tracking-widest">FAQ</span>
          <h2 className="font-serif text-3xl md:text-4xl text-white mt-2">Dúvidas Frequentes</h2>
        </div>
        <div className="space-y-4">
          {[
            { q: "Quanto tempo demora a aplicação da fibra?", a: "O procedimento leva em média de 2h a 2h30. Esse tempo é necessário para a preparação minuciosa e o acabamento impecável." },
            { q: "Quanto tempo demora o Banho de gel e Esmaltação?", a: "A esmaltação leva de 1h a 1h30. O banho de gel em média de 1h30 a 2h15, dependendo da necessidade da unha natural." },
            { q: "Quais os tipos de alongamento?", a: "Trabalhamos com técnica em molde F1 e Fibra de Vidro." },
            { q: "Quanto tempo dura a esmaltação em gel?", a: "De 15 a 20 dias, dependendo do cuidado prestado. Para o Banho de gel, de 21 a 25 dias." },
            { q: "Quais as formas de pagamento aceitas?", a: "Aceitamos pagamentos via PIX, cartão de crédito, débito e dinheiro." },
          ].map((faq, index) => (
            <article key={index} className="glass-card border border-[#3a2522] rounded-xl md:rounded-2xl overflow-hidden transition-all">
              <button onClick={() => setFaqAberto(faqAberto === index ? null : index)} className="w-full text-left p-4 md:p-6 flex justify-between items-center text-white font-serif text-base md:text-lg hover:text-[#F8D1BE] transition-colors">
                {faq.q}
                <ChevronDown className={`transition-transform duration-300 shrink-0 ml-4 ${faqAberto === index ? 'rotate-180 text-[#C7977D]' : 'text-gray-500'}`} />
              </button>
              <div className={`px-4 md:px-6 overflow-hidden transition-all duration-300 ${faqAberto === index ? 'max-h-40 pb-4 md:pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                <p className="text-gray-400 text-sm md:text-base leading-relaxed font-light">{faq.a}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

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
                <img src="/debora.card.PNG" className="w-12 h-12 rounded-full border border-[#DCAE96]/40 object-cover shrink-0" />
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
                <img src={servicoDetalhe.imagens[0]} alt={servicoDetalhe.nome} className="w-full h-full object-cover" />
              ) : <div className="flex items-center justify-center h-full"><Sparkles size={50} className="text-[#C7977D]" /></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-[#120308] via-[#120308]/40 to-transparent"></div>
            </div>
            <div className="p-8 -mt-12 relative z-20 bg-gradient-to-b from-transparent to-[#120308] overflow-y-auto hide-scroll flex-1">
              <h2 className="font-serif text-2xl text-white mb-3 leading-tight">{servicoDetalhe.nome}</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-[#180A0D] text-[#E8D3C8] border border-[#3a2522] px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider"><Clock size={12} className="inline mr-1"/> {servicoDetalhe.duracao}</span>
                {servicoDetalhe.taxa_sinal > 0 && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider">Sinal {servicoDetalhe.taxa_sinal}%</span>}
              </div>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed font-light">{servicoDetalhe.descricao}</p>
              <div className="flex justify-between items-center border-t border-[#3a2522] pt-6 mt-auto">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Valor Total</p>
                  <p className="text-xl font-bold text-[#F8D1BE]">R$ {servicoDetalhe.preco.toFixed(2).replace('.', ',')}</p>
                </div>
                <button onClick={() => iniciarAgendamento(servicoDetalhe)} className="bg-[#DCAE96] text-[#120308] px-6 py-2.5 rounded-full font-bold shadow-[0_0_15px_rgba(220,174,150,0.4)] hover:scale-105 transition-transform text-sm">Agendar</button>
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
              {step < 5 && <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white bg-[#180A0D] p-1.5 rounded-full"><X size={16} /></button>}
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#120308]">
              {step === 1 && (
                <div className="space-y-3">
                  {servicos.map(s => (
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
                  <div>
                    <label className="block text-[10px] md:text-xs text-[#E8D3C8] font-bold uppercase tracking-wider mb-3">Dias Disponíveis</label>
                    {diasDisponiveis.length === 0 ? (
                      <p className="text-xs text-red-400">Nenhuma data disponível na agenda no momento.</p>
                    ) : (
                      <div className="flex gap-2 overflow-x-auto hide-scroll pb-2">
                        {diasDisponiveis.map((data, idx) => (
                          <button key={idx} onClick={() => setDataEscolhida(data)} className={`shrink-0 w-16 py-3 rounded-xl flex flex-col items-center justify-center transition-all border ${dataEscolhida?.getDate() === data.getDate() ? 'bg-[#DCAE96] text-[#120308] border-transparent font-bold shadow-lg' : 'glass-card text-gray-400 border-[#3a2522] hover:border-[#DCAE96]/50'}`}>
                            <span className="text-[9px] uppercase mb-1">{data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.','')}</span>
                            <span className="text-lg font-serif">{data.getDate()}</span>
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
                           <p className="text-xs text-red-400">Nenhum horário livre suficiente para este serviço no dia selecionado.</p>
                         </div>
                      ) : (
                        // 👇 AQUI APLICAMOS A BLINDAGEM RESPONSIVA!
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {horariosLivres.map(hora => (
                            <button key={hora} onClick={() => setHoraEscolhida(hora)} className={`py-3 rounded-xl transition-all border text-sm ${horaEscolhida === hora ? 'bg-[#DCAE96] text-[#120308] font-bold border-transparent shadow-lg' : 'glass-card border-[#3a2522] text-white hover:border-[#DCAE96]/50'}`}>{hora}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <button disabled={!dataEscolhida || !horaEscolhida} onClick={() => setStep(3)} className="w-full bg-[#DCAE96] text-[#120308] py-4 rounded-full font-bold mt-2 disabled:opacity-50 text-sm shadow-lg hover:scale-105 transition-transform">Continuar</button>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                  <div className="glass-card p-5 rounded-2xl border border-[#3a2522] mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-[#C7977D] uppercase tracking-widest font-bold mb-1">Resumo do Horário</p>
                      <p className="text-white font-serif text-lg mb-1">{servicoEscolhido.nome}</p>
                      <p className="text-gray-400 text-xs">{dataEscolhida?.toLocaleDateString('pt-BR')} às {horaEscolhida}</p>
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
                  <button disabled={!clienteDados.nome || !clienteDados.telefone} onClick={() => { if (calcularSinal() > 0) setStep(4); else processarPagamento(); }} className="w-full bg-[#DCAE96] text-[#120308] py-4 rounded-full font-bold mt-2 disabled:opacity-50 text-sm shadow-lg hover:scale-105 transition-transform">
                    {calcularSinal() > 0 ? 'Ir para Pagamento da Reserva' : 'Confirmar Agendamento'}
                  </button>
                </div>
              )}
              {step === 4 && (
                <div className="animate-in fade-in slide-in-from-right-4">
                  
                  {pixManualFallback ? (
                    // PLANO B: CHAVE PIX DIRETO DO BANCO DE DADOS
                    <div className="bg-black/50 border border-[#00B1EA]/30 rounded-2xl p-6 flex flex-col items-center justify-center animate-in zoom-in-95">
                      <h3 className="text-[#00B1EA] font-bold mb-4 flex items-center gap-2"><QrCode size={20}/> Pague com a Chave PIX</h3>
                      
                      <p className="text-gray-400 text-xs text-center mb-4">Envie o valor do sinal para a chave abaixo e clique em confirmar.</p>
                      
                      <div className="w-full bg-[#180A0D] border border-[#3a2522] p-4 rounded-xl mb-6">
                        <p className="text-[10px] text-[#C7977D] uppercase tracking-widest font-bold mb-1">Chave ({configuracoes?.tipo_chave_pix || 'PIX'})</p>
                        <div className="flex gap-2 items-center">
                          <input type="text" readOnly value={configuracoes?.chave_pix || ''} className="flex-1 bg-transparent border-none text-white text-sm outline-none truncate font-mono" />
                          <button onClick={() => {navigator.clipboard.writeText(configuracoes?.chave_pix || ''); alert("Chave copiada!");}} className="bg-[#3a2522] text-white p-2 rounded-lg hover:bg-[#DCAE96] hover:text-black transition-colors shrink-0"><Copy size={14}/></button>
                        </div>
                      </div>
                      
                      <button onClick={() => { processarPagamento(); setStep(5); }} className="w-full bg-[#00B1EA] text-white py-4 rounded-full font-bold flex justify-center items-center gap-2 hover:bg-[#0098C7] transition-all text-sm shadow-[0_0_20px_rgba(0,177,234,0.4)]">
                        <CheckCircle2 size={18}/> Já realizei o pagamento
                      </button>
                    </div>

                  ) : qrCodePix ? (
                    // TELA DO PIX NATIVO AUTOMÁTICO
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
                    // TELA DE ESCOLHA DE PAGAMENTO
                    <>
                      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center justify-between mb-6 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="text-red-400" size={20} />
                          <div><p className="text-white font-bold text-xs">Vaga reservada temporariamente!</p><p className="text-red-300 text-[10px] mt-0.5">Pague o sinal para confirmar.</p></div>
                        </div>
                        <div className="text-lg font-mono text-red-400 font-bold bg-[#120308] px-3 py-1 rounded-lg border border-red-500/30">{formatarTempo(tempoRestante)}</div>
                      </div>

                      <div className="mb-6 pb-6 border-b border-[#3a2522] space-y-2">
                        <div className="flex justify-between text-xs text-gray-400"><span>Valor Total do Serviço</span><span>R$ {servicoEscolhido.preco.toFixed(2).replace('.', ',')}</span></div>
                        <div className="flex justify-between text-sm text-[#F8D1BE] font-bold"><span>Sinal Exigido ({servicoEscolhido.taxa_sinal}%)</span><span>R$ {calcularSinal().toFixed(2).replace('.', ',')}</span></div>
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
                          <p className="text-2xl font-bold text-white">R$ {valorTotalSinal.toFixed(2).replace('.', ',')}</p>
                        </div>
                        {metodoPagamento === 'cartao' && <div className="text-right"><p className="text-[10px] text-red-400 font-medium">R$ {calcularTaxaCartao(calcularSinal()).toFixed(2).replace('.', ',')} de taxa inclusa</p></div>}
                      </div>

                      <button onClick={processarPagamento} disabled={isProcessando} className="w-full bg-[#00B1EA] text-white py-4 rounded-full font-bold flex justify-center items-center gap-2 hover:bg-[#0098C7] transition-all text-sm shadow-[0_0_20px_rgba(0,177,234,0.4)]">
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
                    <p className="text-white font-bold mb-1 text-sm">{servicoEscolhido.nome}</p>
                    <p className="text-[#C7977D] text-xs mb-4 font-medium">{dataEscolhida?.toLocaleDateString('pt-BR')} às {horaEscolhida}</p>
                    <div className="bg-[#0a0204] p-3 rounded-lg border border-[#3a2522]">
                      <p className="text-[10px] md:text-xs text-gray-400">Restará pagar <strong className="text-white">R$ {(servicoEscolhido.preco - calcularSinal()).toFixed(2).replace('.', ',')}</strong> no dia do atendimento.</p>
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