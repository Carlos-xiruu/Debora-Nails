'use client';

/* eslint-disable @next/next/no-img-element -- Storage URLs and local legacy images share this editor. */

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ExternalLink, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { servicesStorageBucket, supabase, supabaseUrl } from '../../lib/supabase';

type Service = {
  id: string;
  nome: string;
  descricao: string | null;
  duracao: string | null;
  preco: number | string | null;
  taxa_sinal: number | null;
  sinal: string | null;
  imagens: string[] | null;
  ativo: boolean | null;
  is_pacote: boolean | null;
  qtd_sessoes: number | null;
};

type Notice = { type: 'success' | 'error'; text: string } | null;

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const heicTypes = new Set(['image/heic', 'image/heif']);

const money = (value: Service['preco']) => Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const imagesOf = (service: Service | null) => service?.imagens?.filter((image): image is string => Boolean(image?.trim())) ?? [];

function storagePathFromUrl(value: string) {
  if (value.startsWith('storage://')) {
    const prefix = `storage://${servicesStorageBucket}/`;
    return value.startsWith(prefix) ? value.slice(prefix.length) : null;
  }

  if (!supabaseUrl) return null;
  const publicPrefix = `${supabaseUrl}/storage/v1/object/public/${servicesStorageBucket}/`;
  return value.startsWith(publicPrefix) ? decodeURIComponent(value.slice(publicPrefix.length).split('?')[0]) : null;
}

