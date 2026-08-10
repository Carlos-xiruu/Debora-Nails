import { NextResponse } from 'next/server';
import { Payment, MercadoPagoConfig } from 'mercadopago';

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payment = new Payment(client);

    const result = await payment.create({
      body: {
        transaction_amount: Number(Number(body.valor).toFixed(2)),
        description: body.descricao,
        payment_method_id: 'pix',
        payer: {
          email: 'atendimento@deboranails.com.br', // Email padrão necessário para a API
        }
      }
    });

    return NextResponse.json({
      id: result.id,
      qr_code: result.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64
    });
  } catch (error) {
    console.error("Erro na API de PIX Nativo:", error);
    return NextResponse.json({ error: 'Erro ao gerar PIX' }, { status: 500 });
  }
}