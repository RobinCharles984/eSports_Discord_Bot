import { ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { supabase } from '../../services/supabase.js';
import { getMatchesSince, getMatchDetails } from '../../services/riot.js';
import { getValorantMatchesSince } from '../../services/valorant.js';

export const data = { name: 'end_match' };

export async function execute(interaction: ButtonInteraction) {
  const message = interaction.message;
  const originalEmbed = message.embeds[0];

  if (!originalEmbed.description?.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Apenas o capitão pode finalizar o treino!', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferUpdate();

  try {
    const tituloLobby = originalEmbed.title || '';
    const gameName = tituloLobby.includes('Valorant') ? 'Valorant' : tituloLobby.includes('LoL') ? 'LoL' : null;
    if (!gameName) throw new Error('Jogo não suportado para API no momento.');

    const footerText = originalEmbed.footer?.text || '';
    const tsMatch = footerText.match(/ts:(\d+)/);
    // Forçando 24 horas atrás para o teste de resgate da partida
    const startTimeEpoch = tsMatch ? parseInt(tsMatch[1], 10) : Math.floor(Date.now() / 1000) - 86400; 

    const playersField = originalEmbed.fields.find(f => f.name.includes('Jogadores'));
    const discordIds = [...(playersField?.value || '').matchAll(/<@!?(\d+)>/g)].map(m => m[1]);

    const { data: dbPlayers, error } = await supabase
      .from('players')
      .select('discord_id, riot_puuid, riot_id')
      .in('discord_id', discordIds)
      .not('riot_id', 'is', null);

    if (error || !dbPlayers || dbPlayers.length === 0) throw new Error('Nenhum jogador linkado encontrado.');

    const capitaoDB = dbPlayers.find(p => p.discord_id === interaction.user.id);
    if (!capitaoDB) throw new Error('O capitão não possui conta vinculada.');

    let allMatchesData: any[] = [];
    let matchCount = 0;

    if (gameName === 'LoL') {
      const matchIds = await getMatchesSince(capitaoDB.riot_puuid, 'LoL', startTimeEpoch);
      if (matchIds.length === 0) throw new Error('Nenhuma partida de LoL encontrada desde o início do treino.');
      const promises = matchIds.map((id: string) => getMatchDetails(id, 'LoL'));
      allMatchesData = await Promise.all(promises);
      matchCount = matchIds.length;
    } else if (gameName === 'Valorant') {
      allMatchesData = await getValorantMatchesSince(capitaoDB.riot_id, startTimeEpoch);
      if (allMatchesData.length === 0) throw new Error('Nenhuma partida de Valorant encontrada (Pode demorar 2 min para atualizar na API).');
      matchCount = allMatchesData.length;
    }

    const statsToSaveBatch: any[] = [];
    let totalWins = 0, totalKills = 0, totalDeaths = 0, totalAssists = 0;

    allMatchesData.forEach(matchData => {
      if (gameName === 'Valorant') {
        const participants = matchData.players.all_players;
        
        participants.forEach((participant: any) => {
          // No Valorant, cruzamos os dados formatando o nome da API para ficar igual ao do Banco de Dados
          const partRiotId = `${participant.name}#${participant.tag}`.toLowerCase();
          const playerLinkado = dbPlayers.find(p => p.riot_id?.toLowerCase() === partRiotId);
          
          if (playerLinkado) {
            const stats = participant.stats;
            const totalShots = stats.headshots + stats.bodyshots + stats.legshots;
            const hsPercent = totalShots > 0 ? Math.round((stats.headshots / totalShots) * 100) : 0;
            
            const teamColor = participant.team.toLowerCase();
            const matchWin = matchData.teams[teamColor]?.has_won || false;

            const playerStats = {
              agent: participant.character, kills: stats.kills, deaths: stats.deaths, assists: stats.assists,
              combatScore: stats.score, hsPercentage: hsPercent, win: matchWin
            };

            if (matchWin) totalWins++;
            totalKills += playerStats.kills;
            totalDeaths += playerStats.deaths;
            totalAssists += playerStats.assists;

            statsToSaveBatch.push({ game: 'Valorant', player_id: playerLinkado.discord_id, status: 'finished', stats: playerStats });
          }
        });
      } else {
        const participants = matchData.info.participants;
        
        participants.forEach((participant: any) => {
          const playerLinkado = dbPlayers.find(p => p.riot_puuid === participant.puuid);
          
          if (playerLinkado) {
            const matchWin = participant.win;
            const playerStats = {
              champion: participant.championName, kills: participant.kills, deaths: participant.deaths, assists: participant.assists,
              farm: participant.totalMinionsKilled + participant.neutralMinionsKilled, win: matchWin
            };

            if (matchWin) totalWins++;
            totalKills += playerStats.kills;
            totalDeaths += playerStats.deaths;
            totalAssists += playerStats.assists;

            statsToSaveBatch.push({ game: 'LoL', player_id: playerLinkado.discord_id, status: 'finished', stats: playerStats });
          }
        });
      }
    });

    const realTeamWins = totalWins / dbPlayers.length;
    const winRatioText = realTeamWins > (matchCount / 2) ? '🎉 Saldo Positivo' : '💀 Saldo Negativo';

    const resultEmbed = new EmbedBuilder()
      .setTitle(`🏆 Resumo do Treino: ${gameName}`)
      .setColor(gameName === 'Valorant' ? '#ff4655' : '#2ecc71')
      .setDescription(`${winRatioText}\nForam registradas **${matchCount} partidas** neste ciclo.`)
      .addFields(
        { name: 'KDA Médio Coletivo', value: `${(totalKills/matchCount).toFixed(1)} / ${(totalDeaths/matchCount).toFixed(1)} / ${(totalAssists/matchCount).toFixed(1)}` }
      );

    await supabase.from('matches').insert(statsToSaveBatch);
    await message.edit({ embeds: [resultEmbed], components: [] });

  } catch (error: any) {
    console.error(error);
    const retryRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('end_match').setLabel('Tentar Novamente').setStyle(ButtonStyle.Danger)
    );
    await message.edit({ content: `❌ Erro ao puxar a partida: ${error.message}`, components: [retryRow] });
  }
}