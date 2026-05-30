const { SlashCommandBuilder } = require('discord.js');
const { startCall } = require('../../services/pingLoopService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Почати виклик користувача у приватні повідомлення')
        .setDMPermission(false)
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Користувач, якого потрібно викликати')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: '❌ Ей, ця команда працює тільки на серверах!', ephemeral: true });
        }

        await interaction.deferReply();
        const targetUser = interaction.options.getUser('target');

        if (targetUser.bot) {
            return interaction.editReply('❌ Ботам в лічку стукати марно, залиш їх у спокої. 🤖');
        }
        if (targetUser.id === interaction.user.id) {
            return interaction.editReply('❌ Тобі настільки самотньо? Самому собі спамити не можна. 😅');
        }

        const guildName = interaction.guild ? interaction.guild.name : 'одного з серверів';
        
        const result = await startCall(interaction, targetUser, guildName);

        if (!result.success && result.reason === 'ALREADY_CALLING') {
            await interaction.editReply(`⚠️ ${targetUser.toString()} вже і так розривають повідомленнями! Натисни кнопку "Зупинити виклик" на попередньому повідомленні бота.`);
        }
    }
};