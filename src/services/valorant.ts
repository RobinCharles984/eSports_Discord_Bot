import 'dotenv/config';

const HENRIK_API_KEY = process.env.HENRIK_API_KEY!;

export async function getValorantMatchesSince(riotId: string, startTimeEpoch: number) {
  if (!riotId || !riotId.includes('#')) throw new Error('Riot ID inválido.');
  
  const [name, tag] = riotId.split('#');
  const url = `https://api.henrikdev.xyz/valorant/v3/matches/br/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  
  try {
    const response = await fetch(url, { headers: { 'Authorization': HENRIK_API_KEY } });
    
    if (!response.ok) {
      console.error(`Erro na API HenrikDev (Partidas): ${response.status}`);
      return [];
    }
    
    const json = await response.json();
    if (!json.data) return [];

    return json.data.filter((match: any) => match.metadata.game_start >= startTimeEpoch);
  } catch (error) {
    console.error('Falha ao buscar partidas de Valorant:', error);
    return [];
  }
}