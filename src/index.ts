import { ActivityType, ChannelType, Client, Events, GatewayIntentBits, REST, Routes, SlashCommandBuilder, TextChannel } from 'discord.js';
import { config } from 'dotenv';
import { AnimeTiddies } from './anime.js';
import { DoGoogleThing } from './google.js';
config();

const errMessages = ["I don't understand; try reformulating your question", "Sorry, I don't understand. Try asking a different question.", "I'm not sure what you mean."];

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

// Start Discord Bot
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);

    // Set status to "–wait this isn't Google"
    client.user?.setActivity('–wait this isn\'t Google');

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
        Routes.applicationCommands(client.application!.id),
        {
            body: [
                new SlashCommandBuilder()
                    .setName('google')
                    .setDescription('Talk to Google Assistant')
                    .addStringOption(option =>
                        option.setName('query')
                            .setDescription('What you want to ask Google')
                            .setRequired(true))
                    .toJSON(),
            ]
        },
    );
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isCommand()) return;
    if (interaction.isChatInputCommand() && interaction.commandName === 'google') {
        interaction.deferReply();
        let reply: string;
        if (interaction.options.getString('query', true).toLowerCase().includes('anime tiddies') && ((interaction.channel as TextChannel | null)?.nsfw || !interaction.guildId)) {
            reply = await AnimeTiddies(client);
        } else {
            reply = await DoGoogleThing(interaction)
                .then(r => r || errMessages[Math.floor(Math.random() * errMessages.length)])
                .catch(e => { console.error(e); return 'Error'; });
        }
        await interaction.editReply(reply);
    }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN!);