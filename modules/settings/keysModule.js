const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getData, saveGuildData } = require('../../services/dataService');
const { getUI, formatUI } = require('../../services/uiService');

module.exports = {
    async renderMenu(interaction) {
        const guildId = interaction.guild.id;
        const ui = await getUI(guildId, 'settings');

        const embed = new EmbedBuilder()
            .setTitle(ui.keysTitle)
            .setDescription(ui.keysDesc)
            .setColor('#f1c40f');
        
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('settings_key_gemini').setLabel('Gemini').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('settings_key_openai').setLabel('OpenAI').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('settings_key_anthropic').setLabel('Claude').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('settings_key_openrouter').setLabel('OpenRouter').setStyle(ButtonStyle.Primary)
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('settings_key_giphy').setLabel('Giphy (GIFs)').setStyle(ButtonStyle.Secondary)
        );

        await interaction.update({ embeds: [embed], components: [interaction.message.components[0], row1, row2] });
    },

    async handleAction(interaction) {
        const guildId = interaction.guild.id;
        const data = getData(guildId);
        const uiAi = await getUI(guildId, 'ai');
        const uiSettings = await getUI(guildId, 'settings');

        if (interaction.customId.startsWith('settings_key_modal_')) {
            const provider = interaction.customId.replace('settings_key_modal_', '');
            const key = interaction.fields.getTextInputValue('key_input');
            
            if (!data.config.apiKeys) data.config.apiKeys = {};
            data.config.apiKeys[provider] = key;
            data.dirty.config = true;
            await saveGuildData(guildId);
            
            await interaction.reply({ 
                content: provider === 'giphy' ? uiSettings.keysGiphySuccess : formatUI(uiAi.keySaved, { provider: provider.toUpperCase() }), 
                ephemeral: true 
            });
        } else if (interaction.customId.startsWith('settings_key_')) {
            const provider = interaction.customId.replace('settings_key_', '');
            
            const modal = new ModalBuilder()
                .setCustomId(`settings_key_modal_${provider}`)
                .setTitle(formatUI(uiSettings.keysModalTitle, { provider: provider.toUpperCase() }));
            
            const input = new TextInputBuilder()
                .setCustomId('key_input')
                .setLabel(uiSettings.keysModalLabel)
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
                
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }
    }
};