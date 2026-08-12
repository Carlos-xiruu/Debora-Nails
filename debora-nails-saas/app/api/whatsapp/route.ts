import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Como quem faz o fetch agora é o servidor, o bloqueio do Navegador não existe mais!
    // 👇 COLOQUE O SEU LINK DO LOCALTUNNEL AQUI:
    const response = await fetch('https://evil-rules-carry.loca.lt/enviar-mensagem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true' // A chave mestra
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao conectar com o robô' }, { status: 500 });
  }
}