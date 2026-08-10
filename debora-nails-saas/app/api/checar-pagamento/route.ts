import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Chave não configurada' }, { status: 500 });
    }

    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
    const payment = new Payment(client);

    // Consulta o status exato deste pagamento
    const result = await payment.get({ id });

    return NextResponse.json({ status: result.status });

  } catch (error) {
    console.error('Erro na API de Checagem:', error);
    return NextResponse.json({ error: 'Erro ao checar.' }, { status: 500 });
  }
}