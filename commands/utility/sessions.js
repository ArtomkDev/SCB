const { SlashCommandBuilder } = require('discord.js');
const { getSessionsState, saveSessionsState } = require('../../services/firebaseService');
const { updateGuildSessions } = require('../../services/sessionManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sessions')
        .setDescription('Показати активні ігрові сесії на сервері'),
    
    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Ця команда працює тільки на серверах!', ephemeral: true });
        }

        await interaction.deferReply();

        const guildId = interaction.guild.id;
        const client = interaction.client;

        let state = client.gameSessions?.get(guildId);
        if (!state) {
            state = await getSessionsState(guildId);
            if (!state.games) state.games = {};
            if (!client.gameSessions) client.gameSessions = new Map();
            client.gameSessions.set(guildId, state);
        }

        await interaction.editReply('Завантаження сесій...');
        const replyMessage = await interaction.fetchReply();

        state.lastMessage = {
            channelId: replyMessage.channelId,
            messageId: replyMessage.id
        };

        await saveSessionsState(guildId, state);
        
        updateGuildSessions(client, guildId);
    }
};