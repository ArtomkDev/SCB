const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getData, saveGuildData } = require('../../services/dataService');
const { generateAiResponse } = require('../../services/aiService');
const { defaultUI, getUI, formatUI } = require('../../services/uiService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ui-personalize')
        .setDescription('Переписати весь інтерфейс бота під поточний характер ШІ')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const guildId = interaction.guild.id;

        try {
            const data = getData(guildId);
            const apiKeys = data.config?.apiKeys || {};
            const aiUI = await getUI(guildId, 'ai');

            if (!apiKeys.gemini && !apiKeys.openai && !apiKeys.anthropic && !apiKeys.openrouter) {
                return interaction.editReply(aiUI.keyMissing);
            }

            if (!data.config.aiSystemPrompt) {
                return interaction.editReply(aiUI.promptMissing);
            }

            const prompt = `Rewrite all string values in the following JSON object to strictly match this persona/character: "${data.config.aiSystemPrompt}". Keep the exact same JSON keys and nested structure. Do not alter any placeholders inside curly braces like {user}, {guild}, {target}, or {error}. Return ONLY a valid JSON object without any additional text, markdown formatting, or code blocks.\n\n${JSON.stringify(defaultUI)}`;
            const systemPrompt = "You are a JSON data generator. Return only raw, valid JSON.";
            
            const response = await generateAiResponse(prompt, systemPrompt, apiKeys);
            const cleanJson = response.replace(/^```(json)?\s*/i, '').replace(/\s*```$/i, '').trim();
            const customUI = JSON.parse(cleanJson);

            data.config.customUI = customUI;
            
            data.dirty.config = true; 
            await saveGuildData(guildId);
            
            const updatedUI = await getUI(guildId, 'ai');
            await interaction.editReply(updatedUI.personalizeSuccess);

        } catch (error) {
            const aiUI = await getUI(guildId, 'ai');
            await interaction.editReply(formatUI(aiUI.personalizeError, { error: error.message }));
        }
    }
};