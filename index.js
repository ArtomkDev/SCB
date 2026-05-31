require('dotenv').config();
const { Client, Collection, GatewayIntentBits } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds] 
});

client.commands = new Collection();

require('./handlers/commandHandler')(client);
require('./handlers/eventHandler')(client);

client.login(process.env.DISCORD_TOKEN);