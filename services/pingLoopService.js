const { Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { formatUI } = require('./uiService');

const activeCalls = new Collection();

const startCall = async (interaction, targetUser, guildName, ui) => {
    if (activeCalls.has(targetUser.id)) {
        return { success: false, reason: 'ALREADY_CALLING' };
    }

    const stopButton = new ButtonBuilder()
        .setCustomId(`stop_ping_${targetUser.id}`)
        .setLabel('Stop')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(stopButton);

    const initialMessage = await interaction.editReply({
        content: formatUI(ui.started, { user: targetUser.toString() }),
        components: [row]
    });

    let count = 0;
    const MAX_PINGS = 10; 
    const PING_INTERVAL_MS = 3500; 

    const cleanupCall = async (reasonText) => {
        clearInterval(intervalId);
        activeCalls.delete(targetUser.id);
        collector.stop();
        
        try {
            await interaction.editReply({
                content: reasonText,
                components: [] 
            });
        } catch (error) {}
    };

    const dmMessage = formatUI(ui.dmMessage, { guild: guildName, user: interaction.user.toString() });

    try {
        await targetUser.send(dmMessage);
        count++;
    } catch (error) {
        await interaction.editReply({
            content: formatUI(ui.closedDm, { user: targetUser.toString() }),
            components: []
        });
        return { success: true };
    }

    const intervalId = setInterval(async () => {
        if (count >= MAX_PINGS) {
            await cleanupCall(formatUI(ui.limitReached, { user: targetUser.toString() }));
            return;
        }

        try {
            await targetUser.send(dmMessage);
            count++;
        } catch (error) {
            await cleanupCall(formatUI(ui.closedDm, { user: targetUser.toString() }));
        }
    }, PING_INTERVAL_MS);

    const collector = initialMessage.createMessageComponentCollector({
        filter: (i) => i.customId === `stop_ping_${targetUser.id}`,
        time: MAX_PINGS * PING_INTERVAL_MS + 5000 
    });

    collector.on('collect', async (buttonInteraction) => {
        await buttonInteraction.deferUpdate();
        await cleanupCall(formatUI(ui.stoppedByUser, { user: buttonInteraction.user.toString(), target: targetUser.toString() }));
    });

    activeCalls.set(targetUser.id, { intervalId, collector });
    return { success: true };
};

module.exports = { startCall };