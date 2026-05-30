require('dotenv').config();
const { Client, Collection, GatewayIntentBits } = require('discord.js');

// Explicit intent declaration is required by Discord API
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds] 
});

client.commands = new Collection();

require('./handlers/commandHandler')(client);
require('./handlers/eventHandler')(client);

client.login(process.env.DISCORD_TOKEN);