import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { titulo, preco, clienteNome, clienteTelefone } = body;

    // Trava de segurança caso a chave não esteja na Vercel
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      console.error("ERRO GRAVE: Chave do Mercado Pago não encontrada.");
      return NextResponse.json({ error: 'Chave não configurada' }, { status: 500 });
    }

    // Conecta com o Mercado Pago
    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
    const preference = new Preference(client);

    // Seu domínio oficial (usado para o Mercado Pago saber para onde voltar)
    const DOMINIO_OFICIAL = 'https://deboranails.com.br';

    // Cria o Checkout Pro
    const result = await preference.create({
      body: {
        items: [
          {
            id: 'sinal_reserva',
            title: `Sinal Exclusivo: ${titulo}`,
            quantity: 1,
            unit_price: Number(preco)
          }
        ],
        payer: {
          name: clienteNome,
          email: 'atendimento@deboranails.com.br', // Email genérico para bypassar a exigência do MP
        },
        payment_methods: {
          excluded_payment_types: [
            { id: 'ticket' }, // Remove Boleto
            { id: 'atm' }     // Remove pagamento em lotérica
          ],
          installments: 1 // Sinal não parcela
        },
        back_urls: {
          success: `${DOMINIO_OFICIAL}/?pagamento=sucesso`,
          failure: `${DOMINIO_OFICIAL}/?pagamento=erro`,
          pending: `${DOMINIO_OFICIAL}/?pagamento=pendente`
        },
        auto_return: 'approved',
      }
    });

    // Devolve o link de pagamento seguro para a Landing Page
    return NextResponse.json({ url_pagamento: result.init_point });

  } catch (error) {
    console.error('Erro Interno no Mercado Pago:', error);
    return NextResponse.json({ error: 'Erro ao gerar o pagamento' }, { status: 500 });
  }
}