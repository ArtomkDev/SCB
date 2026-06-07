const { SlashCommandBuilder } = require('discord.js');
const { generateAiResponse } = require('../../services/aiService');
const { getData } = require('../../services/dataService');
const { getUI, formatUI } = require('../../services/uiService');
const { getGifUrl } = require('../../services/gifService');

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
            const apiKeys = data.config?.apiKeys || {};
            const baseSystemPrompt = data.config?.aiSystemPrompt || "You are a helpful Discord bot.";
            const gifInstruction = `\n\n[КРИТИЧНА СИСТЕМНА ВКАЗІВКА]: Якщо за твоїм поточним характером доречно використати GIF-анімацію для емоції чи реакції, ти ПОВИНЕН вставити в текст тег у форматі [GIF: ключові слова англійською]. Наприклад: [GIF: smug anime face].`;
            const systemPrompt = baseSystemPrompt + gifInstruction;

            if (!apiKeys.gemini && !apiKeys.openai && !apiKeys.anthropic && !apiKeys.openrouter) {
                return interaction.editReply(ui.keyMissing);
            }

            let aiResponse = await generateAiResponse(userPrompt, systemPrompt, apiKeys);
            
            const gifRegex = /\[GIF:\s*(.+?)\]/gi;
            let match;
            let gifLinks = [];

            while ((match = gifRegex.exec(aiResponse)) !== null) {
                const query = match[1];
                const gifUrl = await getGifUrl(query, apiKeys?.giphy); 
                
                if (gifUrl) {
                    gifLinks.push(gifUrl);
                }
            }

            aiResponse = aiResponse.replace(/\[GIF:\s*(.+?)\]/gi, '').trim();

            if (gifLinks.length > 0) {
                 aiResponse += `\n\n${gifLinks.join('\n')}`;
            }

            const safeResponse = aiResponse.length > 2000 ? aiResponse.substring(0, 1997) + '...' : aiResponse.trim();
            await interaction.editReply(safeResponse);
            
        } catch (error) {
            const errorMessage = formatUI(ui.aiError, { error: error.message });
            await interaction.editReply(errorMessage.length > 2000 ? errorMessage.substring(0, 1997) + '...' : errorMessage);
        }
    },
};