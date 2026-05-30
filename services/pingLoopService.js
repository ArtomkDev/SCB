const { Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const activeCalls = new Collection();

const startCall = async (interaction, targetUser, guildName) => {
    if (activeCalls.has(targetUser.id)) {
        return { success: false, reason: 'ALREADY_CALLING' };
    }

    const stopButton = new ButtonBuilder()
        .setCustomId(`stop_ping_${targetUser.id}`)
        .setLabel('Зупинити виклик')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(stopButton);

    const initialMessage = await interaction.editReply({
        content: `✅ Погнали! Почали стукати до ${targetUser.toString()}.`,
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
        } catch (error) {
            console.error('Не вдалося оновити повідомлення виклику:', error);
        }
    };

    try {
        await targetUser.send(`👋 Ей! На сервері **${guildName}** тебе дуже терміново шукає ${interaction.user.toString()}! Залітай туди.`);
        count++;
    } catch (error) {
        await interaction.editReply({
            content: `❌ Не вийшло достукатись до ${targetUser.toString()} — у нього закрита лічка.`,
            components: []
        });
        return { success: true };
    }

    const intervalId = setInterval(async () => {
        if (count >= MAX_PINGS) {
            await cleanupCall(`⌛ Виклик ${targetUser.toString()} завершено (досягнуто ліміт у 10 повідомлень).`);
            return;
        }

        try {
            await targetUser.send(`👋 Ей! На сервері **${guildName}** тебе дуже терміново шукає ${interaction.user.toString()}! Залітай туди.`);
            count++;
        } catch (error) {
            await cleanupCall(`❌ Виклик перервано: у ${targetUser.toString()} закрилися приватні повідомлення.`);
        }
    }, PING_INTERVAL_MS);

    const collector = initialMessage.createMessageComponentCollector({
        filter: (i) => i.customId === `stop_ping_${targetUser.id}`,
        time: MAX_PINGS * PING_INTERVAL_MS + 5000 
    });

    collector.on('collect', async (buttonInteraction) => {
        await buttonInteraction.deferUpdate();
        
        await cleanupCall(`🛑 ${buttonInteraction.user.toString()} змилувався і зупинив спам для ${targetUser.toString()}. Спокій відновлено.`);
    });

    // Зберігаємо в пам'ять
    activeCalls.set(targetUser.id, { intervalId, collector });
    return { success: true };
};

module.exports = {
    startCall
};