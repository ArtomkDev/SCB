const { SlashCommandBuilder } = require('discord.js');
const { getData, saveGuildData } = require('../../services/dataService');
const { updateGuildSessions } = require('../../services/sessionManager');
const { getUI } = require('../../services/uiService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sessions')
        .setDescription('Показати активні ігрові сесії на сервері'),
    
    async execute(interaction) {
        const guildId = interaction.guild?.id;
        const ui = guildId ? await getUI(guildId, 'sessions') : await getUI('default', 'sessions');

        if (!interaction.inGuild()) return interaction.reply({ content: ui.guildOnly, ephemeral: true });
        await interaction.deferReply();
        
        const data = getData(guildId);
        await interaction.editReply(ui.loading);
        const replyMessage = await interaction.fetchReply();

        data.sessions.lastMessage = {
            channelId: replyMessage.channelId,
            messageId: replyMessage.id
        };
        await saveGuildData(guildId);
        updateGuildSessions(interaction.client, guildId);
    }
};