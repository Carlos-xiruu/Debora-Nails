'use client'

import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, QrCode, AlignLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Ajustado o nível da rota de importação

export default function ConfiguracoesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // DADOS DO BANCO
  const [chavePix, setChavePix] = useState('');
  const [tipoPix, setTipoPix] = useState('cpf');
  const [msgConfirmacao, setMsgConfirmacao] = useState('Oii! Passando para confirmar seu agendamento...');

  useEffect(() => {
    fetchConfiguracoes();
  }, []);

  const fetchConfiguracoes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('configuracoes').select('*').eq('id', 1).single();
    
    if (data) {
      setChavePix(data.chave_pix || '');
      setTipoPix(data.tipo_chave_pix || 'cpf');
      // Puxa a mensagem do banco se ela existir
      if (data.mensagem_confirmacao) {
        setMsgConfirmacao(data.mensagem_confirmacao);
      }
    } else if (error) {
      console.error("Erro banco config:", error.message);
    }
    setIsLoading(false);
  };

  const handleSalvarConfiguracoes = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // PERSISTÊNCIA REAL COM TODOS OS DADOS
    const { error } = await supabase.from('configuracoes').upsert({
      id: 1,
      chave_pix: chavePix,
      tipo_chave_pix: tipoPix,
      mensagem_confirmacao: msgConfirmacao // Agora a mensagem é salva de verdade!
    });

    if (error) {
      alert(`ERRO REAL: Falha ao salvar no banco. Detalhe: ${error.message}`);
    } else {
      alert("Configurações salvas e aplicadas em tempo real com sucesso!");
    }
    
    setIsSaving(false);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-white mb-2 flex items-center gap-3"><Settings className="text-[#C7977D]" size={28} /> Configurações Gerais</h1>
        <p className="text-[#E8D3C8]">Ajuste dados financeiros e textos do sistema.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 text-[#C7977D]"><Loader2 className="animate-spin" size={40} /></div>
      ) : (
        <form onSubmit={handleSalvarConfiguracoes} className="space-y-6">
          
          <div className="bg-[#120308]/80 border border-[#DCAE96]/20 p-6 rounded-3xl shadow-lg">
            <h2 className="text-[#F8D1BE] font-serif text-xl flex items-center gap-2 mb-4 border-b border-[#DCAE96]/10 pb-3"><QrCode size={20}/> Recebimento PIX (Manual)</h2>
            <p className="text-xs text-gray-400 mb-4">Esta chave pode ser exibida para a cliente caso o Mercado Pago (Automático) falhe.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-[#E8D3C8] mb-1 font-bold uppercase tracking-wider text-[10px]">Tipo de Chave</label>
                <select value={tipoPix} onChange={(e) => setTipoPix(e.target.value)} className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F8D1BE] appearance-none transition-colors">
                  <option value="cpf">CPF / CNPJ</option>
                  <option value="celular">Celular</option>
                  <option value="email">E-mail</option>
                  <option value="aleatoria">Chave Aleatória</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-[#E8D3C8] mb-1 font-bold uppercase tracking-wider text-[10px]">Sua Chave PIX Oficial</label>
                <input type="text" value={chavePix} onChange={(e) => setChavePix(e.target.value)} placeholder="Cole sua chave aqui..." className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F8D1BE] transition-colors"/>
              </div>
            </div>
          </div>

          <div className="bg-[#120308]/80 border border-[#DCAE96]/20 p-6 rounded-3xl shadow-lg">
            <h2 className="text-[#F8D1BE] font-serif text-xl flex items-center gap-2 mb-4 border-b border-[#DCAE96]/10 pb-3"><AlignLeft size={20}/> Automação de Mensagens</h2>
            <div>
              <label className="block text-sm text-[#E8D3C8] mb-1 font-bold uppercase tracking-wider text-[10px]">Texto de Confirmação (WhatsApp)</label>
              <textarea value={msgConfirmacao} onChange={(e) => setMsgConfirmacao(e.target.value)} rows={4} className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F8D1BE] resize-none transition-colors"></textarea>
              <p className="text-[10px] text-gray-500 mt-2">O sistema vai colocar o Nome do Cliente, Data e Hora automaticamente no final do texto.</p>
            </div>
          </div>

          <button type="submit" disabled={isSaving} className="w-full md:w-auto bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-10 py-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50 shadow-[0_0_20px_rgba(220,174,150,0.2)]">
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20}/> Salvar Configurações</>}
          </button>
        </form>
      )}
    </div>
  );
}