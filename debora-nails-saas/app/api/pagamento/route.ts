import { NextResponse } from 'next/server';
import { Preference, MercadoPagoConfig } from 'mercadopago';

export async function POST(request: Request) {
  try {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || '';
    
    if (!token) {
      console.error("ERRO: Nenhum Token do Mercado Pago foi encontrado!");
      return NextResponse.json({ error: 'Token ausente' }, { status: 500 });
    }

    const client = new MercadoPagoConfig({ accessToken: token });
    const body = await request.json();
    const preference = new Preference(client);

    //  o seu domínio oficial com HTTPS
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://deboranails.com.br';

    const result = await preference.create({
      body: {
        items: [
          {
            id: 'sinal',
            title: `Reserva: ${body.titulo}`,
            quantity: 1,
            unit_price: Number(body.preco)
          }
        ],
        back_urls: {
          success: `${baseUrl}/?pagamento=sucesso`,
          failure: `${baseUrl}/?pagamento=erro`,
          pending: `${baseUrl}/?pagamento=pendente`
        },
        //  Como o link agora é seguro (https), o Mercado Pago aceita devolver a cliente sozinho!
        auto_return: 'approved',
        payment_methods: {
          excluded_payment_types: [
            { id: 'ticket' }, 
            { id: 'bank_transfer' } 
          ],
          installments: 12
        }
      }
    });

    return NextResponse.json({ init_point: result.init_point });
    
  } catch (error) {
    console.error("=== ERRO REAL DO MERCADO PAGO ===");
    console.error(error);
    return NextResponse.json({ error: 'Erro ao gerar link de pagamento' }, { status: 500 });
  }
}