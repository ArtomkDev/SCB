const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getUI } = require('../../services/uiService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Центр налаштувань бота')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const ui = await getUI(guildId, 'settings');

        const embed = new EmbedBuilder()
            .setTitle(ui.title)
            .setDescription(ui.description)
            .setColor('#2b2d31');

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('settings_category')
                .setPlaceholder(ui.description)
                .addOptions([
                    { label: ui.catKeys, value: 'settings_keys', emoji: '🔑' },
                    { label: ui.catAi, value: 'settings_ai', emoji: '🤖' },
                    { label: ui.catUi, value: 'settings_ui', emoji: '🎨' }
                ])
        );

        await interaction.reply({ embeds: [embed], components: [menu], ephemeral: true });
    }
};