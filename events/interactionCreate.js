const { Events } = require('discord.js');
const { getUI } = require('../services/uiService');
const settingsRouter = require('../modules/settings/router'); 

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;

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
        else if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('settings_') || interaction.customId.startsWith('ui_')) {
                try {
                    await settingsRouter.handle(interaction);
                } catch (error) {
                    const guildId = interaction.guild?.id;
                    const uiSystem = guildId ? await getUI(guildId, 'system') : { error: 'Виникла помилка при обробці.' };

                    if (interaction.deferred || interaction.replied) {
                         await interaction.followUp({ content: uiSystem.error, ephemeral: true }).catch(() => {});
                    } else {
                         await interaction.reply({ content: uiSystem.error, ephemeral: true }).catch(() => {});
                    }
                }
            }
        }
    },
};