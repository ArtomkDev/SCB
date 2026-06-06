const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getData, saveGuildData } = require('../../services/dataService');
const { getUI, formatUI } = require('../../services/uiService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aichance')
        .setDescription('Налаштувати шанс (у відсотках), з яким бот випадково відповідатиме на повідомлення.')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addIntegerOption(option => 
            option.setName('percent')
                .setDescription('Шанс від 0 до 100')
                .setMinValue(0)
                .setMaxValue(100)
                .setRequired(true)
        ),
    
    async execute(interaction) {
        const percent = interaction.options.getInteger('percent');
        const guildId = interaction.guild.id;
        const ui = await getUI(guildId, 'ai');

        const data = getData(guildId);
        if (!data.config) data.config = {};
        data.config.aiRandomChance = percent;
        
        data.dirty.config = true; 
        
        await saveGuildData(guildId);

        await interaction.reply({ content: formatUI(ui.chanceSet, { percent }), ephemeral: true });
    }
};