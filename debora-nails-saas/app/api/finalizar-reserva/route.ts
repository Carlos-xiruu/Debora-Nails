import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://swmzrzorhjununfeowdm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const dados = await request.json();

    // 1. CONFIRMA O CADEADO
    if (!dados.idsReservados || dados.idsReservados.length === 0) {
        return NextResponse.json({ error: 'Nenhuma reserva para confirmar.' }, { status: 400 });
    }

    await supabase.from('agendamentos').update({ tipo: 'agendado' }).in('id', dados.idsReservados);

    // 2. LÓGICA FINANCEIRA SEGURA
    let numeroLimpo = dados.clienteDados.telefone.replace(/\D/g, '');
    if (numeroLimpo.length >= 10 && !numeroLimpo.startsWith('55')) numeroLimpo = '55' + numeroLimpo;
    
    const { data: clienteBanco } = await supabase.from('clientes').select('id').eq('telefone', numeroLimpo).limit(1);
    
    if (clienteBanco && clienteBanco.length > 0) {
      const cliente_id = clienteBanco[0].id;

      if (dados.dividaPendente > 0) {
        await supabase.from('clientes').update({ divida_pendente: 0 }).eq('id', cliente_id);
        await supabase.from('transacoes').insert([{
          descricao: `Pagamento Dívida (Falta Anterior) - ${dados.clienteDados.nome}`, 
          tipo: 'entrada', valor: dados.dividaPendente, categoria: 'Outros', data_pagamento: new Date().toISOString()
        }]);
      }
    }

    if (dados.valorSinalPago > 0) {
      await supabase.from('transacoes').insert([{
        descricao: `Sinal (LP via ${dados.metodoPagamento.toUpperCase()}): ${dados.clienteDados.nome}`, 
        tipo: 'entrada', valor: dados.valorSinalPago, categoria: 'Sinal', data_pagamento: new Date().toISOString()
      }]);
    }

    return NextResponse.json({ success: true, numeroLimpo });

  } catch (error: any) {
    console.error("ERRO CRÍTICO NA API DE RESERVA:", error);
    return NextResponse.json({ error: 'Falha interna no servidor.' }, { status: 500 });
  }
}