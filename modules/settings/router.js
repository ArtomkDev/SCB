const aiModule = require('./aiModule');
const keysModule = require('./keysModule');
const uiModule = require('./uiModule');

module.exports = {
    async handle(interaction) {
        const { customId } = interaction;

        if (interaction.isStringSelectMenu() && customId === 'settings_category') {
            const category = interaction.values[0];
            if (category === 'settings_keys') return keysModule.renderMenu(interaction);
            if (category === 'settings_ai') return aiModule.renderMenu(interaction);
            if (category === 'settings_ui') return uiModule.renderMenu(interaction);
        }

        if (customId.startsWith('settings_key_')) return keysModule.handleAction(interaction);
        if (customId.startsWith('settings_ai_')) return aiModule.handleAction(interaction);
        if (customId.startsWith('settings_ui_')) return uiModule.handleAction(interaction);
    }
};