async function convertHeic(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d')?.drawImage(image, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) throw new Error('Não foi possível converter esta foto.');
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'foto'}.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function imageForUpload(file: File) {
  if (file.size > 15 * 1024 * 1024) throw new Error(`${file.name}: escolha uma foto de até 15 MB.`);
  if (allowedTypes.has(file.type)) return file;
  if (heicTypes.has(file.type) || /\.hei[cf]$/i.test(file.name)) {
    try {
      return await convertHeic(file);
    } catch {
      throw new Error(`${file.name}: o Safari não conseguiu converter HEIC. Em Ajustes > Câmera > Formatos, escolha "Mais Compatível" e selecione a foto novamente.`);
    }
  }
  throw new Error(`${file.name}: use JPEG, PNG ou WebP.`);
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);

  const loadServices = async () => {
    const { data, error } = await supabase.from('servicos').select('*').order('created_at', { ascending: false });
    if (error) setNotice({ type: 'error', text: `Não foi possível carregar os serviços: ${error.message}` });
    else setServices((data ?? []) as Service[]);
    setLoading(false);
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => { void loadServices(); }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const openEditor = (service: Service | null) => {
    setNotice(null);
    setEditing(service);
    setImages(imagesOf(service));
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (saving || uploading) return;
    setEditorOpen(false);
    setEditing(null);
    setImages([]);
  };

  const uploadImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;

    setUploading(true);
    const added: string[] = [];
    const errors: string[] = [];
    for (const originalFile of files) {
      try {
        const file = await imageForUpload(originalFile);
        const extension = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
        const name = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from(servicesStorageBucket).upload(name, file, { contentType: file.type, upsert: false });
        if (error) throw new Error(error.message);
        const { data } = supabase.storage.from(servicesStorageBucket).getPublicUrl(name);
        added.push(data.publicUrl);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `${originalFile.name}: não foi possível enviar.`);
      }
    }
    if (added.length) setImages((current) => [...current, ...added]);
    if (errors.length) setNotice({ type: 'error', text: errors.join(' ') });
    setUploading(false);
  };

  const saveService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rawPrice = String(form.get('preco') ?? '').replace(',', '.');
    const price = Number(rawPrice);
    const depositRate = Number(form.get('taxa_sinal') ?? 0);
    const name = String(form.get('nome') ?? '').trim();

    if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(depositRate) || depositRate < 0 || depositRate > 100) {
      setNotice({ type: 'error', text: 'Preencha o nome, um preço válido e um sinal entre 0% e 100%.' });
      return;
    }

    setSaving(true);
    const sinal = depositRate ? `${depositRate}% (R$ ${(price * depositRate / 100).toFixed(2).replace('.', ',')})` : 'Não exigido';
    const values = {
      nome: name,
      descricao: String(form.get('descricao') ?? '').trim(),
      duracao: String(form.get('duracao') ?? '').trim(),
      preco: price,
      taxa_sinal: depositRate,
      sinal,
      imagens: images,
    };
    const result = editing
      ? await supabase.from('servicos').update(values).eq('id', editing.id).select().single()
      : await supabase.from('servicos').insert({ ...values, ativo: true, is_pacote: false, qtd_sessoes: 1 }).select().single();

    if (result.error || !result.data) {
      setNotice({ type: 'error', text: `Não foi possível salvar: ${result.error?.message ?? 'resposta inválida'}` });
      setSaving(false);
      return;
    }

    const saved = result.data as Service;
    if (editing) {
      setServices((current) => current.map((service) => service.id === saved.id ? saved : service));
      const removedPaths = imagesOf(editing).filter((image) => !images.includes(image)).map(storagePathFromUrl).filter((path): path is string => Boolean(path));
      if (removedPaths.length) {
        const { error } = await supabase.storage.from(servicesStorageBucket).remove(removedPaths);
        if (error) setNotice({ type: 'success', text: 'Serviço salvo. A foto foi removida do site, mas não do armazenamento.' });
      }
    } else {
      setServices((current) => [saved, ...current]);
    }
    setEditorOpen(false);
    setEditing(null);
    setImages([]);
    setNotice({ type: 'success', text: 'Alterações salvas e já disponíveis no site.' });
    setSaving(false);
  };

  const toggleActive = async (service: Service) => {
    const nextActive = !service.ativo;
    setServices((current) => current.map((item) => item.id === service.id ? { ...item, ativo: nextActive } : item));
    const { error } = await supabase.from('servicos').update({ ativo: nextActive }).eq('id', service.id);
    if (error) {
      setServices((current) => current.map((item) => item.id === service.id ? service : item));
      setNotice({ type: 'error', text: `Não foi possível alterar a visibilidade: ${error.message}` });
    }
  };

  const deleteService = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('servicos').delete().eq('id', deleting.id);
    if (error) {
      setNotice({ type: 'error', text: error.code === '23503' ? 'Este serviço tem histórico vinculado. Desative-o em vez de excluir.' : `Não foi possível excluir: ${error.message}` });
    } else {
      setServices((current) => current.filter((service) => service.id !== deleting.id));
      setNotice({ type: 'success', text: 'Serviço excluído.' });
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-[#621c35] px-5 py-6 text-[#fff8f5] shadow-sm sm:px-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f1d9d1]">Edição do site</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="font-serif text-4xl leading-none">Seus serviços</h1><p className="mt-2 text-sm text-[#f1d9d1]">Edite preços, textos e fotos. A primeira foto é a capa.</p></div>
          <div className="flex gap-2"><a href="/#servicos" target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#f1d9d1] px-4 text-sm font-bold text-white"><ExternalLink size={16} /> Ver site</a><button type="button" onClick={() => openEditor(null)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#fff8f5] px-5 font-bold text-[#621c35]"><Plus size={19} /> Novo serviço</button></div>
        </div>
      </section>

      {notice && <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-medium ${notice.type === 'success' ? 'border-[#9ab89d] bg-[#edf6ed] text-[#315d39]' : 'border-[#d7a0a0] bg-[#fff0f0] text-[#8a2d2d]'}`}>{notice.text}</div>}

      {loading ? <div className="flex justify-center py-16 text-[#621c35]"><Loader2 className="animate-spin" size={32} /></div> : services.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#cda7a6] bg-white p-10 text-center"><p className="font-serif text-2xl">Nenhum serviço cadastrado</p><p className="mt-2 text-sm text-[#795962]">Use o botão acima para adicionar o primeiro.</p></div>
      ) : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{services.map((service) => <ServiceCard key={service.id} service={service} onEdit={() => openEditor(service)} onToggle={() => void toggleActive(service)} onDelete={() => setDeleting(service)} />)}</div>}

      {editorOpen && <Editor service={editing} images={images} saving={saving} uploading={uploading} onClose={closeEditor} onSave={saveService} onUpload={uploadImages} onImagesChange={setImages} />}
      {deleting && <ConfirmDelete service={deleting} onCancel={() => setDeleting(null)} onConfirm={() => void deleteService()} />}
    </div>
  );
}

function ServiceCard({ service, onEdit, onToggle, onDelete }: { service: Service; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const image = imagesOf(service)[0];
  return <article className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${service.ativo ? 'border-[#ead8d1]' : 'border-[#d7c9c5] opacity-70'}`}>
    <div className="aspect-[16/10] bg-[#f1d9d1]">{image ? <img src={image} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-sm text-[#795962]">Sem foto</div>}</div>
    <div className="p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-serif text-2xl leading-none">{service.nome}</h2><p className="mt-2 text-sm font-bold text-[#621c35]">{money(service.preco)}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${service.ativo ? 'bg-[#edf6ed] text-[#315d39]' : 'bg-[#f1e8e5] text-[#795962]'}`}>{service.ativo ? 'No site' : 'Oculto'}</span></div>
    {service.descricao && <p className="mt-3 line-clamp-2 text-sm leading-5 text-[#795962]">{service.descricao}</p>}
    <div className="mt-4 flex gap-2"><button type="button" onClick={onEdit} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#621c35] px-3 text-sm font-bold text-white"><Pencil size={16} /> Editar</button><button type="button" onClick={onToggle} className="min-h-11 rounded-xl border border-[#d8b7b2] px-3 text-sm font-semibold text-[#621c35]">{service.ativo ? 'Ocultar' : 'Mostrar'}</button><button type="button" onClick={onDelete} className="grid size-11 place-items-center rounded-xl border border-[#e8c4c1] text-[#9d3938]" aria-label={`Excluir ${service.nome}`}><Trash2 size={17} /></button></div></div>
  </article>;
}

function Editor({ service, images, saving, uploading, onClose, onSave, onUpload, onImagesChange }: { service: Service | null; images: string[]; saving: boolean; uploading: boolean; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onImagesChange: (images: string[]) => void }) {
  const moveImage = (index: number, direction: -1 | 1) => { const next = [...images]; const target = index + direction; [next[index], next[target]] = [next[target], next[index]]; onImagesChange(next); };
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-[#260d18]/45 p-3 backdrop-blur-sm sm:p-6"><div className="mx-auto min-h-full max-w-2xl"><form onSubmit={onSave} className="my-auto overflow-hidden rounded-3xl bg-[#fffaf7] shadow-2xl"><div className="flex items-center justify-between border-b border-[#ead8d1] px-5 py-4 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8c5a68]">Catálogo</p><h2 className="font-serif text-2xl">{service ? 'Editar serviço' : 'Novo serviço'}</h2></div><button type="button" onClick={onClose} disabled={saving || uploading} className="grid size-11 place-items-center rounded-full hover:bg-[#f1d9d1]" aria-label="Fechar"><X size={20} /></button></div>
    <div className="space-y-5 p-5 sm:p-6"><Field label="Nome do serviço"><input name="nome" required defaultValue={service?.nome ?? ''} className="dashboard-input" placeholder="Ex.: Banho de gel" /></Field><Field label="Descrição"><textarea name="descricao" rows={3} defaultValue={service?.descricao ?? ''} className="dashboard-input resize-y" placeholder="Conte brevemente sobre este cuidado" /></Field><div className="grid gap-5 sm:grid-cols-2"><Field label="Duração"><input name="duracao" defaultValue={service?.duracao ?? ''} className="dashboard-input" placeholder="Ex.: 1h 30min" /></Field><Field label="Preço (R$)"><input name="preco" type="number" inputMode="decimal" min="0" step="0.01" required defaultValue={service?.preco ?? ''} className="dashboard-input" placeholder="0,00" /></Field></div><Field label="Sinal"><select name="taxa_sinal" defaultValue={service?.taxa_sinal ?? 0} className="dashboard-input">{[0, 10, 20, 30, 40, 50, 100].map((rate) => <option key={rate} value={rate}>{rate === 0 ? 'Não exigir sinal' : `${rate}% do valor`}</option>)}</select></Field>
    <section className="border-t border-[#ead8d1] pt-5"><div className="flex items-start justify-between gap-4"><div><h3 className="font-serif text-2xl">Fotos</h3><p className="mt-1 text-sm text-[#795962]">A primeira é a capa do serviço. Arraste a ordem pelos botões.</p></div><label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-[#f1d9d1] px-3 text-sm font-bold text-[#621c35]"><ImagePlus size={17} /> {uploading ? 'Enviando' : 'Adicionar'}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={onUpload} disabled={uploading} /></label></div>
    {images.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-[#d8b7b2] p-6 text-center text-sm text-[#795962]">Nenhuma foto selecionada.</div> : <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map((image, index) => <div key={image} className="overflow-hidden rounded-2xl border border-[#ead8d1] bg-white"><div className="relative aspect-square"><img src={image} alt={`Foto ${index + 1}`} className="size-full object-cover" />{index === 0 && <span className="absolute left-2 top-2 rounded-full bg-[#621c35] px-2 py-1 text-[10px] font-bold text-white">CAPA</span>}</div><div className="flex items-center justify-between p-1"><button type="button" disabled={index === 0} onClick={() => moveImage(index, -1)} className="grid size-9 place-items-center disabled:opacity-30" aria-label="Mover foto para antes"><ArrowUp size={16} /></button><button type="button" onClick={() => onImagesChange(images.filter((item) => item !== image))} className="grid size-9 place-items-center text-[#9d3938]" aria-label="Remover foto"><Trash2 size={16} /></button><button type="button" disabled={index === images.length - 1} onClick={() => moveImage(index, 1)} className="grid size-9 place-items-center disabled:opacity-30" aria-label="Mover foto para depois"><ArrowDown size={16} /></button></div></div>)}</div>}</section></div>
    <div className="flex flex-col-reverse gap-3 border-t border-[#ead8d1] bg-[#fff5f1] p-5 sm:flex-row sm:justify-between sm:px-6"><button type="button" onClick={onClose} disabled={saving || uploading} className="min-h-12 rounded-xl px-4 font-semibold text-[#621c35]">Cancelar</button><button type="submit" disabled={saving || uploading} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#621c35] px-6 font-bold text-white disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />} Salvar alterações</button></div></form></div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-sm font-bold text-[#621c35]">{label}</span>{children}</label>; }

function ConfirmDelete({ service, onCancel, onConfirm }: { service: Service; onCancel: () => void; onConfirm: () => void }) { return <div className="fixed inset-0 z-[60] grid place-items-center bg-[#260d18]/50 p-4"><div role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"><h2 id="delete-title" className="font-serif text-3xl">Excluir serviço?</h2><p className="mt-3 text-sm leading-6 text-[#795962]">“{service.nome}” será excluído. Se houver agendamentos ou histórico relacionado, a exclusão será bloqueada.</p><div className="mt-6 flex gap-3"><button type="button" onClick={onCancel} className="min-h-12 flex-1 rounded-xl border border-[#d8b7b2] font-bold text-[#621c35]">Cancelar</button><button type="button" onClick={onConfirm} className="min-h-12 flex-1 rounded-xl bg-[#9d3938] font-bold text-white">Excluir</button></div></div></div>; }
