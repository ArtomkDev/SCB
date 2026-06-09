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

            const gameData = getHallOfFameData(guildId, client) || [];
            const voiceData = getVoiceHallOfFame(guildId, client) || { topStreaks: [], topTime: [], topStreams: [] };

            const embed = new EmbedBuilder()
                .setTitle(ui.title)
                .setColor('#FFD700')
                .setFooter({ text: ui.footer })
                .setTimestamp();

            let streaksDesc = '';
            if (voiceData.topStreaks && voiceData.topStreaks.length > 0) {
                voiceData.topStreaks.forEach((user, index) => {
                    const emoji = medals[index] || '🏅';
                    streaksDesc += `${emoji} **${user.username}** — \`${user.currentStreak || 0} дн.\`\n`;
                });
            } else streaksDesc = `*${ui.empty}*`;

            let timeDesc = '';
            if (voiceData.topTime && voiceData.topTime.length > 0) {
                voiceData.topTime.forEach((user, index) => {
                    const emoji = medals[index] || '🏅';
                    timeDesc += `${emoji} **${user.username}** — ⏱️ \`${formatTime(user.totalTime || 0)}\`\n`;
                });
            } else timeDesc = `*${ui.empty}*`;

            let streamsDesc = '';
            if (voiceData.topStreams && voiceData.topStreams.length > 0) {
                voiceData.topStreams.forEach((user, index) => {
                    const emoji = medals[index] || '🏅';
                    streamsDesc += `${emoji} **${user.username}** — 📺 \`${formatTime(user.streamTime || 0)}\`\n`;
                });
            } else streamsDesc = `*${ui.empty}*`;

            embed.addFields(
                { name: `\u200B\n🔊 ${ui.voiceTitle}: ${ui.voiceStreaksTitle}`, value: streaksDesc, inline: false },
                { name: `🎙️ ${ui.voiceTimeTitle}`, value: timeDesc, inline: false },
                { name: `📺 ${ui.voiceStreamTitle}`, value: streamsDesc, inline: false }
            );

            if (!gameData || gameData.length === 0) {
                embed.addFields({ name: `\u200B\n🎮 ${ui.gamesTitle}`, value: `*${ui.empty}*`, inline: false });
            } else {
                let gameChunks = [];
                let currentChunk = '';

                gameData.forEach((game, gameIndex) => {
                    const gameRankEmoji = placeEmojis[gameIndex] || '🎮'; 
                    let gameEntry = `\n${gameRankEmoji} **${game.gameName || 'Невідома гра'}** — ⏳ \`${formatTime(game.totalTime || 0)}\`\n`;
                    
                    if (game.topPlayers && game.topPlayers.length > 0) {
                        game.topPlayers.forEach((player, pIndex) => {
                            const pEmoji = medals[pIndex] || '🏅';
                            gameEntry += `└ ${pEmoji} ${player.username} ⏱️ \`${formatTime(player.time || 0)}\`\n`;
                        });
                    }

                    if (currentChunk.length + gameEntry.length > 1000) {
                        gameChunks.push(currentChunk);
                        currentChunk = gameEntry;
                    } else {
                        currentChunk += gameEntry;
                    }
                });

                if (currentChunk.length > 0) {
                    gameChunks.push(currentChunk);
                }

                gameChunks.forEach((chunk, index) => {
                    embed.addFields({ 
                        name: index === 0 ? `\u200B\n🎮 ${ui.gamesTitle}` : `Продовження...`, 
                        value: chunk, 
                        inline: false 
                    });
                });
            }

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