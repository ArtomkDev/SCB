const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getHallOfFameData, formatTime } = require('../../services/playtimeService');
const { getVoiceHallOfFame } = require('../../services/voiceService');
const { getUI, formatUI } = require('../../services/uiService');
const { getSessionsState, saveSessionsState } = require('../../services/firebaseService');
const { updateGuildSessions } = require('../../services/sessionManager');

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
            const gameData = await getHallOfFameData(guildId, client);
            const voiceData = await getVoiceHallOfFame(guildId, client);

            const embed = new EmbedBuilder()
                .setTitle(ui.title)
                .setColor('#cc2626')
                .setFooter({ text: ui.footer })
                .setTimestamp();

            const medals = ['🥇', '🥈', '🥉'];

            let streakText = '';
            if (voiceData.topStreaks.length > 0) {
                voiceData.topStreaks.forEach((user, index) => {
                    streakText += formatUI(ui.voiceStreakLine, {
                        medal: medals[index] ? medals[index] : '',
                        user: user.username,
                        streak: user.currentStreak
                    });
                });
            } else {
                streakText = ui.empty;
            }
            embed.addFields({ name: ui.voiceStreaksTitle, value: streakText, inline: false });

            let voiceTimeText = '';
            if (voiceData.topTime.length > 0) {
                voiceData.topTime.forEach((user, index) => {
                    voiceTimeText += formatUI(ui.voiceTimeLine, {
                        medal: medals[index] ? medals[index] : '',
                        user: user.username,
                        time: formatTime(user.totalTime)
                    });
                });
            } else {
                voiceTimeText = ui.empty;
            }
            embed.addFields({ name: ui.voiceTimeTitle, value: voiceTimeText, inline: false });

            embed.addFields({ name: '\u200B', value: ui.gamesSeparator, inline: false });

            if (!gameData || gameData.length === 0) {
                embed.addFields({ name: ui.gamesTitle, value: ui.empty, inline: false });
            } else {
                gameData.forEach((game, index) => {
                    const gameTitle = formatUI(ui.gameTitle, {
                        rank: index + 1,
                        game: game.gameName,
                        time: formatTime(game.totalTime)
                    });

                    let playersText = '';
                    game.topPlayers.forEach((player, pIndex) => {
                        playersText += formatUI(ui.playerLine, {
                            medal: medals[pIndex] ? medals[pIndex] : '',
                            user: player.username,
                            time: formatTime(player.time)
                        });
                    });

                    embed.addFields({
                        name: gameTitle,
                        value: playersText ? playersText : ui.noPlayers,
                        inline: false
                    });
                });
            }

            await interaction.editReply({ embeds: [embed] });

            let state = client.gameSessions?.get(guildId);
            if (!state) {
                state = await getSessionsState(guildId);
                if (!state.games) state.games = {};
                if (!client.gameSessions) client.gameSessions = new Map();
                client.gameSessions.set(guildId, state);
            }

            const replyMessage = await interaction.fetchReply();
            state.lastHofMessage = {
                channelId: replyMessage.channelId,
                messageId: replyMessage.id
            };
            
            await saveSessionsState(guildId, state);
            updateGuildSessions(client, guildId);

        } catch (error) {
            await interaction.editReply(ui.error);
        }
    },
};