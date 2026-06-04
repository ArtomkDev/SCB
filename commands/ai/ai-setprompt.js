const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getData, saveGuildData } = require('../../services/dataService');
const { getUI, formatUI } = require('../../services/uiService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai-setprompt')
        .setDescription('Встановити системний промпт (характер) для ШІ на цьому сервері')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) 
        .addStringOption(option => 
            option.setName('prompt')
                .setDescription('Як ШІ має відповідати?')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        if (!interaction.inGuild()) return;

        const promptText = interaction.options.getString('prompt');
        const guildId = interaction.guild.id;
        
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const ui = await getUI(guildId, 'ai');

        try {
            const data = getData(guildId);
            data.config.aiSystemPrompt = promptText;
            await saveGuildData(guildId);

            await interaction.editReply(formatUI(ui.promptSaved, { prompt: promptText }));
        } catch (error) {
            await interaction.editReply(ui.promptSaveError);
        }
    }
};