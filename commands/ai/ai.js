const { SlashCommandBuilder } = require('discord.js');
const { generateAiResponse } = require('../../services/aiService');
const { getGuildConfig } = require('../../services/firebaseService');
const { getUI, formatUI } = require('../../services/uiService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('Задати питання штучному інтелекту.')
        .setDMPermission(false)
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('Ваше запитання')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const userPrompt = interaction.options.getString('prompt');
        const guildId = interaction.guild.id;
        const ui = await getUI(guildId, 'ai');

        try {
            const guildConfig = await getGuildConfig(guildId);
            const apiKeys = guildConfig.apiKeys || {};

            if (!apiKeys.gemini && !apiKeys.openai && !apiKeys.anthropic) {
                return interaction.editReply(ui.keyMissing);
            }

            const systemPrompt = guildConfig.aiSystemPrompt || "You are a helpful Discord bot.";

            const aiResponse = await generateAiResponse(userPrompt, systemPrompt, apiKeys);

            const safeResponse = aiResponse.length > 2000 
                ? aiResponse.substring(0, 1997) + '...' 
                : aiResponse;

            await interaction.editReply(safeResponse);

        } catch (error) {
            const errorMessage = formatUI(ui.aiError, { error: error.message });
            await interaction.editReply(errorMessage.length > 2000 ? errorMessage.substring(0, 1997) + '...' : errorMessage);
        }
    }
};