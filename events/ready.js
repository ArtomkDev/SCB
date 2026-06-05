const { Events } = require('discord.js');
const { updateGuildSessions } = require('../services/sessionManager');
const { initializeData, saveGuildData } = require('../services/dataService');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        await initializeData(client);

        setInterval(() => {
            for (const guild of client.guilds.cache.values()) {
                updateGuildSessions(client, guild.id);
            }
        }, 60000);

        setInterval(async () => {
            for (const guild of client.guilds.cache.values()) {
                // Передаємо guild.name сюди
                await saveGuildData(guild.id, guild.name);
            }
        }, 600000);
    },
};