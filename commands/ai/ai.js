const { SlashCommandBuilder } = require('discord.js');
const { generateAiResponse } = require('../../services/aiService');
const { getGuildConfig, updateGuildConfig } = require('../../services/firebaseService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('Задати питання штучному інтелекту')
        .setDMPermission(false)
        .addStringOption(option => 
            option.setName('question')
                .setDescription('Ваше питання до ШІ')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: '❌ Ця команда працює тільки на серверах!', ephemeral: true });
        }

        await interaction.deferReply();

        const guildId = interaction.guild.id;
        const question = interaction.options.getString('question');

        try {
            const guildConfig = await getGuildConfig(guildId);

            if (guildConfig.aiEnabled === false) {
                return interaction.editReply({ content: '❌ Адміністратор цього сервера вимкнув використання ШІ.' });
            }

            if (!guildConfig.aiSystemPrompt) {
                return interaction.editReply({ 
                    content: '⚠️ **ШІ ще не налаштовано!**\nАдміністратор сервера має встановити характер бота за допомогою команди `/ai-setprompt`.' 
                });
            }

            const answer = await generateAiResponse(question, guildConfig.aiSystemPrompt);

            const currentUsage = guildConfig.aiUsageCount || 0;
            await updateGuildConfig(guildId, { aiUsageCount: currentUsage + 1 });

            const responseText = `**Питання:** ${question}\n**Відповідь:** ${answer}`;

            if (responseText.length > 2000) {
                await interaction.editReply(responseText.substring(0, 1997) + '...');
            } else {
                await interaction.editReply(responseText);
            }

        } catch (error) {
            console.error(`[COMMAND ERROR] /ai failed on guild ${guildId}:`, error);
            await interaction.editReply({ content: '❌ Виникла помилка при обробці вашого запиту до ШІ. Спробуйте пізніше.' });
        }
    }
};