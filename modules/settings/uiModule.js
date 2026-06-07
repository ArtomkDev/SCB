const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getData, saveGuildData } = require('../../services/dataService');
const { generateAiResponse } = require('../../services/aiService');
const { defaultUI, getUI, formatUI } = require('../../services/uiService');

module.exports = {
    async renderMenu(interaction) {
        const guildId = interaction.guild.id;
        const ui = await getUI(guildId, 'settings');

        const embed = new EmbedBuilder()
            .setTitle(ui.uiTitle)
            .setDescription(ui.uiDesc)
            .setColor('#e74c3c');
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('settings_ui_personalize').setLabel(ui.uiPersonalizeBtn).setStyle(ButtonStyle.Success).setEmoji('✨'),
            new ButtonBuilder().setCustomId('settings_ui_reset').setLabel(ui.uiResetBtn).setStyle(ButtonStyle.Danger).setEmoji('🗑️')
        );

        await interaction.update({ embeds: [embed], components: [interaction.message.components[0], row] });
    },

    async handleAction(interaction) {
        const guildId = interaction.guild.id;
        const data = getData(guildId);
        const aiUI = await getUI(guildId, 'ai');

        if (interaction.customId === 'settings_ui_personalize') {
            await interaction.deferReply({ ephemeral: true });
            
            const apiKeys = data.config?.apiKeys || {};

            if (!apiKeys.gemini && !apiKeys.openai && !apiKeys.anthropic && !apiKeys.openrouter) {
                return interaction.editReply(aiUI.keyMissing);
            }

            if (!data.config.aiSystemPrompt) {
                return interaction.editReply(aiUI.promptMissing);
            }

            try {
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
                await interaction.editReply(formatUI(aiUI.personalizeError, { error: error.message }));
            }
        }
        else if (interaction.customId === 'settings_ui_reset') {
            await interaction.deferReply({ ephemeral: true });

            try {
                data.config.customUI = null;
                data.dirty.config = true; 
                await saveGuildData(guildId);

                await interaction.editReply(aiUI.resetSuccess);
            } catch (error) {
                await interaction.editReply(formatUI(aiUI.resetError, { error: error.message }));
            }
        }
    }
};