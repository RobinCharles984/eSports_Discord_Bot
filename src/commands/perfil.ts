import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { supabase } from '../services/supabase.js';

export const data = new SlashCommandBuilder()
  .setName('perfil')
  .setDescription('Exibe as estatísticas de treino de um jogador')
  .addStringOption(option => 
    option.setName('jogo')
      .setDescription('Selecione o jogo')
      .setRequired(true)
      .addChoices(
        { name: 'Valorant', value: 'Valorant' },
        { name: 'League of Legends', value: 'LoL' },
        { name: 'CS2', value: 'CS2' }
      )
  )
  .addUserOption(option => 
    option.setName('jogador')
      .setDescription('Selecione um jogador (deixe em branco para ver o seu)')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  // Resposta pública visível para todos no canal
  await interaction.deferReply(); 

  const targetUser = interaction.options.getUser('jogador') || interaction.user;
  const jogoEscolhido = interaction.options.getString('jogo', true);

  try {
    const { data: player } = await supabase
      .from('players')
      .select('riot_id, steam_id')
      .eq('discord_id', targetUser.id)
      .single();

    if (!player) {
      return interaction.editReply(`❌ O jogador ${targetUser.toString()} não vinculou nenhuma conta (Use /linkar).`);
    }

    const { data: matches, error } = await supabase
      .from('matches')
      .select('stats')
      .eq('player_id', targetUser.id)
      .eq('game', jogoEscolhido);

    if (error) throw error;

    if (!matches || matches.length === 0) {
      return interaction.editReply(`📊 O jogador ${targetUser.toString()} ainda não tem treinos registrados de **${jogoEscolhido}**.`);
    }

    const totalMatches = matches.length;
    let totalWins = 0, totalKills = 0, totalDeaths = 0, totalAssists = 0;
    let totalFarm = 0, totalCombatScore = 0, totalHsPercentage = 0;

    matches.forEach(m => {
      const stats = m.stats as any;
      if (stats.win) totalWins++;
      totalKills += stats.kills || 0;
      totalDeaths += stats.deaths || 0;
      totalAssists += stats.assists || 0;

      if (jogoEscolhido === 'LoL') {
        totalFarm += stats.farm || 0;
      } else if (jogoEscolhido === 'Valorant') {
        totalCombatScore += stats.combatScore || 0;
        totalHsPercentage += stats.hsPercentage || 0;
      }
    });

    const winRate = ((totalWins / totalMatches) * 100).toFixed(1);
    const avgK = (totalKills / totalMatches).toFixed(1);
    const avgD = (totalDeaths / totalMatches).toFixed(1);
    const avgA = (totalAssists / totalMatches).toFixed(1);
    const kdaRatio = totalDeaths === 0 ? (totalKills + totalAssists).toFixed(2) : ((totalKills + totalAssists) / totalDeaths).toFixed(2);

    const embed = new EmbedBuilder()
      .setAuthor({ name: `Perfil de Treino: ${targetUser.username}`, iconURL: targetUser.displayAvatarURL() })
      .setTitle(`🎮 ${jogoEscolhido} | ID: ${player.riot_id || player.steam_id || 'Não vinculado'}`)
      .setColor(jogoEscolhido === 'Valorant' ? '#ff4655' : '#0099ff')
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Total de Treinos', value: `${totalMatches} partidas`, inline: true },
        { name: 'Taxa de Vitória', value: `${winRate}% (${totalWins}V / ${totalMatches - totalWins}D)`, inline: true },
        { name: '\u200B', value: '\u200B' }, 
        { name: 'KDA Médio', value: `${avgK} / ${avgD} / ${avgA}`, inline: true },
        { name: 'KDA Ratio', value: `${kdaRatio}`, inline: true }
      );

    if (jogoEscolhido === 'LoL') {
      const avgFarm = (totalFarm / totalMatches).toFixed(1);
      embed.addFields({ name: 'Farm Médio (CS)', value: `${avgFarm}`, inline: true });
    } else if (jogoEscolhido === 'Valorant') {
      embed.addFields(
        { name: 'ACS Médio', value: `${Math.round(totalCombatScore / totalMatches)}`, inline: true },
        { name: 'Taxa de HS', value: `${Math.round(totalHsPercentage / totalMatches)}%`, inline: true }
      );
    }

    embed.setFooter({ text: 'Inatel eSports - Sistema de Estatísticas' });
    await interaction.editReply({ embeds: [embed] });

  } catch (error: any) {
    console.error(error);
    await interaction.editReply('❌ Ocorreu um erro ao buscar as estatísticas deste jogador.');
  }
}