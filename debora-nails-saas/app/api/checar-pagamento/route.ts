import { NextResponse } from 'next/server';
import { Payment, MercadoPagoConfig } from 'mercadopago';

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    const payment = new Payment(client);
    const result = await payment.get({ id });

    return NextResponse.json({ status: result.status });
  } catch (error) {
    console.error("Erro na API de Checagem:", error);
    return NextResponse.json({ error: 'Erro ao checar' }, { status: 500 });
  }
}