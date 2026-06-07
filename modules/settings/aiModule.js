const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getData, saveGuildData } = require('../../services/dataService');
const { getUI, formatUI } = require('../../services/uiService');

module.exports = {
    async renderMenu(interaction) {
        const guildId = interaction.guild.id;
        const data = getData(guildId);
        const ui = await getUI(guildId, 'settings');
        
        const promptText = data.config.aiSystemPrompt || ui.aiNotSet;
        const chanceVal = data.config.aiRandomChance || 0;

        const embed = new EmbedBuilder()
            .setTitle(ui.aiTitle)
            .setDescription(`**${ui.aiPromptLabel}**\n\`\`\`text\n${promptText}\n\`\`\`\n**${ui.aiChanceLabel}** ${chanceVal}%`)
            .setColor('#3498db');
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('settings_ai_prompt').setLabel(ui.aiChangePromptBtn).setStyle(ButtonStyle.Primary).setEmoji('📝'),
            new ButtonBuilder().setCustomId('settings_ai_chance').setLabel(ui.aiChanceBtn).setStyle(ButtonStyle.Secondary).setEmoji('🎲')
        );

        await interaction.update({ embeds: [embed], components: [interaction.message.components[0], row] });
    },

    async handleAction(interaction) {
        const guildId = interaction.guild.id;
        const data = getData(guildId);
        const uiAi = await getUI(guildId, 'ai');
        const uiSettings = await getUI(guildId, 'settings');

        if (interaction.customId === 'settings_ai_prompt') {
            const modal = new ModalBuilder()
                .setCustomId('settings_ai_modal_prompt')
                .setTitle(uiSettings.aiModalPromptTitle);
            
            const input = new TextInputBuilder()
                .setCustomId('prompt_val')
                .setLabel(uiSettings.aiModalPromptLabel)
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setValue(data.config.aiSystemPrompt || '');
                
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        } 
        else if (interaction.customId === 'settings_ai_modal_prompt') {
            const newPrompt = interaction.fields.getTextInputValue('prompt_val');
            data.config.aiSystemPrompt = newPrompt;
            data.dirty.config = true;
            await saveGuildData(guildId);
            
            const embed = new EmbedBuilder()
                .setTitle(uiSettings.aiTitle)
                .setDescription(`**${uiSettings.aiPromptLabel}**\n\`\`\`text\n${newPrompt}\n\`\`\`\n**${uiSettings.aiChanceLabel}** ${data.config.aiRandomChance || 0}%`)
                .setColor('#3498db');

            await interaction.update({ embeds: [embed] });
            await interaction.followUp({ content: formatUI(uiAi.promptSaved, { prompt: newPrompt }), ephemeral: true });
        }
        else if (interaction.customId === 'settings_ai_chance') {
            const modal = new ModalBuilder()
                .setCustomId('settings_ai_modal_chance')
                .setTitle(uiSettings.aiModalChanceTitle);
            
            const input = new TextInputBuilder()
                .setCustomId('chance_val')
                .setLabel(uiSettings.aiModalChanceLabel)
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue((data.config.aiRandomChance || 0).toString());
                
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }
        else if (interaction.customId === 'settings_ai_modal_chance') {
            const chanceStr = interaction.fields.getTextInputValue('chance_val');
            const percent = parseInt(chanceStr, 10);

            if (isNaN(percent) || percent < 0 || percent > 100) {
                return interaction.reply({ content: uiSettings.aiChanceError, ephemeral: true });
            }

            data.config.aiRandomChance = percent;
            data.dirty.config = true;
            await saveGuildData(guildId);
            
            const promptText = data.config.aiSystemPrompt || uiSettings.aiNotSet;

            const embed = new EmbedBuilder()
                .setTitle(uiSettings.aiTitle)
                .setDescription(`**${uiSettings.aiPromptLabel}**\n\`\`\`text\n${promptText}\n\`\`\`\n**${uiSettings.aiChanceLabel}** ${percent}%`)
                .setColor('#3498db');

            await interaction.update({ embeds: [embed] });
            await interaction.followUp({ content: formatUI(uiAi.chanceSet, { percent }), ephemeral: true });
        }
    }
};