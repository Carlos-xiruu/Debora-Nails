'use client'

import { useState } from 'react';
import { Mail, Lock, Loader2, ArrowRight, Sparkles, User, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function LoginPage() {
  const [modo, setModo] = useState<'login' | 'cadastro' | 'recuperar'>('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' }); // tipo: 'erro' ou 'sucesso'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMensagem({ texto: '', tipo: '' });

    try {
      if (modo === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw new Error('E-mail ou senha incorretos.');
        
        // Verifica se é a Débora (Admin) ou Cliente para redirecionar
        window.location.href = data.user?.email === 'debora199917silva@gmail.com' ? '/dashboard' : '/';
      } 
      
      else if (modo === 'cadastro') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { nome_completo: nome } }
        });
        if (error) throw error;
        setMensagem({ texto: 'Conta criada! Verifique seu e-mail para confirmar.', tipo: 'sucesso' });
        setModo('login');
      } 
      
      else if (modo === 'recuperar') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login?recuperar=true`,
        });
        if (error) throw error;
        setMensagem({ texto: 'Instruções de recuperação enviadas para o seu e-mail.', tipo: 'sucesso' });
      }

    } catch (error: any) {
      setMensagem({ texto: error.message || 'Ocorreu um erro inesperado.', tipo: 'erro' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0204] flex items-center justify-center relative overflow-hidden px-4 selection:bg-[#C7977D] selection:text-[#120308]">
      
      {/* GRID E LUZES DE FUNDO */}
      <div className="fixed inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(199, 151, 125, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(199, 151, 125, 0.15) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#DCAE96]/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#DCAE96]/5 rounded-full blur-[150px] pointer-events-none"></div>

      <Link href="/" className="absolute top-6 left-6 md:top-10 md:left-10 text-gray-400 hover:text-white transition-colors text-sm font-medium z-50">
        &larr; Voltar ao Início
      </Link>

      <div className="w-full max-w-md bg-[#180A0D]/80 backdrop-blur-xl border border-[#DCAE96]/20 p-8 md:p-10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 animate-in zoom-in-95 duration-700">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#120308] border border-[#DCAE96]/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(199,151,125,0.15)]">
            <ShieldCheck size={28} className="text-[#C7977D]" />
          </div>
          <h2 className="font-serif text-3xl text-white mb-2">
            {modo === 'login' ? 'Bem-vinda de volta' : modo === 'cadastro' ? 'Criar sua Conta' : 'Recuperar Senha'}
          </h2>
          <p className="text-gray-400 text-sm font-light">
            {modo === 'login' ? 'Acesse seu espaço exclusivo.' : modo === 'cadastro' ? 'Seu perfil de beleza e agendamentos.' : 'Enviaremos um link seguro para você.'}
          </p>
        </div>

        {mensagem.texto && (
          <div className={`mb-6 p-4 rounded-2xl text-sm font-medium border ${mensagem.tipo === 'erro' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
            {mensagem.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {modo === 'cadastro' && (
            <div>
              <label className="block text-xs text-[#E8D3C8] mb-1.5 font-bold uppercase tracking-wider">Nome Completo</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C7977D]/60" />
                <input type="text" required value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-[#0a0204] border border-[#3a2522] rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-[#F8D1BE] transition-colors" placeholder="Como gosta de ser chamada?" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-[#E8D3C8] mb-1.5 font-bold uppercase tracking-wider">E-mail</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C7977D]/60" />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#0a0204] border border-[#3a2522] rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-[#F8D1BE] transition-colors" placeholder="seu@email.com" />
            </div>
          </div>

          {modo !== 'recuperar' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs text-[#E8D3C8] font-bold uppercase tracking-wider">Senha</label>
                {modo === 'login' && (
                  <button type="button" onClick={() => setModo('recuperar')} className="text-xs text-[#C7977D] hover:text-[#F8D1BE] transition-colors">Esqueceu a senha?</button>
                )}
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C7977D]/60" />
                <input type="password" required value={senha} onChange={e => setSenha(e.target.value)} className="w-full bg-[#0a0204] border border-[#3a2522] rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-[#F8D1BE] transition-colors" placeholder="••••••••" />
              </div>
            </div>
          )}

          <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-[#DCAE96] to-[#C7977D] text-[#120308] py-4 rounded-full font-bold mt-4 shadow-[0_0_20px_rgba(220,174,150,0.3)] hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
              <>{modo === 'login' ? 'Entrar' : modo === 'cadastro' ? 'Criar Conta' : 'Enviar Link de Recuperação'} <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-[#3a2522] pt-6">
          {modo === 'login' ? (
            <p className="text-sm text-gray-400">Primeira vez aqui? <button onClick={() => setModo('cadastro')} className="text-[#F8D1BE] font-bold hover:underline">Criar uma conta</button></p>
          ) : (
            <p className="text-sm text-gray-400">Já tem uma conta? <button onClick={() => setModo('login')} className="text-[#F8D1BE] font-bold hover:underline">Fazer login</button></p>
          )}
        </div>

      </div>
    </div>
  );
}