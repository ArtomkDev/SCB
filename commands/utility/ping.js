const { SlashCommandBuilder } = require('discord.js');
const { startCall } = require('../../services/pingLoopService');
const { getUI } = require('../../services/uiService');

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
        if (!interaction.inGuild()) return;

        await interaction.deferReply();
        const targetUser = interaction.options.getUser('target');
        const ui = await getUI(interaction.guild.id, 'ping');

        if (targetUser.bot) {
            return interaction.editReply(ui.botError);
        }
        if (targetUser.id === interaction.user.id) {
            return interaction.editReply(ui.selfError);
        }

        const guildName = interaction.guild ? interaction.guild.name : 'Unknown';
        
        const result = await startCall(interaction, targetUser, guildName, ui);

        if (!result.success && result.reason === 'ALREADY_CALLING') {
            return interaction.editReply(ui.alreadyCalling); 
        }
    }
};