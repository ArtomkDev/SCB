const { SlashCommandBuilder } = require('discord.js');
const { getSessionsState, saveSessionsState } = require('../../services/firebaseService');
const { updateGuildSessions } = require('../../services/sessionManager');
const { getUI } = require('../../services/uiService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sessions')
        .setDescription('Показати активні ігрові сесії на сервері'),
    
    async execute(interaction) {
        const guildId = interaction.guild?.id;
        const ui = guildId ? await getUI(guildId, 'sessions') : await getUI('default', 'sessions');

        if (!interaction.inGuild()) {
            return interaction.reply({ content: ui.guildOnly, ephemeral: true });
        }

        await interaction.deferReply();

        const client = interaction.client;

        let state = client.gameSessions?.get(guildId);
        if (!state) {
            state = await getSessionsState(guildId);
            if (!state.games) state.games = {};
            if (!client.gameSessions) client.gameSessions = new Map();
            client.gameSessions.set(guildId, state);
        }

        await interaction.editReply(ui.loading);
        const replyMessage = await interaction.fetchReply();

        state.lastMessage = {
            channelId: replyMessage.channelId,
            messageId: replyMessage.id
        };

        await saveSessionsState(guildId, state);
        
        updateGuildSessions(client, guildId);
    }
};