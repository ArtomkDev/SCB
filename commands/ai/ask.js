const { SlashCommandBuilder } = require('discord.js');
const { generateAiResponse } = require('../../services/aiService');
const { getGuildConfig } = require('../../services/firebaseService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Задати питання штучному інтелекту.')
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('Ваше запитання')
                .setRequired(true)),
                
    async execute(interaction) {
        await interaction.deferReply();

        const userPrompt = interaction.options.getString('prompt');
        const guildId = interaction.guildId;

        try {
            const guildConfig = await getGuildConfig(guildId);
            const systemPrompt = guildConfig.systemPrompt || "You are a helpful Discord bot.";

            const aiResponse = await generateAiResponse(userPrompt, systemPrompt);

            const safeResponse = aiResponse.length > 2000 
                ? aiResponse.substring(0, 1997) + '...' 
                : aiResponse;

            await interaction.editReply(safeResponse);
            
        } catch (error) {
            console.error(`[COMMAND ERROR] /ask execution failed in guild ${guildId}:`, error);
            await interaction.editReply('❌ Вибачте, сталася помилка під час генерації відповіді. Всі AI провайдери наразі недоступні.');
        }
    },
};