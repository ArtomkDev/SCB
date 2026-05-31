const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../services/firebaseService');

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

        try {
            await updateGuildConfig(guildId, {
                apiKeys: {
                    [provider]: key
                }
            });

            await interaction.editReply(`✅ Ключ для **${provider}** успішно збережено в базі даних сервера!`);
        } catch (error) {
            console.error(`Failed to set AI key for guild ${guildId}:`, error);
            await interaction.editReply('❌ Помилка збереження ключа в базу даних.');
        }
    }
};