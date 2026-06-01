const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getHallOfFameData, formatTime } = require('../../services/playtimeService');
const { getUI, formatUI } = require('../../services/uiService');
const { getSessionsState, saveSessionsState } = require('../../services/firebaseService');
const { updateGuildSessions } = require('../../services/sessionManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hall_of_fame')
        .setDescription('Показує топ 10 ігор за часом на сервері.')
        .setDMPermission(false),
    async execute(interaction) {
        if (!interaction.inGuild()) return;
        await interaction.deferReply();

        const guildId = interaction.guild.id;
        const ui = await getUI(guildId, 'halloffame');
        const client = interaction.client;

        try {
            const data = await getHallOfFameData(guildId, client);

            const embed = new EmbedBuilder()
                .setTitle(ui.title || "🏆 Зал слави")
                .setColor('#2b2d31')
                .setFooter({ text: "Оновлено" })
                .setTimestamp();

            if (!data || data.length === 0) {
                embed.setDescription(ui.empty || "*Порожньо*");
            } else {
                data.forEach((game, index) => {
                    const gameTitle = formatUI(ui.gameTitle, {
                        rank: index + 1,
                        game: game.gameName,
                        time: formatTime(game.totalTime)
                    });

                    let playersText = '';
                    game.topPlayers.forEach((player, pIndex) => {
                        const medals = ['🥇', '🥈', '🥉'];
                        playersText += formatUI(ui.playerLine, {
                            medal: medals[pIndex],
                            user: player.username,
                            time: formatTime(player.time)
                        });
                    });

                    embed.addFields({
                        name: gameTitle,
                        value: playersText || ui.noPlayers,
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
            console.error(error);
            await interaction.editReply(ui.error || "Сталася помилка.");
        }
    },
};