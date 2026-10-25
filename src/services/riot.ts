import 'dotenv/config';

const RIOT_API_KEY = process.env.RIOT_API_KEY!;
const HEADERS = { 'X-Riot-Token': RIOT_API_KEY };

// 1. Pega o PUUID universal da conta (Serve tanto para LoL quanto Valorant)
export async function getPuuidByRiotId(gameName: string, tagLine: string) {
  const url = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  const response = await fetch(url, { headers: HEADERS });
  
  if (!response.ok) throw new Error('Jogador não encontrado na base da Riot. Verifique o Nick e a Tag.');
  
  const data = await response.json();
  return data.puuid;
}

// 2. Busca o ID da última partida dependendo do jogo
export async function getMatchesSince(puuid: string, game: 'LoL' | 'Valorant', startTimeEpoch: number) {
  if (game === 'LoL') {
    // API do LoL usa segundos
    const url = `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?startTime=${startTimeEpoch}&count=10`;
    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) return [];
    return await response.json(); // Retorna array de IDs (ex: ["BR1_123", "BR1_124"])
  } else if (game === 'Valorant') {
    // API de Valorant usa milissegundos internamente
    const url = `https://br.api.riotgames.com/val/match/v1/matchlists/by-puuid/${puuid}`;
    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) return [];
    const data = await response.json();
    
    // Filtra as partidas que começaram DEPOIS que o treino foi iniciado
    return data.history
      .filter((m: any) => m.gameStartTimeMillis >= (startTimeEpoch * 1000))
      .map((m: any) => m.matchId);
  }
  return [];
}

// 3. Puxa os dados estatísticos completos (Kills, mortes, mapa, etc)
export async function getMatchDetails(matchId: string, game: 'LoL' | 'Valorant') {
  let url = '';
  
  if (game === 'LoL') {
    url = `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}`;
  } else if (game === 'Valorant') {
    url = `https://br.api.riotgames.com/val/match/v1/matches/${matchId}`;
  }
  
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`Erro ao buscar detalhes da partida de ${game}.`);
  
  return response.json();
}