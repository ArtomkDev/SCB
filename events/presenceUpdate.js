const { Events } = require('discord.js');
const { updateGuildSessions } = require('../services/sessionManager');

module.exports = {
    name: Events.PresenceUpdate,
    async execute(oldPresence, newPresence) {
        if (!newPresence.guild) return;
        updateGuildSessions(newPresence.client, newPresence.guild.id);
    },
};