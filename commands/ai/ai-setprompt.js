const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../services/firebaseService');
const { getUI, formatUI } = require('../../services/uiService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai-setprompt')
        .setDescription('Встановити системний промпт (характер) для ШІ на цьому сервері')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) 
        .addStringOption(option => 
            option.setName('prompt')
                .setDescription('Як ШІ має відповідати? (напр: "Ти злий пірат", "Ти турботлива мама")')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        if (!interaction.inGuild()) return;

        const promptText = interaction.options.getString('prompt');
        const guildId = interaction.guild.id;
        
        await interaction.deferReply({ ephemeral: true });
        
        const ui = await getUI(guildId, 'ai');

        try {
            await updateGuildConfig(guildId, { aiSystemPrompt: promptText });
            await interaction.editReply(formatUI(ui.promptSaved, { prompt: promptText }));
        } catch (error) {
            await interaction.editReply(ui.promptSaveError);
        }
    }
};