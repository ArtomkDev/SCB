require('dotenv').config();
const { Client, Collection, GatewayIntentBits } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.commands = new Collection();

require('./handlers/commandHandler')(client);
require('./handlers/eventHandler')(client);

client.login(process.env.DISCORD_TOKEN);

const gracefulShutdown = async () => {
    console.log('\nОтримано сигнал вимкнення. Зберігаю дані з оперативної пам\'яті в Firebase...');
    const { saveGuildData } = require('./services/dataService');
    
    for (const guild of client.guilds.cache.values()) {
        await saveGuildData(guild.id, guild.name).catch(console.error);
    }
    
    console.log('Збереження завершено. Вимикаюсь.');
    process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);