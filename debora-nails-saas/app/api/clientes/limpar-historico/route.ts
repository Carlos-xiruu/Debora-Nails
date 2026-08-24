import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // 🛡️ MÁGICA DE BUILD: A chave só é chamada na hora exata do clique!
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; 

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Chaves do Supabase não encontradas.');
      return NextResponse.json({ error: 'Erro de configuração do servidor' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { cliente_id } = await request.json();

    if (!cliente_id) {
      return NextResponse.json({ error: 'ID do cliente não fornecido' }, { status: 400 });
    }

    // Atualizando a coluna de faltas para zero
    const { data, error } = await supabase
      .from('clientes')
      .update({ faltas: 0, divida_pendente: 0 }) // Zera a falta e a dívida também!
      .eq('id', cliente_id)
      .select();

    if (error) {
      console.error('Erro no Supabase:', error);
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, message: 'Histórico limpo com sucesso!' });
  } catch (error: any) {
    console.error('🚨 Erro ao limpar histórico:', error.message);
    return NextResponse.json({ error: 'Falha ao processar requisição' }, { status: 500 });
  }
}