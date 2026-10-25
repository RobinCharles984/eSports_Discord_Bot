import { ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const data = { name: 'start_match' };

export async function execute(interaction: ButtonInteraction) {
  const originalEmbed = interaction.message.embeds[0];

  if (!originalEmbed.description?.includes(interaction.user.id)) {
    return interaction.reply({ content: '❌ Apenas o capitão pode iniciar o treino!', ephemeral: true });
  }

  // Gera o timestamp exato do clique em segundos (Unix Epoch)
  const startTime = Math.floor(Date.now() / 1000);

  const newEmbed = EmbedBuilder.from(originalEmbed)
    .setTitle(originalEmbed.title?.replace('Lobby de Treino', '🔴 Partida em Andamento') || '🔴 Partida em Andamento')
    .setColor('#ffaa00')
    // Esconde a chave 'ts' no rodapé para o bot ler depois
    .setFooter({ text: `ts:${startTime} | Clique em Finalizar após jogar todas as partidas.` })
    // Adiciona visualmente o horário para a galera do chat
    .addFields({ name: '⏱️ Início do Treino', value: `<t:${startTime}:t>`, inline: true });

  const newRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('end_match').setLabel('Finalizar Treino').setStyle(ButtonStyle.Danger)
  );

  await interaction.update({ embeds: [newEmbed], components: [newRow] });
}