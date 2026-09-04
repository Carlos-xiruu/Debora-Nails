import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://swmzrzorhjununfeowdm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const dados = await request.json();

    // 1. CHECAGEM DUPLA COM EXPIRAÇÃO INTELIGENTE
    for (const sessao of dados.sessoesSelecionadas) {
      const inicioDate = new Date(`${sessao.dataFiltroBase}T${sessao.hora}:00-03:00`);
      const fimDate = new Date(inicioDate);
      fimDate.setMinutes(fimDate.getMinutes() + dados.duracaoMins);

      const { data: vagaOcupada } = await supabase
        .from('agendamentos')
        .select('id, tipo, created_at')
        .neq('tipo', 'cancelado')
        .lt('inicio', fimDate.toISOString())
        .gt('fim', inicioDate.toISOString());

      if (vagaOcupada && vagaOcupada.length > 0) {
        // Verifica se a vaga está ocupada de verdade ou se é um bloqueio velho (abandonado)
        const ocupadaDeFato = vagaOcupada.some(v => {
          if (v.tipo !== 'pendente_pagamento') return true; 
          const idadeMinutos = (new Date().getTime() - new Date(v.created_at).getTime()) / 60000;
          return idadeMinutos <= 10; // Só bloqueia se o cadeado foi colocado há menos de 10 minutos
        });

        if (ocupadaDeFato) {
          return NextResponse.json({ error: 'A vaga foi reservada por outra cliente neste instante.' }, { status: 409 });
        }
      }
    }

    // 2. BUSCA OU CRIA O CLIENTE SILENCIOSAMENTE
    let cliente_id;
    let numeroLimpo = dados.clienteDados.telefone.replace(/\D/g, '');
    if (numeroLimpo.length >= 10 && !numeroLimpo.startsWith('55')) numeroLimpo = '55' + numeroLimpo;

    const { data: clienteBanco } = await supabase.from('clientes').select('id').eq('telefone', numeroLimpo).limit(1);
    if (clienteBanco && clienteBanco.length > 0) {
      cliente_id = clienteBanco[0].id;
    } else {
      const { data: novoCliente, error: errCli } = await supabase.from('clientes').insert([{ nome: dados.clienteDados.nome, telefone: numeroLimpo, status: 'Novo' }]).select().limit(1);
      if (errCli) throw new Error("Erro ao criar cliente.");
      cliente_id = novoCliente[0].id;
    }

    // 3. INSERE O CADEADO NO BANCO DE DADOS
    const grupoPacoteId = dados.servicoEscolhido.is_pacote ? crypto.randomUUID() : null;
    const agendamentosParaInserir = dados.sessoesSelecionadas.map((sessao: any) => {
      const inicioDate = new Date(`${sessao.dataFiltroBase}T${sessao.hora}:00-03:00`);
      const fimDate = new Date(inicioDate);
      fimDate.setMinutes(fimDate.getMinutes() + dados.duracaoMins);

      return {
        cliente_id, 
        servico_id: dados.servicoEscolhido.id, 
        tipo: 'pendente_pagamento', // 🚨 ESTE É O SEGREDO QUE FAZ A VAGA SUMIR!
        inicio: inicioDate.toISOString(), 
        fim: fimDate.toISOString(), 
        observacoes: dados.clienteDados.observacoes, 
        prefere_silencio: dados.clienteDados.prefere_silencio,
        grupo_pacote_id: grupoPacoteId
      };
    });

    const { data: inseridos, error: errAgendamento } = await supabase.from('agendamentos').insert(agendamentosParaInserir).select('id');
    if (errAgendamento) throw new Error("Erro ao inserir agendamentos.");

    // Devolve os IDs para a tela de pagamento saber quem ela vai confirmar depois
    const idsReservados = inseridos.map(i => i.id);

    return NextResponse.json({ success: true, idsReservados });
  } catch (error: any) {
    return NextResponse.json({ error: 'Falha ao bloquear vaga.' }, { status: 500 });
  }
}