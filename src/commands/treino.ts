import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('treino')
  .setDescription('Abre um novo lobby de treino')
  .addStringOption(option =>
    option.setName('jogo')
      .setDescription('Selecione o jogo do treino')
      .setRequired(true)
      .addChoices(
        { name: 'Valorant', value: 'Valorant' },
        { name: 'League of Legends', value: 'LoL' },
        { name: 'CS2', value: 'CS2' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const jogo = interaction.options.getString('jogo', true);

  const embed = new EmbedBuilder()
    .setTitle(`🎮 Lobby de Treino: ${jogo}`)
    .setDescription(`Capitão: ${interaction.user.toString()}`)
    .setColor('#0099ff')
    .addFields({ 
      name: 'Jogadores Confirmados (1/5)', 
      value: `${interaction.user.toString()}\n` 
    });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('join_lobby')
      .setLabel('Entrar no Lobby')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('start_match')
      .setLabel('Iniciar Treino')
      .setStyle(ButtonStyle.Primary)
  );

  // Envia a mensagem pública no canal onde o comando foi digitado
  await interaction.reply({ embeds: [embed], components: [row] });
}