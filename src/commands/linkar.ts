import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { supabase } from '../services/supabase.js';
import { getPuuidByRiotId } from '../services/riot.js';

export const data = new SlashCommandBuilder()
  .setName('linkar')
  .setDescription('Vincula suas contas de jogos ao Discord')
  .addStringOption(option => 
    option.setName('riot')
      .setDescription('Seu Riot ID (ex: Nick#TAG)')
      .setRequired(false)
  )
  .addStringOption(option => 
    option.setName('steam')
      .setDescription('Seu Steam ID (ex: 76561198...)')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  // Já usando a nova flag para evitar o aviso amarelo no terminal!
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const riotId = interaction.options.getString('riot');
  const steamId = interaction.options.getString('steam');

  if (!riotId && !steamId) {
    return interaction.editReply('❌ Você precisa fornecer pelo menos um ID (Riot ou Steam).');
  }

  try {
    let riotPuuid = null;

    if (riotId) {
      if (!riotId.includes('#')) {
        return interaction.editReply('❌ Formato inválido! O Riot ID deve conter a tag (ex: Lobinho#BR1).');
      }

      const [gameName, tagLine] = riotId.split('#');
      try {
        // O Pulo do Gato: Busca o PUUID real de 78 caracteres na API oficial
        riotPuuid = await getPuuidByRiotId(gameName, tagLine);
      } catch (error: any) {
        return interaction.editReply(`❌ Erro na Riot API: ${error.message}`);
      }
    }

    const updateData: any = { discord_id: interaction.user.id };
    if (riotId) {
      updateData.riot_id = riotId;
      updateData.riot_puuid = riotPuuid; // Salva na nova coluna que criamos
    }
    if (steamId) {
      updateData.steam_id = steamId;
    }

    // Verifica se o jogador já existe para dar UPDATE, senão faz INSERT
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('discord_id')
      .eq('discord_id', interaction.user.id)
      .single();

    if (existingPlayer) {
      const { error } = await supabase.from('players').update(updateData).eq('discord_id', interaction.user.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('players').insert(updateData);
      if (error) throw error;
    }

    await interaction.editReply('✅ Contas vinculadas com sucesso! O sistema rastreou e salvou seu PUUID.');

  } catch (error) {
    console.error(error);
    await interaction.editReply('❌ Ocorreu um erro ao salvar seus dados no banco.');
  }
}