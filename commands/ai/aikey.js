const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getData, saveGuildData } = require('../../services/dataService');
const { getUI, formatUI } = require('../../services/uiService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aikey')
        .setDescription('Налаштувати API ключі для штучного інтелекту на цьому сервері.')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('provider')
                .setDescription('Оберіть провайдера')
                .setRequired(true)
                .addChoices(
                    { name: 'Gemini (Google)', value: 'gemini' },
                    { name: 'GPT (OpenAI)', value: 'openai' },
                    { name: 'Claude (Anthropic)', value: 'anthropic' }
                )
        )
        .addStringOption(option =>
            option.setName('key')
                .setDescription('Ваш API ключ')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const provider = interaction.options.getString('provider');
        const key = interaction.options.getString('key');
        const guildId = interaction.guild.id;
        const ui = await getUI(guildId, 'ai');

        try {
            const data = getData(guildId);
            if (!data.config.apiKeys) data.config.apiKeys = {};
            data.config.apiKeys[provider] = key;
            
            data.dirty.config = true; 
            await saveGuildData(guildId);

            await interaction.editReply(formatUI(ui.keySaved, { provider }));
        } catch (error) {
            await interaction.editReply(ui.keySaveError);
        }
    }
};