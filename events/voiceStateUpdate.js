const { Events } = require('discord.js');
const { handleVoiceState } = require('../services/voiceService');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState, client) {
        if (newState.member.user.bot) return;

        const guildId = newState.guild.id;
        const userId = newState.member.id;
        const username = newState.member.displayName;

        if (!oldState.channelId && newState.channelId) {
            await handleVoiceState(guildId, userId, username, 'join');
        }
        else if (oldState.channelId && !newState.channelId) {
            await handleVoiceState(guildId, userId, username, 'leave');
        }
    },
};