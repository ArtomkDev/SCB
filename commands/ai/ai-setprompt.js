const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../services/firebaseService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai-setprompt')
        .setDescription('Встановити системний промпт (характер) для ШІ на цьому сервері')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) 
        .addStringOption(option => 
            option.setName('prompt')
                .setDescription('Як ШІ має відповідати? (напр: "Ти злий пірат", "Ти турботлива мама")')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        if (!interaction.inGuild()) return;

        const promptText = interaction.options.getString('prompt');
        const guildId = interaction.guild.id;

        await interaction.deferReply({ ephemeral: true });

        try {
            await updateGuildConfig(guildId, { aiSystemPrompt: promptText });
            await interaction.editReply(`✅ **Успішно!** Характер ШІ для цього сервера оновлено.\nПоточний промпт: \`${promptText}\``);
        } catch (error) {
            console.error(`[COMMAND ERROR] /ai-setprompt failed on guild ${guildId}:`, error);
            await interaction.editReply('❌ Виникла помилка при збереженні промпту в базу даних.');
        }
    }
};