import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { titulo, preco, clienteNome, clienteTelefone, metodoPagamento } = body;

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Chave não configurada' }, { status: 500 });
    }

    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
    const preference = new Preference(client);
    const DOMINIO_OFICIAL = 'https://deboranails.com.br';

    const excludedTypes = [
      { id: 'ticket' },
      { id: 'atm' }
    ];

    // Variável para forçar o PIX como padrão absoluto
    let defaultMethodId = undefined;

    if (metodoPagamento === 'pix') {
      excludedTypes.push({ id: 'credit_card' }, { id: 'debit_card' });
      defaultMethodId = 'pix'; // Força o PIX a ser a primeira e única coisa na tela
    } else if (metodoPagamento === 'cartao') {
      excludedTypes.push({ id: 'bank_transfer' });
    }

    const result = await preference.create({
      body: {
        items: [
          {
            id: 'sinal_reserva',
            title: `Sinal Exclusivo: ${titulo}`,
            quantity: 1,
            unit_price: Number(Number(preco).toFixed(2))
          }
        ],
        payer: {
          name: clienteNome,
          email: 'atendimento@deboranails.com.br', 
        },
        payment_methods: {
          excluded_payment_types: excludedTypes,
          default_payment_method_id: defaultMethodId, // Aplica a regra do PIX aqui
          installments: 1
        },
        back_urls: {
          success: `${DOMINIO_OFICIAL}/?pagamento=sucesso`,
          failure: `${DOMINIO_OFICIAL}/?pagamento=erro`,
          pending: `${DOMINIO_OFICIAL}/?pagamento=pendente`
        },
        auto_return: 'approved',
      }
    });

    return NextResponse.json({ url_pagamento: result.init_point });

  } catch (error) {
    console.error('Erro Interno no Mercado Pago:', error);
    return NextResponse.json({ error: 'Erro ao gerar o pagamento' }, { status: 500 });
  }
}