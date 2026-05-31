const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../services/firebaseService');
const { getUI } = require('../../services/uiService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ui-reset')
        .setDescription('Повернути стандартний інтерфейс бота')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const guildId = interaction.guild.id;

        try {
            await updateGuildConfig(guildId, { customUI: null });
            const aiUI = await getUI(guildId, 'ai');
            await interaction.editReply(aiUI.resetSuccess);
        } catch (error) {
            await interaction.editReply(`Error: ${error.message}`);
        }
    }
};