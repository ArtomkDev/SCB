const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getHallOfFameData, formatTime } = require('../../services/playtimeService');
const { getVoiceHallOfFame } = require('../../services/voiceService');
const { getUI } = require('../../services/uiService');
const { getData, saveGuildData } = require('../../services/dataService');
const { updateGuildSessions } = require('../../services/sessionManager');

const placeEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hall_of_fame')
        .setDescription('Показує статистику та рекорди сервера')
        .setDMPermission(false),
    async execute(interaction) {
        if (!interaction.inGuild()) return;
        await interaction.deferReply();
        
        const guildId = interaction.guild.id;
        const ui = await getUI(guildId, 'halloffame');
        const client = interaction.client;

        try {
            const gameData = getHallOfFameData(guildId, client);
            const voiceData = getVoiceHallOfFame(guildId, client);

            const embed = new EmbedBuilder()
                .setTitle(`🏆 ${ui.title}`)
                .setColor('#FFD700')
                .setFooter({ text: ui.footer })
                .setTimestamp()
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

            let voiceStreaksText = '';
            if (voiceData.topStreaks.length > 0) {
                voiceData.topStreaks.forEach((user, index) => {
                    const emoji = placeEmojis[index] || '🏅';
                    voiceStreaksText += `${emoji} **${user.username}** — \`${user.currentStreak} дн.\`\n`;
                });
            } else {
                voiceStreaksText = `*${ui.empty}*`;
            }

            let voiceTimeText = '';
            if (voiceData.topTime.length > 0) {
                voiceData.topTime.forEach((user, index) => {
                    const emoji = placeEmojis[index] || '🏅';
                    voiceTimeText += `${emoji} **${user.username}** — \`${formatTime(user.totalTime)}\`\n`;
                });
            } else {
                voiceTimeText = `*${ui.empty}*`;
            }

            let voiceStreamText = '';
            if (voiceData.topStreams.length > 0) {
                voiceData.topStreams.forEach((user, index) => {
                    const emoji = placeEmojis[index] || '🏅';
                    voiceStreamText += `${emoji} **${user.username}** — \`${formatTime(user.streamTime)}\`\n`;
                });
            } else {
                voiceStreamText = `*${ui.empty}*`;
            }

            embed.addFields(
                { name: `\u200B`, value: `**${ui.voiceTitle}**\n───────────────────` },
                { name: ui.voiceStreaksTitle, value: voiceStreaksText, inline: true },
                { name: ui.voiceTimeTitle, value: voiceTimeText, inline: true },
                { name: ui.voiceStreamTitle, value: voiceStreamText, inline: true }
            );


            embed.addFields({ name: `\u200B`, value: `**${ui.gamesTitle}**\n───────────────────` });

            if (!gameData || gameData.length === 0) {
                 embed.addFields({ name: '\u200b', value: `*${ui.empty}*` });
            } else {
                gameData.forEach((game, gameIndex) => {
                    const gameRankEmoji = placeEmojis[gameIndex] || '🎮'; 
                    
                    let playersText = '';
                    game.topPlayers.forEach((player, pIndex) => {
                         const pEmoji = placeEmojis[pIndex] || '🏅';
                         playersText += `${pEmoji} ${player.username} • \`${formatTime(player.time)}\`\n`;
                    });

                    embed.addFields({ 
                        name: `${gameRankEmoji} ${game.gameName} — ⏳ ${formatTime(game.totalTime)}`, 
                        value: playersText || `*${ui.empty}*`,
                        inline: false 
                    });
                });
            }

            await interaction.editReply({ embeds: [embed] });

            const data = getData(guildId);
            const replyMessage = await interaction.fetchReply();
            data.sessions.lastHofMessage = { channelId: replyMessage.channelId, messageId: replyMessage.id };

            data.dirty.sessions = true;
            await saveGuildData(guildId);
            updateGuildSessions(client, guildId);

        } catch (error) {
            console.error("Помилка генерації Залу Слави:", error);
            await interaction.editReply(ui.error);
        }
    },
};