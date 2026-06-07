const { Events } = require('discord.js');
const { handleVoiceState } = require('../services/voiceService');

module.exports = {
    name: Events.VoiceStateUpdate,
    execute(oldState, newState, client) {
        if (newState.member.user.bot) return;

        const guildId = newState.guild.id;
        const userId = newState.member.id;
        const username = newState.member.displayName;

        const joinedVoice = !oldState.channelId && newState.channelId;
        const leftVoice = oldState.channelId && !newState.channelId;
        
        const startedStreaming = !oldState.streaming && newState.streaming;
        const stoppedStreaming = oldState.streaming && !newState.streaming;

        if (joinedVoice) {
            handleVoiceState(guildId, userId, username, 'join');
            if (newState.streaming) handleVoiceState(guildId, userId, username, 'start_stream');
        } else if (leftVoice) {
            if (oldState.streaming) handleVoiceState(guildId, userId, username, 'stop_stream');
            handleVoiceState(guildId, userId, username, 'leave');
        } else {
            if (startedStreaming) handleVoiceState(guildId, userId, username, 'start_stream');
            if (stoppedStreaming) handleVoiceState(guildId, userId, username, 'stop_stream');
        }
    },
};