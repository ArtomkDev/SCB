const { SlashCommandBuilder } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../../services/firebaseService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong and tracks usage per server!'),
    
    async execute(interaction) {
        await interaction.deferReply();

        const guildId = interaction.guildId;
        const config = await getGuildConfig(guildId);
        
        const currentUsage = config.pingUsage || 0;
        const newUsage = currentUsage + 1;

        await updateGuildConfig(guildId, { pingUsage: newUsage });

        await interaction.editReply(`Pong! Цей сервер викликав команду ping ${newUsage} разів.`);
    },
};