const { Events } = require('discord.js');
const { updateGuildSessions } = require('../services/sessionManager');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        client.gameSessions = new Map();

        setInterval(() => {
            for (const guild of client.guilds.cache.values()) {
                updateGuildSessions(client, guild.id);
            }
        }, 60000);
    },
};