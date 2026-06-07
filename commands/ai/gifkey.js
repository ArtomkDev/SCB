const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getData, saveGuildData } = require('../../services/dataService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gifkey')
        .setDescription('Налаштувати API ключ Giphy для ШІ.')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('key')
                .setDescription('Ваш API ключ Giphy')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const key = interaction.options.getString('key');
        const guildId = interaction.guild.id;

        try {
            const data = getData(guildId);
            if (!data.config.apiKeys) data.config.apiKeys = {};
            data.config.apiKeys.giphy = key;
            
            data.dirty.config = true; 
            await saveGuildData(guildId);

            await interaction.editReply('✅ Ключ Giphy успішно збережено!');
        } catch (error) {
            await interaction.editReply('❌ Помилка збереження ключа.');
        }
    }
};