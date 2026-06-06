const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getData, saveGuildData } = require('../../services/dataService');
const { getUI, formatUI } = require('../../services/uiService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ui-reset')
        .setDescription('Повернути стандартний інтерфейс бота')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const guildId = interaction.guild.id;
        const aiUI = await getUI(guildId, 'ai');

        try {
            const data = getData(guildId);
            data.config.customUI = null;
            
            data.dirty.config = true; 
            await saveGuildData(guildId);

            await interaction.editReply(aiUI.resetSuccess);
        } catch (error) {
            await interaction.editReply(formatUI(aiUI.resetError, { error: error.message }));
        }
    }
};