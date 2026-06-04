const { SlashCommandBuilder } = require('discord.js');
const { generateAiResponse } = require('../../services/aiService');
const { getData } = require('../../services/dataService');
const { getUI } = require('../../services/uiService');

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
        const guildId = interaction.guild.id;
        const ui = await getUI(guildId, 'ai');

        try {
            const data = getData(guildId);
            const systemPrompt = data.config?.systemPrompt || "You are a helpful Discord bot.";

            const aiResponse = await generateAiResponse(userPrompt, systemPrompt);
            const safeResponse = aiResponse.length > 2000 ? aiResponse.substring(0, 1997) + '...' : aiResponse;

            await interaction.editReply(safeResponse);
            
        } catch (error) {
            await interaction.editReply(ui.askError);
        }
    },
};