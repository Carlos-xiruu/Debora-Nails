'use client';
import { useState } from 'react';

export default function BookingModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [step, setStep] = useState(1); // Passo 1: Serviço | Passo 2: Data | Passo 3: Checkout

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="glass-card neon-border w-full max-w-md p-6 relative flex flex-col gap-4 animate-in fade-in zoom-in duration-300">
                
                {/* Botão Fechar */}
                <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-[#F8D1BE] transition">
                    <i className="fa-solid fa-xmark text-xl"></i>
                </button>

                <div className="text-center mb-4">
                    <h2 className="text-2xl font-serif text-white">Agendar Horário</h2>
                    <p className="text-[#E8D3C8] text-sm mt-1">Sua melhor versão começa aqui.</p>
                </div>

                {/* PASSO 1: Escolha do Serviço */}
                {step === 1 && (
                    <div className="flex flex-col gap-3">
                        <div className="p-4 border border-[#DCae964d] rounded-lg bg-black/40 hover:bg-[#F8D1BE]/10 transition cursor-pointer" onClick={() => setStep(2)}>
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="text-white font-semibold">Alongamento em Fibra</h3>
                                <span className="text-[#F8D1BE] font-bold">R$ 150</span>
                            </div>
                            <p className="text-[#E8D3C8] text-xs">Aprox. 2h30 • Durabilidade de 25 dias</p>
                        </div>
                        
                        <div className="p-4 border border-[#DCae964d] rounded-lg bg-black/40 hover:bg-[#F8D1BE]/10 transition cursor-pointer" onClick={() => setStep(2)}>
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="text-white font-semibold">Banho de Gel</h3>
                                <span className="text-[#F8D1BE] font-bold">R$ 100</span>
                            </div>
                            <p className="text-[#E8D3C8] text-xs">Aprox. 1h30 • Proteção e brilho</p>
                        </div>
                    </div>
                )}

                {/* PASSO 2: Simulação de Data/Hora */}
                {step === 2 && (
                    <div className="flex flex-col gap-4 text-center">
                        <p className="text-[#E8D3C8] text-sm">Integração com calendário Supabase em breve.</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button className="p-3 border border-[#DCae964d] rounded bg-[#F8D1BE]/20 text-white">Amanhã, 14:00</button>
                            <button className="p-3 border border-[#DCae964d] rounded bg-[#F8D1BE]/5 text-white">Amanhã, 16:30</button>
                        </div>
                        <button onClick={() => setStep(3)} className="main-action-button w-full py-3 rounded-full font-semibold mt-2">
                            Continuar para Pagamento
                        </button>
                        <button onClick={() => setStep(1)} className="text-[#E8D3C8] text-sm hover:text-white mt-2">Voltar aos serviços</button>
                    </div>
                )}

                {/* PASSO 3: Resumo e Pagamento */}
                {step === 3 && (
                    <div className="flex flex-col gap-4">
                        <div className="bg-black/50 p-4 rounded-lg border border-[#DCae964d]">
                            <h4 className="text-white font-semibold mb-2">Resumo do Agendamento</h4>
                            <div className="flex justify-between text-sm text-[#E8D3C8] mb-1">
                                <span>Serviço:</span><span>Alongamento em Fibra</span>
                            </div>
                            <div className="flex justify-between text-sm text-[#E8D3C8] mb-1">
                                <span>Valor Total:</span><span>R$ 150,00</span>
                            </div>
                            <div className="border-t border-[#DCae964d] my-2"></div>
                            <div className="flex justify-between font-bold text-[#F8D1BE]">
                                <span>Sinal para confirmar (30%):</span><span>R$ 45,00</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 text-center">
                                *O restante (R$ 105,00) é pago no dia. Cancelamentos em até 48h reembolsam o sinal.
                            </p>
                        </div>
                        
                        <button className="main-action-button w-full py-3 rounded-full font-semibold flex justify-center items-center gap-2">
                            <i className="fa-brands fa-pix"></i> Pagar Sinal via Pix
                        </button>
                        <button onClick={() => setStep(2)} className="text-[#E8D3C8] text-sm hover:text-white mt-2">Voltar à agenda</button>
                    </div>
                )}
            </div>
        </div>
    );
}