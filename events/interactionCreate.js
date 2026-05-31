const { Events } = require('discord.js');
const { getUI } = require('../services/uiService');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                const guildId = interaction.guild?.id;
                let errorMessage = 'There was an error while executing this command!';
                
                if (guildId) {
                    const ui = await getUI(guildId, 'system');
                    errorMessage = ui.error;
                }

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            }
        }
        else if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) return;

            try {
                await command.autocomplete(interaction);
            } catch (error) {}
        }
    },
};