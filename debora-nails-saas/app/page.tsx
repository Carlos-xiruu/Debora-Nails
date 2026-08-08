'use client'

import { useState, useEffect } from 'react';
import { CalendarDays, Sparkles, Clock, ArrowRight, CheckCircle2, ShieldCheck, Loader2, X, CreditCard, QrCode, AlertCircle, MapPin, ChevronDown, Award, Heart, MessageCircle, Coffee, Wifi, Wind, CarFront, Gem, Shield, Wand2, Palette } from 'lucide-react';
import { supabase } from './lib/supabase';
import Link from 'next/link';

export default function LandingPage() {
  const [servicos, setServicos] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [servicoDetalhe, setServicoDetalhe] = useState<any>(null);
  
  const [step, setStep] = useState(1);
  const [servicoEscolhido, setServicoEscolhido] = useState<any>(null);
  const [dataEscolhida, setDataEscolhida] = useState<Date | null>(null);
  const [horaEscolhida, setHoraEscolhida] = useState('');
  const [clienteDados, setClienteDados] = useState({ nome: '', telefone: '' });
  
  const [metodoPagamento, setMetodoPagamento] = useState<'pix' | 'cartao'>('pix');
  const [tempoRestante, setTempoRestante] = useState(300);
  const [isProcessando, setIsProcessando] = useState(false);

  const [faqAberto, setFaqAberto] = useState<number | null>(null);
  const [showWaBubble, setShowWaBubble] = useState(false);
  const [bubbleFechado, setBubbleFechado] = useState(false);

  const proximosDias = Array.from({length: 10}).map((_, i) => { const d = new Date(); d.setDate(d.getDate() + i + 1); return d; });
  const horariosLivres = ['09:00', '10:30', '13:30', '15:00', '16:30'];

  // 1. CARREGA SERVIÇOS
  useEffect(() => {
    const fetchServicos = async () => {
      const { data } = await supabase.from('servicos').select('*').eq('ativo', true).order('nome');
      if (data) setServicos(data);
    };
    fetchServicos();

    const waTimer = setTimeout(() => setShowWaBubble(true), 5000);
    return () => clearTimeout(waTimer);
  }, []);

  // 2. LIDA COM O RETORNO DO MERCADO PAGO
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusPagamento = params.get('pagamento');

    if (statusPagamento === 'sucesso') {
      const reservaSalva = localStorage.getItem('reserva_temp_debora');
      
      if (reservaSalva) {
        const dados = JSON.parse(reservaSalva);
        
        // Reconstrói a tela de sucesso com os dados que estavam na memória
        setServicoEscolhido(dados.servicoEscolhido);
        setDataEscolhida(new Date(dados.dataEscolhida));
        setHoraEscolhida(dados.horaEscolhida);
        setClienteDados(dados.clienteDados);
        setMetodoPagamento(dados.metodoPagamento);
        
        // Salva os dados oficialmente no Supabase AGORA (porque confirmamos o pagamento)
        salvarAgendamentoOficial(dados);
        
        setStep(5);
        setIsModalOpen(true);
        localStorage.removeItem('reserva_temp_debora'); // Limpa a memória
      }
      
      // Limpa a URL para ficar bonita de novo (tira o ?pagamento=sucesso)
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (statusPagamento === 'erro') {
      alert("O pagamento não foi concluído. Tente novamente.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // 3. CRONÔMETRO
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

  const iniciarAgendamento = (servico: any = null) => {
    setServicoDetalhe(null);
    setServicoEscolhido(servico);
    setStep(servico ? 2 : 1);
    setIsModalOpen(true);
    setTempoRestante(300);
  };

  const calcularSinal = (servicoAtual = servicoEscolhido) => servicoAtual ? servicoAtual.preco * ((servicoAtual.taxa_sinal || 0) / 100) : 0;
  const calcularTaxaCartao = (valorBase: number) => valorBase * 0.05;
  const valorTotalSinal = metodoPagamento === 'cartao' ? calcularSinal() + calcularTaxaCartao(calcularSinal()) : calcularSinal();

  // 4. CHAMA A API DO MERCADO PAGO QUE CRIAMOS
  const gerarPagamentoMercadoPago = async () => {
    setIsProcessando(true);
    
    // Salva na "memória" do navegador antes de sair da página
    localStorage.setItem('reserva_temp_debora', JSON.stringify({
      clienteDados,
      servicoEscolhido,
      dataEscolhida,
      horaEscolhida,
      metodoPagamento
    }));

    try {
      const resposta = await fetch('/api/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: servicoEscolhido.nome,
          preco: valorTotalSinal,
          clienteNome: clienteDados.nome,
          clienteTelefone: clienteDados.telefone
        })
      });

      const data = await resposta.json();

      if (data.url_pagamento) {
        // Redireciona a cliente REALMENTE para o Mercado Pago!
        window.location.href = data.url_pagamento;
      } else {
        alert("Ocorreu um erro ao gerar o link. Tente novamente.");
        setIsProcessando(false);
      }
    } catch (erro) {
      console.error(erro);
      alert("Erro de conexão. Verifique sua internet.");
      setIsProcessando(false);
    }
  };

  // 5. SALVA NO BANCO (Chamado automaticamente quando volta do MP com Sucesso)
  const salvarAgendamentoOficial = async (dados: any) => {
    try {
      let cliente_id;
      const { data: clienteExistente } = await supabase.from('clientes').select('id').eq('telefone', dados.clienteDados.telefone).single();
      
      if (clienteExistente) {
        cliente_id = clienteExistente.id;
      } else {
        const { data: novoCliente } = await supabase.from('clientes').insert([{ nome: dados.clienteDados.nome, telefone: dados.clienteDados.telefone, status: 'Novo' }]).select().single();
        if (novoCliente) cliente_id = novoCliente.id;
      }

      if (cliente_id) {
        const ano = new Date(dados.dataEscolhida).getFullYear();
        const mes = String(new Date(dados.dataEscolhida).getMonth() + 1).padStart(2, '0');
        const dia = String(new Date(dados.dataEscolhida).getDate()).padStart(2, '0');
        const inicioDate = new Date(`${ano}-${mes}-${dia}T${dados.horaEscolhida}:00-03:00`);
        const fimDate = new Date(inicioDate.getTime() + 2 * 60 * 60 * 1000);

        await supabase.from('agendamentos').insert([{
          cliente_id: cliente_id, servico_id: dados.servicoEscolhido.id, tipo: 'agendado', inicio: inicioDate.toISOString(), fim: fimDate.toISOString(), status_pagamento: 'pago'
        }]);

        // Cálculo dinâmico para garantir o registro exato
        const valorSinalPago = dados.metodoPagamento === 'cartao' 
           ? calcularSinal(dados.servicoEscolhido) + calcularTaxaCartao(calcularSinal(dados.servicoEscolhido)) 
           : calcularSinal(dados.servicoEscolhido);

        await supabase.from('transacoes').insert([{
          descricao: `Sinal (LP via ${dados.metodoPagamento.toUpperCase()}): ${dados.clienteDados.nome}`, 
          tipo: 'entrada', 
          valor: valorSinalPago, 
          categoria: 'Sinal'
        }]);
      }
    } catch (e) {
      console.error("Erro ao salvar no Supabase após pagamento", e);
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

  const getIconForService = (nome: string) => {
    const n = nome.toLowerCase();
    if (n.includes('fibra') || n.includes('alongamento')) return <Gem size={24} className="text-[#C7977D]" />;
    if (n.includes('banho') || n.includes('blindagem')) return <Shield size={24} className="text-[#C7977D]" />;
    if (n.includes('make') || n.includes('maquiagem')) return <Palette size={24} className="text-[#C7977D]" />;
    return <Wand2 size={24} className="text-[#C7977D]" />;
  };

  return (
    <div className="min-h-screen bg-[#0a0204] text-white font-sans selection:bg-[#C7977D] selection:text-[#120308] relative overflow-x-hidden">
      
      {/* GRID DE FUNDO E LUZES AMBIENTES */}
      <div className="fixed inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(199, 151, 125, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(199, 151, 125, 0.15) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#DCAE96]/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* NAVBAR */}
      <nav className="fixed w-full top-0 z-40 bg-[#0a0204]/80 backdrop-blur-xl border-b border-[#3a2522] px-5 py-3 md:px-8 md:py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
          <img src="/debora.card.PNG" alt="Logo" className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border border-[#C7977D]/40 shadow-[0_0_10px_rgba(199,151,125,0.2)]" />
          <div className="flex flex-col">
            <span className="font-serif text-[18px] md:text-[22px] text-[#E8D3C8] leading-none mb-0.5">Debora Nails</span>
            <span className="text-[8px] md:text-[10px] text-gray-400 tracking-[0.15em] uppercase font-bold">Studio de Alto Padrão</span>
          </div>
        </div>
        
        <div className="hidden lg:flex items-center gap-2">
          <button onClick={() => rolarPara('sobre')} className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-[#F8D1BE] hover:bg-[#DCAE96]/10 transition-all">A Especialista</button>
          <button onClick={() => rolarPara('servicos')} className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-[#F8D1BE] hover:bg-[#DCAE96]/10 transition-all">Serviços</button>
          <button onClick={() => rolarPara('portfolio')} className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-[#F8D1BE] hover:bg-[#DCAE96]/10 transition-all">Portfólio</button>
          <button onClick={() => rolarPara('espaco')} className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-[#F8D1BE] hover:bg-[#DCAE96]/10 transition-all">O Espaço</button>
        </div>

        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="text-xs font-medium text-gray-500 hover:text-[#C7977D] transition-colors hidden md:block">Login Profissional</Link>
          <button onClick={() => iniciarAgendamento()} className="bg-[#DCAE96] text-[#2D0A12] px-6 py-2.5 rounded-full text-sm font-bold shadow-[0_0_15px_rgba(220,174,150,0.3)] hover:scale-105 transition-transform">
            Agendar Agora
          </button>
        </div>
      </nav>


      {/* HERO SECTION */}
      <header className="relative pt-36 pb-20 md:pt-48 md:pb-32 px-6 flex flex-col lg:flex-row items-center justify-between max-w-7xl mx-auto gap-12 z-10 overflow-visible">
        
        {/* TEXTO ENTRA DA ESQUERDA */}
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

        {/* CARDS FLUTUANTES DESKTOP */}
        <div className="flex-1 relative w-full max-w-md h-[500px] hidden lg:block animate-in fade-in slide-in-from-right-8 duration-1000 delay-300 fill-mode-both">
          <div className="absolute top-10 right-0 w-64 glass-card neon-border rounded-3xl p-6 flex flex-col items-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-20 hover:-translate-y-2 transition-transform duration-500">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#C7977D] mb-4 shadow-[0_0_15px_rgba(199,151,125,0.5)]">
              <img src="/debora.jpg" alt="Débora" className="w-full h-full object-cover" />
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

      {/* SEÇÃO: QUEM SOU EU */}
      <section id="sobre" className="py-20 px-6 relative z-10">
        <div className="max-w-5xl mx-auto glass-card rounded-3xl p-6 md:p-12 border border-[#3a2522] flex flex-col md:flex-row items-center gap-10 shadow-2xl">
          <div className="w-full md:w-1/3 relative group">
            <img src="/debora.jpg" alt="Débora Silva" className="w-full rounded-2xl relative z-10 border border-[#DCAE96]/20 object-cover aspect-square md:aspect-[4/5]" />
            <div className="absolute -bottom-5 -right-5 bg-[#0a0204] border border-[#C7977D]/40 text-[#F8D1BE] p-4 rounded-xl shadow-2xl z-20 flex flex-col items-center">
              <span className="text-3xl font-serif font-bold text-[#DCAE96]">6+</span>
              <span className="text-[9px] uppercase tracking-widest text-center font-bold mt-1">Anos de<br/>Experiência</span>
            </div>
          </div>
          <div className="w-full md:w-2/3">
            <span className="text-[#C7977D] text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-2"><Heart size={14}/> A Especialista</span>
            <h2 className="font-serif text-4xl text-white mb-5">Muito prazer, sou a <span className="italic text-[#DCAE96]">Debora.</span></h2>
            <div className="space-y-4 text-gray-300 text-base leading-relaxed font-light">
              <p>Com mais de 6 anos de experiência dedicados a transformar a autoestima das mulheres, construí o meu espaço baseada em três pilares: <strong>Qualidade, durabilidade e uma experiência de luxo.</strong></p>
              <p>Não entrego apenas "unhas feitas". Eu entrego uma verdadeira consultoria de beleza para as suas mãos. Utilizando as melhores fibras do mercado e técnicas internacionais de simetria, garanto um resultado com a espessura idêntica à de uma unha natural, sem abrir mão da resistência.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: SERVIÇOS (CARDS COM IMAGEM CHEIA E NEON HOVER) */}
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
              <div 
                key={serv.id} 
                onClick={() => setServicoDetalhe(serv)} 
                className="shrink-0 w-[300px] md:w-[350px] snap-center h-[420px] rounded-3xl overflow-hidden relative cursor-pointer neon-hover transition-all duration-300 group border border-[#3a2522] shadow-xl"
              >
                {/* Imagem de Fundo (Zoom no hover) */}
                {serv.imagens && serv.imagens.length > 0 ? (
                  <img src={serv.imagens[0]} alt={serv.nome} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full bg-[#120308] flex items-center justify-center"><Sparkles size={40} className="text-[#C7977D] opacity-30" /></div>
                )}
                
                {/* Degradê Escuro Subindo */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0204] via-[#0a0204]/70 to-transparent pointer-events-none"></div>
                
                {/* Tag de Sinal no Topo */}
                {serv.taxa_sinal > 0 && (
                  <div className="absolute top-4 left-4 glass-card border border-[#DCAE96]/30 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                    <ShieldCheck size={14} className="text-[#E8D3C8]" />
                    <span className="text-[10px] uppercase font-bold text-[#E8D3C8] tracking-wider">Requer Sinal ({serv.taxa_sinal}%)</span>
                  </div>
                )}

                {/* Textos na Base */}
                <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col justify-end">
                  <h3 className="font-serif text-2xl text-white mb-2 leading-tight group-hover:text-[#F8D1BE] transition-colors">{serv.nome}</h3>
                  <p className="text-gray-300 text-sm line-clamp-3 leading-relaxed mb-4">{serv.descricao}</p>
                  
                  <div className="flex justify-between items-center border-t border-white/20 pt-4">
                    <span className="text-[#F8D1BE] font-bold text-xl">R$ {serv.preco.toFixed(2).replace('.', ',')}</span>
                    {/* Botão verde do WhatsApp integrado ao card como no seu print (mas abre o modal) */}
                    <button className="bg-[#25D366] text-white w-10 h-10 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(37,211,102,0.4)] group-hover:scale-110 transition-transform">
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      
       {/* SEÇÃO: PORTFÓLIO E ARTE */}
       <section id="portfolio" className="py-20 px-6 bg-[#050102] border-y border-[#3a2522] relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="glow-text text-sm font-bold uppercase tracking-widest">Galeria de Arte</span>
            <h2 className="font-serif text-4xl md:text-5xl text-white mt-2 mb-4">Transformações Reais</h2>
          </div>

          <h3 className="text-2xl font-serif text-[#F8D1BE] mb-6 border-l-4 border-[#C7977D] pl-4">Nails Design</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-16">
            {['/01.jpg', '/vermelha.jpeg', '/02.jpg'].map((img, i) => (
              <div key={i} className="glass-card neon-hover rounded-2xl overflow-hidden aspect-[4/5] border border-[#DCAE96]/20 group cursor-pointer">
                <img src={img} alt="Trabalho Debora" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              </div>
            ))}
          </div>

          <h3 className="text-2xl font-serif text-[#F8D1BE] mb-6 border-l-4 border-[#C7977D] pl-4">Maquiagem Profissional</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {['/make01.jpeg', '/make02.jpeg', '/make03.jpeg', '/make04.jpeg'].map((img, i) => (
              <div key={i} className="glass-card neon-hover rounded-2xl overflow-hidden aspect-square border border-[#DCAE96]/20 group cursor-pointer">
                <img src={img} alt="Maquiagem Profissional" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO: ESPAÇO */}
      <section id="espaco" className="py-20 px-4 sm:px-6 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          <div className="order-2 lg:order-1 grid grid-cols-2 gap-3 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#120308] to-transparent z-10 pointer-events-none rounded-3xl"></div>
            <div className="rounded-2xl w-full aspect-square md:h-[250px] lg:h-[300px] overflow-hidden border border-[#3a2522] mt-0 md:mt-8 shadow-xl">
               <img src="/cadeiras.png" alt="Interior do Ateliê" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-2xl w-full aspect-square md:h-[250px] lg:h-[300px] overflow-hidden border-2 border-[#C7977D] shadow-[0_0_30px_rgba(199,151,125,0.3)]">
               <video autoPlay loop muted playsInline className="w-full h-full object-cover">
                  <source src="/espaco.mp4" type="video/mp4" />
               </video>
            </div>
            <div className="col-span-2 rounded-2xl w-full aspect-video md:h-[200px] lg:h-[250px] overflow-hidden border border-[#3a2522] shadow-xl">
               <img src="/mesa.png" alt="Detalhe do Ateliê" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="order-1 lg:order-2 text-center lg:text-left">
            <span className="glow-text text-xs md:text-sm font-bold uppercase tracking-widest mb-2 block">Onde a Mágica Acontece</span>
            <h2 className="font-serif text-3xl md:text-5xl text-white mb-4 md:mb-6">Seu momento de <span className="text-[#F8D1BE] italic">paz e luxo.</span></h2>
            <p className="text-gray-400 text-sm md:text-lg mb-8 leading-relaxed font-light px-4 lg:px-0">
              Muito mais do que fazer as unhas, oferecemos uma experiência de relaxamento completa. 
              Nosso ateliê foi projetado para ser o seu refúgio da rotina corrida, com atendimento pontual e exclusivo.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 md:mb-10 px-4 lg:px-0 text-left">
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

            <div className="glass-card p-5 md:p-6 rounded-2xl border border-[#3a2522] mx-4 lg:mx-0 text-left">
              <h3 className="text-white font-bold mb-2 flex items-center gap-2 text-sm md:text-base"><MapPin className="text-[#C7977D]" size={18}/> Madalena Ateliê de Beleza</h3>
              <p className="text-gray-400 text-xs md:text-sm mb-4">Rua Fritz Hasse, 38 - Centro<br/>Jaraguá do Sul - SC, 89251-180</p>
              <div className="h-40 md:h-48 rounded-xl overflow-hidden border border-[#3a2522]">
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

      {/* SEÇÃO: FAQ */}
      <section className="py-20 px-4 sm:px-6 max-w-3xl mx-auto relative z-10 border-t border-[#3a2522]">
        <div className="text-center mb-10">
          <span className="glow-text text-xs md:text-sm font-bold uppercase tracking-widest">FAQ</span>
          <h2 className="font-serif text-3xl md:text-4xl text-white mt-2">Dúvidas Frequentes</h2>
        </div>
        <div className="space-y-3 md:space-y-4">
          {[
            { q: "Quanto tempo demora a aplicação da fibra?", a: "O procedimento leva em média de 2h a 2h30. Esse tempo é necessário para a preparação minuciosa e o acabamento impecável." },
            { q: "Quanto tempo demora o Banho de gel e Esmaltação?", a: "A esmaltação leva de 1h a 1h30. O banho de gel em média de 1h30 a 2h15, dependendo da necessidade da unha natural." },
            { q: "Quais os tipos de alongamento?", a: "Trabalhamos com técnica em molde F1 e Fibra de Vidro." },
            { q: "Quanto tempo dura a esmaltação em gel?", a: "De 15 a 20 dias, dependendo do cuidado prestado. Para o Banho de gel, de 21 a 25 dias." },
            { q: "Quais as formas de pagamento aceitas?", a: "Aceitamos pagamentos via PIX, cartão de crédito, débito e dinheiro." },
          ].map((faq, index) => (
            <div key={index} className="glass-card border border-[#3a2522] rounded-xl md:rounded-2xl overflow-hidden transition-all">
              <button onClick={() => setFaqAberto(faqAberto === index ? null : index)} className="w-full text-left p-4 md:p-6 flex justify-between items-center text-white font-serif text-base md:text-lg hover:text-[#F8D1BE] transition-colors">
                {faq.q}
                <ChevronDown className={`transition-transform duration-300 shrink-0 ml-4 ${faqAberto === index ? 'rotate-180 text-[#C7977D]' : 'text-gray-500'}`} />
              </button>
              <div className={`px-4 md:px-6 overflow-hidden transition-all duration-300 ${faqAberto === index ? 'max-h-40 pb-4 md:pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                <p className="text-gray-400 text-sm md:text-base leading-relaxed font-light">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="py-20 px-4 sm:px-6 relative z-10 border-t border-[#3a2522] bg-gradient-to-b from-[#120308] to-[#0a0204]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-4xl md:text-6xl text-white mb-4 md:mb-6">Tá esperando o quê?</h2>
          <p className="text-base md:text-xl text-[#E8D3C8] mb-8 md:mb-10 font-light px-4">Suas unhas merecem esse nível de luxo e durabilidade. As vagas da semana são limitadas, então não deixe para depois o autocuidado que você precisa hoje.</p>
          <button onClick={() => iniciarAgendamento()} className="bg-gradient-to-r from-[#DCAE96] to-[#C7977D] text-[#120308] px-8 py-4 md:px-12 md:py-5 rounded-full font-bold text-base md:text-xl flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-[0_0_40px_rgba(220,174,150,0.4)] mx-auto animate-pulse" style={{ animationDuration: '3s' }}>
            <CalendarDays size={20} className="md:w-6 md:h-6" /> Garantir Meu Horário
          </button>
        </div>
      </section>

      {/* WHATSAPP BUBBLE */}
      {!bubbleFechado && (
        <div className="fixed bottom-6 right-4 md:right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
          {showWaBubble && (
            <div className="bg-[#1a0c0f] border border-[#DCAE96]/20 p-5 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-70 animate-in slide-in-from-bottom-8 duration-700 relative pointer-events-auto">
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
            {showWaBubble && <span className="absolute top-0 right-0 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-[#120308]"></span></span>}
          </a>
        </div>
      )}
      
      {bubbleFechado && (
        <div className="fixed bottom-6 right-4 md:right-6 z-50">
          <a href="https://wa.me/5547996987519" target="_blank" className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,211,102,0.4)] hover:scale-110 transition-all cursor-pointer">
             <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.88-.653-1.474-1.46-1.647-1.757-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
          </a>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-[#050102] py-8 px-6 border-t border-[#3a2522] text-center md:text-left relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div><span className="font-serif text-lg md:text-xl text-[#F8D1BE]">Débora Nails</span><p className="text-gray-500 text-[10px] md:text-xs mt-1">Luxo e cuidado em cada detalhe.</p></div>
          <div className="text-gray-500 text-[10px] md:text-xs md:text-center"><p>© 2026 Débora Nails.</p><p>Todos os direitos reservados.</p></div>
        </div>
      </footer>

      {/* MODAL 1: DETALHES DO SERVIÇO */}
      {servicoDetalhe && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md px-4 py-6">
          <div className="bg-[#120308] border border-[#3a2522] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 max-h-full">
            <div className="relative h-48 md:h-64 bg-[#2D0A12] shrink-0">
              <button onClick={() => setServicoDetalhe(null)} className="absolute top-4 right-4 z-20 bg-black/50 text-white rounded-full p-2 hover:bg-black transition-colors"><X size={16} className="md:w-5 md:h-5"/></button>
              {servicoDetalhe.imagens && servicoDetalhe.imagens.length > 0 ? (
                <img src={servicoDetalhe.imagens[0]} alt={servicoDetalhe.nome} className="w-full h-full object-cover" />
              ) : <div className="flex items-center justify-center h-full"><Sparkles size={40} className="text-[#C7977D]" /></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-[#120308] to-transparent"></div>
            </div>
            <div className="p-5 md:p-6 -mt-8 relative z-20 overflow-y-auto hide-scroll flex-1">
              <h2 className="font-serif text-xl md:text-2xl text-white mb-3">{servicoDetalhe.nome}</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-[#180A0D] text-[#E8D3C8] border border-[#3a2522] px-2.5 py-1 rounded-full text-[9px] md:text-[10px] uppercase font-bold tracking-wider"><Clock size={10} className="inline mr-1"/> {servicoDetalhe.duracao}</span>
                {servicoDetalhe.taxa_sinal > 0 && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[9px] md:text-[10px] uppercase font-bold tracking-wider">Sinal {servicoDetalhe.taxa_sinal}%</span>}
              </div>
              <p className="text-gray-400 text-xs md:text-sm mb-6 leading-relaxed font-light">{servicoDetalhe.descricao}</p>
              
              <div className="flex justify-between items-center border-t border-[#3a2522] pt-4 mt-auto">
                <div>
                  <p className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Valor Total</p>
                  <p className="text-lg md:text-xl font-bold text-[#F8D1BE]">R$ {servicoDetalhe.preco.toFixed(2).replace('.', ',')}</p>
                </div>
                <button onClick={() => iniciarAgendamento(servicoDetalhe)} className="bg-[#DCAE96] text-[#120308] px-5 md:px-6 py-2 md:py-2.5 rounded-full font-bold shadow-lg hover:scale-105 transition-transform text-xs md:text-sm">
                  Agendar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CHECKOUT MERCADO PAGO E DADOS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md px-4 py-6">
          <div className="bg-[#0a0204] border border-[#3a2522] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-full">
            <div className="px-5 py-4 border-b border-[#3a2522] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                {step < 5 && <div className="bg-[#DCAE96] text-[#120308] w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] md:text-xs">{step}</div>}
                <h2 className="text-sm md:text-base font-serif text-white">
                  {step === 1 ? 'Escolha o Serviço' : step === 2 ? 'Data e Hora' : step === 3 ? 'Seus Dados' : step === 4 ? 'Pagamento' : 'Pronto!'}
                </h2>
              </div>
              {step < 5 && <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white bg-[#180A0D] p-1.5 rounded-full"><X size={16} className="md:w-[18px] md:h-[18px]" /></button>}
            </div>

            <div className="p-5 md:p-6 overflow-y-auto custom-scrollbar flex-1">
              {step === 1 && (
                <div className="space-y-3">
                  {servicos.map(s => (
                    <div key={s.id} onClick={() => {setServicoEscolhido(s); setStep(2);}} className="bg-[#120308] border border-[#3a2522] p-3 md:p-4 rounded-xl md:rounded-2xl cursor-pointer hover:border-[#DCAE96]/50 transition-colors flex justify-between items-center">
                      <div>
                        <h4 className="text-white font-serif text-sm md:text-base mb-1">{s.nome}</h4>
                        <p className="text-[9px] md:text-[10px] text-gray-400">{s.duracao} • Sinal {s.taxa_sinal}%</p>
                      </div>
                      <span className="text-[#F8D1BE] font-bold text-xs md:text-sm">R$ {s.preco.toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>
              )}
              {step === 2 && (
                <div className="space-y-5 md:space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div>
                    <label className="block text-[10px] md:text-xs text-[#E8D3C8] font-bold uppercase tracking-wider mb-2 md:mb-3">Dias Disponíveis</label>
                    <div className="flex gap-2 overflow-x-auto hide-scroll pb-2">
                      {proximosDias.map((data, idx) => (
                        <button key={idx} onClick={() => setDataEscolhida(data)} className={`shrink-0 w-14 md:w-16 py-2.5 md:py-3 rounded-xl flex flex-col items-center justify-center transition-all border ${dataEscolhida?.getDate() === data.getDate() ? 'bg-[#DCAE96] text-[#120308] border-transparent font-bold' : 'bg-[#120308] text-gray-400 border-[#3a2522]'}`}>
                          <span className="text-[8px] md:text-[9px] uppercase mb-1">{data.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                          <span className="text-base md:text-lg font-serif">{data.getDate()}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {dataEscolhida && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                      <label className="block text-[10px] md:text-xs text-[#E8D3C8] font-bold uppercase tracking-wider mb-2 md:mb-3">Horários Livres</label>
                      <div className="grid grid-cols-3 gap-2 md:gap-3">
                        {horariosLivres.map(hora => (
                          <button key={hora} onClick={() => setHoraEscolhida(hora)} className={`py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all border text-xs md:text-sm ${horaEscolhida === hora ? 'bg-[#DCAE96] text-[#120308] font-bold border-transparent' : 'bg-[#120308] border-[#3a2522] text-white'}`}>
                            {hora}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button disabled={!dataEscolhida || !horaEscolhida} onClick={() => setStep(3)} className="w-full bg-[#DCAE96] text-[#120308] py-3 md:py-4 rounded-full font-bold mt-2 disabled:opacity-50 text-xs md:text-sm">Continuar</button>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4 md:space-y-5 animate-in fade-in slide-in-from-right-4">
                  <div className="bg-[#120308] p-4 md:p-5 rounded-xl md:rounded-2xl border border-[#3a2522] mb-4 md:mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] md:text-[10px] text-[#C7977D] uppercase tracking-widest font-bold mb-1">Resumo do Horário</p>
                      <p className="text-white font-serif text-base md:text-lg mb-0.5 md:mb-1">{servicoEscolhido.nome}</p>
                      <p className="text-gray-400 text-[10px] md:text-xs">{dataEscolhida?.toLocaleDateString('pt-BR')} às {horaEscolhida}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-xs text-[#E8D3C8] mb-1 font-medium">Nome Completo</label>
                    <input type="text" value={clienteDados.nome} onChange={e => setClienteDados({...clienteDados, nome: e.target.value})} placeholder="Como gosta de ser chamada?" className="w-full bg-[#120308] border border-[#3a2522] rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-white focus:outline-none focus:border-[#F8D1BE]"/>
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-xs text-[#E8D3C8] mb-1 font-medium">Seu WhatsApp</label>
                    <input type="tel" value={clienteDados.telefone} onChange={e => setClienteDados({...clienteDados, telefone: e.target.value})} placeholder="(47) 99999-9999" className="w-full bg-[#120308] border border-[#3a2522] rounded-lg md:rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-white focus:outline-none focus:border-[#F8D1BE]"/>
                  </div>
                  <button disabled={!clienteDados.nome || !clienteDados.telefone} onClick={() => { if (calcularSinal() > 0) setStep(4); else gerarPagamentoMercadoPago(); }} className="w-full bg-[#DCAE96] text-[#120308] py-3 md:py-4 rounded-full font-bold mt-2 disabled:opacity-50 text-xs md:text-sm">
                    {calcularSinal() > 0 ? 'Ir para Pagamento da Reserva' : 'Confirmar Agendamento'}
                  </button>
                </div>
              )}
              {step === 4 && (
                <div className="animate-in fade-in slide-in-from-right-4">
                  <div className="bg-red-500/10 border border-red-500/20 p-3 md:p-4 rounded-xl md:rounded-2xl flex items-center justify-between mb-4 md:mb-6">
                    <div className="flex items-center gap-2 md:gap-3">
                      <AlertCircle className="text-red-400" size={18} />
                      <div>
                        <p className="text-white font-bold text-[10px] md:text-xs">Vaga reservada temporariamente!</p>
                        <p className="text-red-300 text-[9px] md:text-[10px] mt-0.5">Pague o sinal para confirmar.</p>
                      </div>
                    </div>
                    <div className="text-base md:text-lg font-mono text-red-400 font-bold bg-[#120308] px-2 md:px-3 py-1 rounded-lg border border-red-500/30">
                      {formatarTempo(tempoRestante)}
                    </div>
                  </div>

                  <div className="mb-4 md:mb-6 pb-4 md:pb-6 border-b border-[#3a2522] space-y-1.5 md:space-y-2">
                    <div className="flex justify-between text-[10px] md:text-xs text-gray-400"><span>Valor Total do Serviço</span><span>R$ {servicoEscolhido.preco.toFixed(2).replace('.', ',')}</span></div>
                    <div className="flex justify-between text-xs md:text-sm text-[#F8D1BE] font-bold"><span>Sinal Exigido ({servicoEscolhido.taxa_sinal}%)</span><span>R$ {calcularSinal().toFixed(2).replace('.', ',')}</span></div>
                  </div>

                  <label className="block text-[10px] md:text-xs text-[#E8D3C8] mb-2 md:mb-3 font-bold uppercase tracking-wider">Forma de Pagamento</label>
                  <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4 md:mb-6">
                    <label className={`relative border p-3 md:p-4 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-1.5 md:gap-2 transition-all ${metodoPagamento === 'pix' ? 'border-[#00B1EA] bg-[#00B1EA]/10' : 'bg-[#120308] border-[#3a2522]'}`}>
                      <input type="radio" name="pagamento" value="pix" checked={metodoPagamento === 'pix'} onChange={() => setMetodoPagamento('pix')} className="sr-only" />
                      <QrCode size={20} className={metodoPagamento === 'pix' ? 'text-[#00B1EA]' : 'text-gray-400'} />
                      <span className={`font-bold text-xs md:text-sm ${metodoPagamento === 'pix' ? 'text-[#00B1EA]' : 'text-white'}`}>PIX</span>
                    </label>
                    <label className={`relative border p-3 md:p-4 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-1.5 md:gap-2 transition-all ${metodoPagamento === 'cartao' ? 'border-[#00B1EA] bg-[#00B1EA]/10' : 'bg-[#120308] border-[#3a2522]'}`}>
                      <input type="radio" name="pagamento" value="cartao" checked={metodoPagamento === 'cartao'} onChange={() => setMetodoPagamento('cartao')} className="sr-only" />
                      <CreditCard size={20} className={metodoPagamento === 'cartao' ? 'text-[#00B1EA]' : 'text-gray-400'} />
                      <span className={`font-bold text-xs md:text-sm ${metodoPagamento === 'cartao' ? 'text-[#00B1EA]' : 'text-white'}`}>Cartão</span>
                      <span className="text-[8px] md:text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded absolute top-1.5 right-1.5 md:top-2 md:right-2">+5% taxa</span>
                    </label>
                  </div>

                  <div className="bg-[#120308] p-4 md:p-5 rounded-xl md:rounded-2xl border border-[#3a2522] flex justify-between items-center mb-4 md:mb-6">
                    <div>
                      <p className="text-gray-400 text-[10px] md:text-xs mb-0.5 md:mb-1">Total a pagar agora</p>
                      <p className="text-xl md:text-2xl font-bold text-white">R$ {valorTotalSinal.toFixed(2).replace('.', ',')}</p>
                    </div>
                    {metodoPagamento === 'cartao' && <div className="text-right"><p className="text-[9px] md:text-[10px] text-red-400 font-medium">R$ {calcularTaxaCartao(calcularSinal()).toFixed(2).replace('.', ',')} de taxa inclusa</p></div>}
                  </div>

                  <button onClick={gerarPagamentoMercadoPago} disabled={isProcessando} className="w-full bg-[#00B1EA] text-white py-3 md:py-4 rounded-full font-bold flex justify-center items-center gap-2 hover:bg-[#0098C7] transition-all text-xs md:text-sm">
                    {isProcessando ? <Loader2 className="animate-spin" size={18} /> : <><ShieldCheck size={16}/> Pagar Seguramente</>}
                  </button>
                  <p className="text-center text-[9px] md:text-[10px] text-gray-500 mt-2 md:mt-3 flex items-center justify-center gap-1 font-medium"><ShieldCheck size={10}/> Processado pelo Mercado Pago</p>
                </div>
              )}
              {step === 5 && (
                <div className="py-6 md:py-8 flex flex-col items-center text-center animate-in zoom-in-95">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 md:mb-6 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <CheckCircle2 size={24} className="text-emerald-400 md:w-8 md:h-8" />
                  </div>
                  <h2 className="font-serif text-xl md:text-2xl text-white mb-1 md:mb-2">Confirmado!</h2>
                  <p className="text-gray-400 mb-6 md:mb-8 text-xs md:text-sm">Te enviamos os detalhes no WhatsApp.</p>
                  <div className="bg-[#120308] border border-[#3a2522] p-4 md:p-5 rounded-xl md:rounded-2xl w-full text-left mb-6 md:mb-8">
                    <p className="text-white font-bold mb-1 text-xs md:text-sm">{servicoEscolhido.nome}</p>
                    <p className="text-[#C7977D] text-[10px] md:text-xs mb-3 md:mb-4 font-medium">{dataEscolhida?.toLocaleDateString('pt-BR')} às {horaEscolhida}</p>
                    <div className="bg-[#0a0204] p-2 md:p-3 rounded-lg border border-[#3a2522]">
                      <p className="text-[10px] md:text-xs text-gray-400">Restará pagar <strong className="text-white">R$ {(servicoEscolhido.preco - calcularSinal()).toFixed(2).replace('.', ',')}</strong> no dia do atendimento.</p>
                    </div>
                  </div>
                  <button onClick={() => {setIsModalOpen(false); setStep(1);}} className="bg-[#DCAE96] text-[#120308] px-6 md:px-8 py-3 md:py-3.5 rounded-full font-bold w-full text-xs md:text-sm shadow-lg hover:scale-105 transition-transform">Concluir</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ESTILOS CSS INJETADOS */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,700;1,400&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0a0204; }
        .font-serif { font-family: 'Playfair Display', serif; }
        
        .ambient-grid {
            position: fixed; inset: 0; z-index: -1;
            background-image: linear-gradient(rgba(199, 151, 125, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(199, 151, 125, 0.08) 1px, transparent 1px);
            background-size: 35px 35px;
        }

        .glass-card { background: rgba(18, 3, 8, 0.6); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
        .neon-border { border: 1px solid rgba(199, 151, 125, 0.5); box-shadow: 0 0 20px rgba(199, 151, 125, 0.1); }
        .neon-hover:hover { border-color: rgba(220, 174, 150, 0.6); box-shadow: 0 0 25px rgba(220, 174, 150, 0.2); transform: translateY(-3px); }
        .glow-text { background: linear-gradient(90deg, #F8D1BE, #C7977D); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 8px rgba(248, 209, 190, 0.4)); }

        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(199, 151, 125, 0.3); border-radius: 10px; }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}