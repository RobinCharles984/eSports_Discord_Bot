// src/components/buttons/join_lobby.ts
import { ButtonInteraction, EmbedBuilder } from 'discord.js';

export const data = {
  name: 'join_lobby', // Deve ser EXATAMENTE igual ao setCustomId() do botão
};

export async function execute(interaction: ButtonInteraction) {
  // Lógica para entrar no lobby
  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  const currentPlayers = embed.data.fields?.[0].value || '';
  
  if (!currentPlayers.includes(interaction.user.id)) {
    // Adiciona o jogador à lista
    embed.spliceFields(0, 1, { 
      name: 'Jogadores Confirmados', 
      value: `${currentPlayers}${interaction.user.toString()}\n` 
    });
    
    await interaction.update({ embeds: [embed] });
  } else {
    // ephemeral: true faz a mensagem aparecer só para quem clicou
    await interaction.reply({ content: 'Você já está no lobby!', ephemeral: true });
  }
}