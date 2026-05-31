const { ActivityType, EmbedBuilder } = require('discord.js');
const { getSessionsState, saveSessionsState } = require('./firebaseService');
const { getUI } = require('./uiService');

const formatTime = (ms) => {
    const totalMinutes = Math.floor(ms / 60000);
    if (totalMinutes < 1) return '0хв';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}г ${minutes}хв` : `${minutes}хв`;
};

const processGuildSessions = async (client, guildId) => {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    let state = client.gameSessions?.get(guildId);
    if (!state) {
        state = await getSessionsState(guildId);
        if (!state.games) state.games = {};
        if (!client.gameSessions) client.gameSessions = new Map();
        client.gameSessions.set(guildId, state);
    }

    let members;
    try {
        members = await guild.members.fetch({ withPresences: true });
    } catch (e) {
        return;
    }

    const activeGamesFromDiscord = new Map();

    for (const [memberId, member] of members) {
        if (member.user.bot || !member.presence) continue;

        const activity = member.presence.activities.find(a => a.type === ActivityType.Playing);
        if (!activity) continue;

        const gameName = activity.name;

        if (!activeGamesFromDiscord.has(gameName)) {
            activeGamesFromDiscord.set(gameName, []);
        }

        activeGamesFromDiscord.get(gameName).push({
            id: member.id,
            displayName: member.displayName
        });
    }

    const updatedGames = {};

    for (const [gameName, activePlayers] of activeGamesFromDiscord.entries()) {
        const existingGame = state.games[gameName] || {
            sessionStart: Date.now(),
            players: {}
        };

        const newPlayers = {};
        for (const p of activePlayers) {
            if (existingGame.players[p.id]) {
                newPlayers[p.id] = existingGame.players[p.id];
                newPlayers[p.id].displayName = p.displayName;
            } else {
                newPlayers[p.id] = {
                    displayName: p.displayName,
                    startTime: Date.now()
                };
            }
        }

        existingGame.players = newPlayers;
        updatedGames[gameName] = existingGame;
    }

    state.games = updatedGames;
    client.gameSessions.set(guildId, state);
    saveSessionsState(guildId, state).catch(() => {});

    if (state.lastMessage && state.lastMessage.channelId && state.lastMessage.messageId) {
        try {
            const channel = await client.channels.fetch(state.lastMessage.channelId);
            if (channel) {
                const message = await channel.messages.fetch(state.lastMessage.messageId);
                if (message) {
                    const ui = await getUI(guildId, 'sessions');

                    const embed = new EmbedBuilder()
                        .setColor('#57F287')
                        .setTitle(ui.title)
                        .setFooter({ text: ui.footer })
                        .setTimestamp();

                    const gameNames = Object.keys(state.games);
                    let description = '';

                    if (gameNames.length === 0) {
                        description = ui.empty;
                    } else {
                        const sortedGames = gameNames.map(name => ({
                            name,
                            ...state.games[name]
                        })).sort((a, b) => a.sessionStart - b.sessionStart).slice(0, 10);

                        for (const game of sortedGames) {
                            const sessionLength = Date.now() - game.sessionStart;
                            description += `🎮 **${game.name}** - ⏱️ \`${formatTime(sessionLength)}\`\n`;
                            
                            const playersArr = Object.values(game.players).sort((a, b) => a.startTime - b.startTime);
                            
                            for (const player of playersArr) {
                                const playerLength = Date.now() - player.startTime;
                                description += `└ 👤 ${player.displayName} — \`${formatTime(playerLength)}\`\n`;
                            }
                            description += '\n';
                        }
                    }

                    embed.setDescription(description.trim());

                    await message.edit({ content: null, embeds: [embed] });
                }
            }
        } catch (err) {
            if (err.code === 10008 || err.code === 10003) {
                state.lastMessage = null;
                saveSessionsState(guildId, state).catch(() => {});
            }
        }
    }
};

const updateGuildSessions = (client, guildId) => {
    if (!client.sessionUpdateTimers) client.sessionUpdateTimers = new Map();
    
    if (client.sessionUpdateTimers.has(guildId)) {
        clearTimeout(client.sessionUpdateTimers.get(guildId));
    }

    const timer = setTimeout(() => {
        client.sessionUpdateTimers.delete(guildId);
        processGuildSessions(client, guildId);
    }, 3000);
    
    client.sessionUpdateTimers.set(guildId, timer);
};

module.exports = { updateGuildSessions };