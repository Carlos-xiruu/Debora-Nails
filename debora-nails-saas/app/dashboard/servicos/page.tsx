'use client'

import { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, DollarSign, X, Sparkles, Loader2, Image as ImageIcon, CheckCircle2, Edit2, ShieldAlert, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Caminho padronizado

const imagensDisponiveis = [
  '/01.jpg', '/02.jpg', '/03.jpg', 
  '/make01.jpeg', '/make02.jpeg', '/make03.jpeg', '/make04.jpeg', 
  '/vermelha.jpeg'
];

export default function ServicosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [servicos, setServicos] = useState<any[]>([]);
  const [imagensSelecionadas, setImagensSelecionadas] = useState<string[]>([]);
  const [servicoEditando, setServicoEditando] = useState<any>(null);

  useEffect(() => {
    fetchServicos();
  }, []);

  const fetchServicos = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('servicos').select('*').order('created_at', { ascending: false });
    if (!error && data) setServicos(data);
    setIsLoading(false);
  };

  const abrirModal = (servico: any = null) => {
    setServicoEditando(servico);
    setImagensSelecionadas(servico ? (servico.imagens || []) : []);
    setIsModalOpen(true);
  };

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const novasImagens: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('servicos').upload(filePath, file);

      if (uploadError) {
        console.error("Erro no upload:", uploadError.message);
        alert(`Erro ao enviar a imagem ${file.name}. Verifique se o bucket 'servicos' é público no Supabase.`);
      } else {
        const { data } = supabase.storage.from('servicos').getPublicUrl(filePath);
        if (data?.publicUrl) {
          novasImagens.push(data.publicUrl);
        }
      }
    }

    setImagensSelecionadas(prev => [...prev, ...novasImagens]);
    setIsUploading(false);
  };

  const handleSalvarServico = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.target as HTMLFormElement);
    
    // Tratamento de vírgula brasileira para cálculo seguro
    const precoRaw = formData.get('preco') as string;
    const precoCalc = parseFloat(precoRaw.replace(',', '.'));
    
    const taxaSinal = parseInt(formData.get('taxa_sinal') as string);
    const valorSinal = precoCalc * (taxaSinal / 100);
    const sinalCalc = taxaSinal > 0 ? `${taxaSinal}% (R$ ${valorSinal.toFixed(2).replace('.', ',')})` : 'Não exigido';

    const dadosServico = {
      nome: formData.get('nome') as string,
      descricao: formData.get('desc') as string,
      duracao: formData.get('duracao') as string,
      preco: precoCalc,
      taxa_sinal: taxaSinal,
      sinal: sinalCalc,
      imagens: imagensSelecionadas.length > 0 ? imagensSelecionadas : ['/01.jpg']
    };

    if (servicoEditando) {
      const { data, error } = await supabase.from('servicos').update(dadosServico).eq('id', servicoEditando.id).select();
      if (!error && data) {
        setServicos(servicos.map(s => s.id === servicoEditando.id ? data[0] : s));
        setIsModalOpen(false);
      }
    } else {
      const novoServicoCompleto = { ...dadosServico, ativo: true };
      const { data, error } = await supabase.from('servicos').insert([novoServicoCompleto]).select();
      if (!error && data) {
        setServicos([data[0], ...servicos]);
        setIsModalOpen(false);
      }
    }
    setIsSaving(false);
  };

  const toggleAtivo = async (id: string, ativoAtual: boolean) => {
    setServicos(servicos.map(s => s.id === id ? { ...s, ativo: !ativoAtual } : s));
    await supabase.from('servicos').update({ ativo: !ativoAtual }).eq('id', id);
  };

  const deletarServico = async (id: string) => {
    if (!window.confirm('Excluir este serviço? Esta ação não pode ser desfeita.')) return;
    
    const { error } = await supabase.from('servicos').delete().eq('id', id);
    
    if (error) {
      // Intercepta erro de Foreign Key (Código 23503 do PostgreSQL)
      if (error.code === '23503') {
        alert("⚠️ ATENÇÃO: Você não pode excluir este serviço porque ele já está vinculado a agendamentos ou ao histórico financeiro do sistema. \n\nEm vez de excluí-lo, recomendamos usar o botão 'Desativar' para que ele não apareça mais para os clientes.");
      } else {
        alert(`Erro ao excluir: ${error.message}`);
      }
    } else {
      setServicos(servicos.filter(s => s.id !== id));
    }
  };

  const toggleImagem = (img: string) => {
    setImagensSelecionadas(prev => prev.includes(img) ? prev.filter(i => i !== img) : [...prev, img]);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl text-white mb-2 flex items-center gap-3"><Sparkles className="text-[#C7977D]" size={28} /> Meus Serviços</h1>
          <p className="text-[#E8D3C8]">Gerencie o seu catálogo e adicione fotos direto da sua galeria.</p>
        </div>
        <button onClick={() => abrirModal(null)} className="w-full md:w-auto bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-[0_0_15px_rgba(248,209,190,0.3)]">
          <Plus size={20} /> Novo Serviço
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 text-[#C7977D]"><Loader2 className="animate-spin" size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {servicos.length === 0 ? (
             <div className="col-span-full py-16 text-center text-gray-400 border border-dashed border-[#DCAE96]/20 rounded-xl bg-[#2D0A12]/20">
               Nenhum serviço cadastrado ainda.
             </div>
          ) : (
            servicos.map(servico => {
              const fotos = servico.imagens || [];
              return (
                <div key={servico.id} className={`backdrop-blur-md border rounded-2xl shadow-lg overflow-hidden transition-all duration-300 group flex flex-col ${servico.ativo ? 'bg-[#120308]/80 border-[#DCAE96]/30 hover:border-[#DCAE96]/50' : 'bg-[#120308]/40 border-gray-800 opacity-60'}`}>
                  <div className="h-48 relative overflow-hidden bg-[#2D0A12] shrink-0">
                    {fotos.length > 0 ? (
                      <img src={fotos[0]} alt={servico.nome} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : <div className="flex items-center justify-center h-full opacity-30"><Sparkles size={48} className="text-[#C7977D]" /></div>}
                    <div className="absolute top-4 right-4">
                      {servico.ativo ? <span className="bg-[#DCAE96]/90 text-[#120308] font-bold text-[10px] uppercase px-3 py-1 rounded-full shadow-lg">Ativo</span> : <span className="bg-gray-800 text-gray-400 text-[10px] uppercase px-3 py-1 rounded-full border border-gray-600">Inativo</span>}
                    </div>
                  </div>

                  <div className="p-6 relative z-10 -mt-6 flex-1 flex flex-col">
                    <h3 className={`text-2xl font-serif mb-2 ${servico.ativo ? 'text-white' : 'text-gray-400'}`}>{servico.nome}</h3>
                    <p className="text-[#E8D3C8] text-sm mb-4 line-clamp-2">{servico.descricao}</p>
                    
                    <div className="flex items-center gap-4 text-white font-medium mb-4 bg-[#2D0A12]/40 p-3 rounded-xl border border-[#DCAE96]/10 shrink-0">
                      <span className="flex items-center gap-2"><Clock size={16} className="text-[#C7977D]"/> {servico.duracao}</span>
                      <span className="text-gray-600">|</span>
                      <span className="flex items-center gap-2"><DollarSign size={16} className="text-[#C7977D]"/> R$ {parseFloat(servico.preco).toFixed(2).replace('.', ',')}</span>
                    </div>

                    <div className="inline-flex items-center gap-2 bg-[#F8D1BE]/10 border border-[#F8D1BE]/30 text-[#F8D1BE] text-xs px-3 py-1.5 rounded-full mb-5 self-start">
                      <ShieldAlert size={14} /> Sinal: {servico.taxa_sinal > 0 ? `${servico.taxa_sinal}%` : 'Não'}
                    </div>

                    <div className="flex items-center gap-2 pt-5 border-t border-[#DCAE96]/20 mt-auto">
                      <button onClick={() => toggleAtivo(servico.id, servico.ativo)} className="flex-1 bg-[#120308] border border-[#DCAE96]/30 text-[#E8D3C8] py-2.5 rounded-xl text-sm font-medium hover:bg-[#DCAE96]/10 transition-colors">{servico.ativo ? 'Desativar' : 'Ativar'}</button>
                      <button onClick={() => abrirModal(servico)} className="p-2.5 text-[#F8D1BE] bg-[#DCAE96]/10 border border-[#DCAE96]/20 rounded-xl hover:bg-[#DCAE96]/20 transition-colors"><Edit2 size={18} /></button>
                      <button onClick={() => deletarServico(servico.id)} className="p-2.5 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#120308] border border-[#DCAE96]/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(199,151,125,0.2)] animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="bg-[#2D0A12] px-6 md:px-8 py-5 flex justify-between items-center border-b border-[#DCAE96]/20 shrink-0">
              <h2 className="text-xl font-serif text-[#F8D1BE] flex items-center gap-2"><Sparkles size={20}/> {servicoEditando ? 'Editar Serviço' : 'Novo Serviço'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSalvarServico} className="flex flex-col overflow-hidden">
              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs uppercase tracking-wider font-bold text-[#E8D3C8] mb-1.5">Nome do Serviço *</label>
                    <input type="text" name="nome" defaultValue={servicoEditando?.nome} required className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F8D1BE] transition-colors"/>
                  </div>
                  
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs uppercase tracking-wider font-bold text-[#E8D3C8] mb-1.5">Descrição</label>
                    <textarea name="desc" rows={2} defaultValue={servicoEditando?.descricao} className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none transition-colors"></textarea>
                  </div>
                  
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-bold text-[#E8D3C8] mb-1.5">Duração Média *</label>
                    <input type="text" name="duracao" defaultValue={servicoEditando?.duracao || ''} placeholder="Ex: 40m, 1h, 1h 30m" required className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F8D1BE] transition-colors"/>
                  </div>
                  
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-bold text-[#E8D3C8] mb-1.5">Preço Total (R$) *</label>
                    <input type="number" step="0.01" min="0" name="preco" defaultValue={servicoEditando?.preco} required className="w-full bg-[#2D0A12]/50 border border-[#DCAE96]/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F8D1BE] transition-colors font-mono"/>
                  </div>
                  
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs uppercase tracking-wider font-bold text-[#E8D3C8] mb-2">Exigir pagamento antecipado (Sinal)</label>
                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                      {['0', '10', '20', '30', '40', '50'].map(taxa => (
                        <label key={taxa} className="flex-1 min-w-[3rem] cursor-pointer">
                          <input type="radio" name="taxa_sinal" value={taxa} defaultChecked={(servicoEditando?.taxa_sinal?.toString() || '0') === taxa} className="peer sr-only" />
                          <div className="py-2.5 text-center rounded-lg border border-[#DCAE96]/20 bg-[#2D0A12]/30 text-gray-400 peer-checked:bg-[#C7977D] peer-checked:text-[#120308] peer-checked:font-bold transition-all text-sm">
                            {taxa}%
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[#DCAE96]/20">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <label className="text-sm font-bold text-white flex items-center gap-2"><ImageIcon size={18} className="text-[#C7977D]" /> Fotos do Serviço</label>
                    
                    <label className="bg-[#C7977D] text-[#120308] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform w-full sm:w-auto justify-center">
                      {isUploading ? <Loader2 className="animate-spin" size={14} /> : <><Upload size={14} /> Upar do Dispositivo</>}
                      <input type="file" accept="image/*" multiple onChange={handleUploadFoto} className="hidden" />
                    </label>
                  </div>

                  {imagensSelecionadas.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-[#E8D3C8] mb-2">Imagens vinculadas:</p>
                      <div className="flex flex-wrap gap-2">
                        {imagensSelecionadas.map((imgUrl, idx) => (
                          <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#C7977D] shadow-lg">
                            <img src={imgUrl} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setImagensSelecionadas(imagensSelecionadas.filter(i => i !== imgUrl))} className="absolute top-0 right-0 bg-red-600/90 text-white p-1 rounded-bl-lg hover:bg-red-500 transition-colors">
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-2">Ou escolha das imagens padrão:</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {imagensDisponiveis.map((img) => (
                      <div key={img} onClick={() => toggleImagem(img)} className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${imagensSelecionadas.includes(img) ? 'border-[#C7977D] scale-95 shadow-[0_0_15px_rgba(199,151,125,0.4)]' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                        <img src={img} className="w-full h-full object-cover" />
                        {imagensSelecionadas.includes(img) && <div className="absolute inset-0 bg-[#120308]/60 flex items-center justify-center backdrop-blur-[1px]"><CheckCircle2 size={28} className="text-[#F8D1BE] drop-shadow-md" /></div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-6 md:px-8 py-5 bg-[#2D0A12] border-t border-[#DCAE96]/20 shrink-0">
                <button type="submit" disabled={isSaving || isUploading} className="w-full bg-gradient-to-r from-[#F8D1BE] to-[#C7977D] text-[#120308] px-8 py-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:scale-[1.02] transition-transform shadow-lg disabled:opacity-50">
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(220, 174, 150, 0.3); border-radius: 10px; }
      `}} />
    </div>
  );
}