// app/api/pagamentos/route.ts

import { NextResponse } from 'next/server';

// Substitua esta URL pela URL REAL do seu Cloudflare Worker!
const CLOUDFLARE_WORKER_URL = "https://mute-bush-7a89.paulo-barrozosf.workers.dev/pagamentos";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const inicio = searchParams.get('inicio');
  const fim = searchParams.get('fim');

  if (!inicio || !fim) {
    return NextResponse.json(
      { error: "Parâmetros 'inicio' e 'fim' são obrigatórios." },
      { status: 400 }
    );
  }

  try {
    const workerResponse = await fetch(`${CLOUDFLARE_WORKER_URL}?inicio=${inicio}&fim=${fim}`);

    if (!workerResponse.ok) {
      const errorDetails = await workerResponse.text();
      console.error(`Erro do Cloudflare Worker: ${workerResponse.status} - ${errorDetails}`);
      return NextResponse.json(
        { error: `Erro ao buscar dados do Worker: ${workerResponse.status}`, details: errorDetails },
        { status: workerResponse.status }
      );
    }

    const data = await workerResponse.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Erro ao conectar com o Cloudflare Worker:", error.message);
    return NextResponse.json(
      { error: "Erro ao conectar com o serviço de pagamentos.", details: error.message },
      { status: 500 }
    );
  }
}
