export const converterParaMinutos = (horaStr: string) => {
  if (!horaStr) return 0;
  const [h, m] = horaStr.split(':').map(Number);
  return h * 60 + m;
};

export const converterParaHoraStr = (minutos: number) => {
  const h = Math.floor(minutos / 60).toString().padStart(2, '0');
  const m = (minutos % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

export const extrairMinutosDuracao = (duracaoStr: string) => {
  if (!duracaoStr) return 60;
  let total = 0;
  const str = duracaoStr.toLowerCase().trim();
  const horasMatch = str.match(/(\d+)\s*h/);
  if (horasMatch) total += parseInt(horasMatch[1]) * 60;
  const minMatch = str.match(/(\d+)\s*m/);
  if (minMatch) total += parseInt(minMatch[1]);
  return total > 0 ? total : 60;
};

export const formatarDataLocalStr = (d: Date) => {
  const tzOffset = d.getTimezoneOffset() * 60000; 
  const localISOTime = new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
  return localISOTime;
};