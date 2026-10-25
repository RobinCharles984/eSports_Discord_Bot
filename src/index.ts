import { Client, GatewayIntentBits, Events, Collection, REST, Routes } from 'discord.js';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

console.log('🚀 Iniciando o script do Bot...');

const commands = new Collection<string, any>();
const buttons = new Collection<string, any>();
const commandsDataForAPI: any[] = [];

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const commandsPath = path.join(process.cwd(), 'src', 'commands');
const buttonsPath = path.join(process.cwd(), 'src', 'components', 'buttons');

if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath, { recursive: true });
if (!fs.existsSync(buttonsPath)) fs.mkdirSync(buttonsPath, { recursive: true });

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));
const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.ts'));

(async () => {
  console.log('📦 Carregando módulos...');
  
  for (const file of commandFiles) {
    const filePath = 'file:///' + path.join(commandsPath, file).replace(/\\/g, '/');
    const command = await import(filePath);
    if ('data' in command && 'execute' in command) {
      commands.set(command.data.name, command);
      commandsDataForAPI.push(command.data.toJSON());
      console.log(`[+] Comando /${command.data.name} carregado.`);
    }
  }

  for (const file of buttonFiles) {
    const filePath = 'file:///' + path.join(buttonsPath, file).replace(/\\/g, '/');
    const button = await import(filePath);
    if ('data' in button && 'execute' in button) {
      buttons.set(button.data.name, button);
      console.log(`[+] Botão '${button.data.name}' carregado.`);
    }
  }
})();

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Conectado ao Discord como ${readyClient.user.tag}`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
  try {
    console.log('⏳ Registrando comandos Slash na API do Discord...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!),
      { body: commandsDataForAPI }
    );
    console.log('✅ Comandos registrados no servidor com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao registrar comandos:', error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Erro ao executar comando!', ephemeral: true });
      }
    }
  }

  if (interaction.isButton()) {
    const button = buttons.get(interaction.customId);
    if (!button) return;
    try {
      await button.execute(interaction);
    } catch (error) {
      console.error(error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Erro ao processar este botão!', ephemeral: true });
      }
    }
  }
});

if (!process.env.DISCORD_TOKEN) {
  console.error('❌ ERRO FATAL: O DISCORD_TOKEN não foi encontrado no arquivo .env!');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);