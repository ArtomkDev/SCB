const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getHallOfFameData, formatTime } = require('../../services/playtimeService');
const { getVoiceHallOfFame } = require('../../services/voiceService');
const { getUI } = require('../../services/uiService');
const { getData, saveGuildData } = require('../../services/dataService');
const { updateGuildSessions } = require('../../services/sessionManager');

const placeEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const medals = ['🥇', '🥈', '🥉'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hall_of_fame')
        .setDescription('Показує статистику та рекорди сервера')
        .setDMPermission(false),
    async execute(interaction) {
        if (!interaction.inGuild()) return;
        
        await interaction.deferReply();
        
        const guildId = interaction.guild.id;
        const client = interaction.client;
        
        let ui;

        try {
            ui = await getUI(guildId, 'halloffame');
            
            if (!ui) {
                ui = {
                    title: "Зал слави", footer: "Статистика", voiceTitle: "Голосові", gamesTitle: "Ігри",
                    voiceStreaksTitle: "Стріки", voiceTimeTitle: "Час в голосових", voiceStreamTitle: "Стріми",
                    empty: "Немає даних", error: "Сталася помилка."
                };
            }

            const gameData = getHallOfFameData(guildId, client) || [];
            
            const voiceData = getVoiceHallOfFame(guildId, client) || { topStreaks: [], topTime: [], topStreams: [] };

            const embed = new EmbedBuilder()
                .setTitle(ui.title || "Зал Слави")
                .setColor('#FFD700')
                .setFooter({ text: ui.footer || "Midnight Statistics" })
                .setTimestamp();

            let voiceDesc = `**${ui.voiceStreaksTitle}**\n`;
            if (voiceData.topStreaks && voiceData.topStreaks.length > 0) {
                voiceData.topStreaks.forEach((user, index) => {
                    const emoji = medals[index] || '🏅';
                    voiceDesc += `${emoji} **${user.username}** — \`${user.currentStreak || 0} дн.\`\n`;
                });
            } else voiceDesc += `*${ui.empty}*\n`;

            voiceDesc += `\n**${ui.voiceTimeTitle}**\n`;
            if (voiceData.topTime && voiceData.topTime.length > 0) {
                voiceData.topTime.forEach((user, index) => {
                    const emoji = medals[index] || '🏅';
                    voiceDesc += `${emoji} **${user.username}** — ⏱️ \`${formatTime(user.totalTime || 0)}\`\n`;
                });
            } else voiceDesc += `*${ui.empty}*\n`;

            voiceDesc += `\n**${ui.voiceStreamTitle}**\n`;
            if (voiceData.topStreams && voiceData.topStreams.length > 0) {
                voiceData.topStreams.forEach((user, index) => {
                    const emoji = medals[index] || '🏅';
                    voiceDesc += `${emoji} **${user.username}** — 📺 \`${formatTime(user.streamTime || 0)}\`\n`;
                });
            } else voiceDesc += `*${ui.empty}*\n`;

            embed.addFields({ name: `\u200B\n${ui.voiceTitle}`, value: voiceDesc, inline: false });

            let gamesDesc = '';
            if (!gameData || gameData.length === 0) {
                gamesDesc = `*${ui.empty}*`;
            } else {
                gameData.forEach((game, gameIndex) => {
                    const gameRankEmoji = placeEmojis[gameIndex] || '🎮'; 
                    gamesDesc += `\n${gameRankEmoji} **${game.gameName || 'Невідома гра'}** — ⏳ \`${formatTime(game.totalTime || 0)}\`\n`;
                    
                    if (game.topPlayers && game.topPlayers.length > 0) {
                        game.topPlayers.forEach((player, pIndex) => {
                            const pEmoji = medals[pIndex] || '🏅';
                            gamesDesc += `└ ${pEmoji} ${player.username} ⏱️ \`${formatTime(player.time || 0)}\`\n`;
                        });
                    }
                });
            }

            embed.addFields({ name: `\u200B\n${ui.gamesTitle}`, value: gamesDesc, inline: false });

            await interaction.editReply({ embeds: [embed] });

            const data = getData(guildId);
            if (data) {
                const replyMessage = await interaction.fetchReply();
                
                if (!data.sessions) data.sessions = {};
                data.sessions.lastHofMessage = { channelId: replyMessage.channelId, messageId: replyMessage.id };

                if (!data.dirty) data.dirty = {};
                data.dirty.sessions = true;
                
                await saveGuildData(guildId);
            }
            
            updateGuildSessions(client, guildId);

        } catch (error) {
            console.error("Помилка генерації Залу Слави:", error);
            
            const errorMsg = (ui && ui.error) ? ui.error : "Виникла помилка під час створення Залу Слави.";
            
            try {
                await interaction.editReply({ content: errorMsg, embeds: [] });
            } catch (e) {
                console.error("Не вдалося надіслати повідомлення про помилку в Discord:", e);
            }
        }
    },
};