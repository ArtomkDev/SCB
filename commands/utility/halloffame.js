const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getHallOfFameData, formatTime } = require('../../services/playtimeService');
const { getVoiceHallOfFame } = require('../../services/voiceService');
const { getUI } = require('../../services/uiService');
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
                .setTitle(`🏆 ${ui.title}`)
                .setColor('#FFD700')
                .setFooter({ text: ui.footer })
                .setTimestamp();

            const medals = ['🥇', '🥈', '🥉'];

            let voiceDesc = `**${ui.voiceStreaksTitle}**\n`;
            if (voiceData.topStreaks.length > 0) {
                voiceData.topStreaks.forEach((user, index) => {
                    const medal = medals[index] || '🏅';
                    voiceDesc += `└ ${medal} **${user.username}** — ${user.currentStreak} дн.\n`;
                });
            } else {
                voiceDesc += `└ ${ui.empty}\n`;
            }

            voiceDesc += `\n**${ui.voiceTimeTitle}**\n`;
            if (voiceData.topTime.length > 0) {
                voiceData.topTime.forEach((user, index) => {
                    const medal = medals[index] || '🏅';
                    voiceDesc += `└ ${medal} **${user.username}** — ⏱️ \`${formatTime(user.totalTime)}\`\n`;
                });
            } else {
                voiceDesc += `└ ${ui.empty}\n`;
            }

            embed.addFields({ name: '🗣️ Голосова Активність', value: voiceDesc, inline: false });

            let gamesDesc = '';
            if (!gameData || gameData.length === 0) {
                gamesDesc = ui.empty;
            } else {
                gameData.forEach((game) => {
                    gamesDesc += `🎮 **${game.gameName}** - ⏳ \`${formatTime(game.totalTime)}\`\n`;
                    game.topPlayers.forEach((player, pIndex) => {
                        const medal = medals[pIndex] || '🏅';
                        gamesDesc += `└ ${medal} ${player.username} ⏱️ \`${formatTime(player.time)}\`\n`;
                    });
                    gamesDesc += '\n';
                });
            }

            embed.addFields({ name: `🕹️ ${ui.gamesTitle}`, value: gamesDesc || ui.empty, inline: false });

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