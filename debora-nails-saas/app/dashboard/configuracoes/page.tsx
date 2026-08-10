'use client'

import { useState } from 'react';
import { Settings, User, Store, CreditCard, Save, Loader2, CheckCircle2, Link as LinkIcon, Percent } from 'lucide-react';

export default function ConfiguracoesPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [salvoComSucesso, setSalvoComSucesso] = useState(false);

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    setTimeout(() => {
      setIsSaving(false);
      setSalvoComSucesso(true);
      setTimeout(() => setSalvoComSucesso(false), 3000);
    }, 1200);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl">
      
      {/* CABEÇALHO */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="font-serif text-3xl text-white mb-2 flex items-center gap-3">
            <Settings className="text-[#C7977D]" size={28} />
            Configurações
          </h1>
          <p className="text-[#E8D3C8]">Gerencie as informações do seu perfil, ateliê e pagamentos.</p>
        </div>
        
        {salvoComSucesso && (
          <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 px-4 py-2 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-right-4 w-full sm:w-auto justify-center sm:justify-start shrink-0">
            <CheckCircle2 size={18} /> Salvo com sucesso!
          </div>
        )}
      </div>

      <form onSubmit={handleSalvar} className="space-y-8">
        
        {/* BLOCO 1: DADOS PESSOAIS */}
        <div className="bg-[#120308]/60 backdrop-blur-md border border-[#DCAE96]/20 p-6 md:p-8 rounded-2xl shadow-xl">
          <h2 className="text-xl font-serif text-[#F8D1BE] mb-6 flex items-center gap-2 border-b border-[#DCAE96]/10 pb-4">
            <User size={20} /> Perfil Profissional
          </h2>
          
          <div className="flex flex-col md:flex-row gap-8">
            <div className="shrink-0 flex flex-col items-center gap-4">
              <img src="/debora.jpg" alt="Foto de Perfil" className="w-32 h-32 rounded-full object-cover border-4 border-[#2D0A12] shadow-[0_0_15px_rgba(199,151,125,0.3)]" />
              <button type="button" className="text-[#C7977D] text-sm hover:text-white transition-colors">Alterar Foto</button>
            </div>
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm text-[#E8D3C8] mb-1">Nome de Exibição</label>
                <input type="text" defaultValue="Débora Silva" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE]"/>
              </div>
              <div>
                <label className="block text-sm text-[#E8D3C8] mb-1">E-mail de Login</label>
                <input type="email" defaultValue="contato@deboranails.com" disabled className="w-full bg-[#120308]/50 border border-[#DCAE96]/10 rounded-xl px-4 py-3 text-base sm:text-sm text-gray-500 cursor-not-allowed"/>
                <p className="text-xs text-gray-500 mt-1">O e-mail de login não pode ser alterado.</p>
              </div>
              <div>
                <label className="block text-sm text-[#E8D3C8] mb-1">Telefone / WhatsApp</label>
                <input type="tel" defaultValue="(47) 99999-9999" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE]"/>
              </div>
            </div>
          </div>
        </div>

        {/* BLOCO 2: DADOS DO ATELIÊ & REDES */}
        <div className="bg-[#120308]/60 backdrop-blur-md border border-[#DCAE96]/20 p-6 md:p-8 rounded-2xl shadow-xl">
          <h2 className="text-xl font-serif text-[#F8D1BE] mb-6 flex items-center gap-2 border-b border-[#DCAE96]/10 pb-4">
            <Store size={20} /> Informações do Ateliê
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm text-[#E8D3C8] mb-1">Endereço Completo</label>
              <input type="text" defaultValue="Rua Exemplo, 123 - Centro, Jaraguá do Sul - SC" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE]"/>
            </div>
            
            <div>
              <label className="block text-sm text-[#E8D3C8] mb-1">Instagram (@)</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-3.5 text-gray-500" size={18} />
                <input type="text" defaultValue="deboranails.sc" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl pl-10 pr-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE]"/>
              </div>
            </div>

            <div>
              <label className="block text-sm text-[#E8D3C8] mb-1">Texto de Boas-vindas (Monitor VIP)</label>
              <input type="text" defaultValue="Sua presença iluminou o nosso ateliê hoje." className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE]"/>
            </div>
          </div>
        </div>

        {/* BLOCO 3: FINANCEIRO & REPASSES */}
        <div className="bg-[#120308]/60 backdrop-blur-md border border-[#DCAE96]/20 p-6 md:p-8 rounded-2xl shadow-xl">
          <h2 className="text-xl font-serif text-[#F8D1BE] mb-6 flex items-center gap-2 border-b border-[#DCAE96]/10 pb-4">
            <CreditCard size={20} /> Pagamentos, PIX e Repasses
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="col-span-1 md:col-span-3 bg-[#2D0A12]/30 p-4 rounded-xl border border-dashed border-[#DCAE96]/30 mb-2">
              <label className="block text-sm text-[#E8D3C8] mb-2 font-medium flex items-center gap-2">
                <Percent size={16} className="text-[#C7977D]" /> Porcentagem do Ateliê (Repasse)
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <input type="number" defaultValue="35" min="0" max="100" className="w-full sm:w-32 bg-[#120308] border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F8D1BE] text-center text-xl font-bold shrink-0"/>
                <span className="text-sm text-gray-400 max-w-sm">
                  Esta porcentagem é descontada dos seus atendimentos e exibida no painel como "Repasses Pendentes".
                </span>
              </div>
            </div>

            <div className="col-span-1 md:col-span-1">
              <label className="block text-sm text-[#E8D3C8] mb-1">Chave PIX (Para Sinais)</label>
              <input type="text" defaultValue="47999999999" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE]"/>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm text-[#E8D3C8] mb-1">Nome do Titular do PIX</label>
              <input type="text" defaultValue="Débora da Silva" className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-[#F8D1BE]"/>
            </div>

            <div className="col-span-1 md:col-span-3 mt-2">
               <label className="flex items-start gap-3 cursor-pointer group p-4 border border-[#DCAE96]/20 rounded-xl bg-[#2D0A12]/30 hover:bg-[#2D0A12]/60 transition-colors">
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#C7977D] bg-[#120308] border-[#DCAE96]/30 rounded cursor-pointer mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="block text-sm text-white font-medium mb-0.5">Exigir comprovante de sinal na Landing Page</span>
                  <span className="block text-xs text-gray-400 break-words">Quando a cliente agendar um serviço que exige sinal, ela deverá enviar a foto do comprovante.</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* BOTÃO SALVAR */}
        <div className="flex justify-end pt-4">
          <button type="submit" disabled={isSaving} className="w-full sm:w-auto bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-10 py-4 rounded-xl font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(248,209,190,0.2)]">
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20}/> Salvar Alterações</>}
          </button>
        </div>
        
      </form>
    </div>
  );
}