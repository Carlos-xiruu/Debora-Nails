import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { valor, descricao } = body;

    // Trava de segurança
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      console.error("ERRO: Chave do Mercado Pago não encontrada.");
      return NextResponse.json({ error: 'Chave não configurada' }, { status: 500 });
    }

    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
    const payment = new Payment(client);

    // Cria a cobrança PIX nativa e transparente
    const result = await payment.create({
      body: {
        transaction_amount: Number(valor),
        description: descricao,
        payment_method_id: 'pix',
        payer: {
          email: 'atendimento@deboranails.com.br', // Email genérico obrigatório pelo MP
        },
      }
    });

    // Se deu certo, extrai o QR Code e o ID do pagamento
    if (result.point_of_interaction?.transaction_data) {
      return NextResponse.json({
        id: result.id, // Vamos usar isso depois para checar se ela pagou
        qr_code: result.point_of_interaction.transaction_data.qr_code, // Código "Copia e Cola"
        qr_code_base64: result.point_of_interaction.transaction_data.qr_code_base64, // Imagem do QR Code já desenhada
      });
    } else {
      return NextResponse.json({ error: 'Falha ao gerar o PIX.' }, { status: 400 });
    }

  } catch (error) {
    console.error('Erro Interno na API de Pagamento do Monitor:', error);
    return NextResponse.json({ error: 'Erro ao gerar o pagamento.' }, { status: 500 });
  }
}