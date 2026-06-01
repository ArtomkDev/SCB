const { ActivityType, EmbedBuilder } = require('discord.js');
const { getSessionsState, saveSessionsState } = require('./firebaseService');
const { getUI, formatUI } = require('./uiService');
const { updateGameTime, getHallOfFameData, formatTime } = require('./playtimeService');
const { getVoiceHallOfFame, activeVoiceSessions, handleVoiceState } = require('./voiceService');

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

    const members = guild.members.cache;
    const activeGamesFromDiscord = new Map();

    for (const [memberId, member] of members) {
        if (member.user.bot) continue;

        const sessionKey = `${guildId}_${memberId}`;
        const inVoice = !!member.voice?.channelId;

        if (inVoice && !activeVoiceSessions.has(sessionKey)) {
            handleVoiceState(guildId, memberId, member.displayName, 'join').catch(() => {});
        } else if (!inVoice && activeVoiceSessions.has(sessionKey)) {
            handleVoiceState(guildId, memberId, member.displayName, 'leave').catch(() => {});
        }

        if (!member.presence) continue;
        
        const activity = member.presence?.activities?.find(a => a.type === ActivityType.Playing);
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

    for (const [oldGameName, oldGameData] of Object.entries(state.games)) {
        for (const [oldPlayerId, oldPlayer] of Object.entries(oldGameData.players)) {
            const isStillPlaying = activeGamesFromDiscord.has(oldGameName) && 
                                   activeGamesFromDiscord.get(oldGameName).some(p => p.id === oldPlayerId);
            
            if (!isStillPlaying) {
                const duration = Date.now() - oldPlayer.startTime;
                if (duration > 60000) { 
                    updateGameTime(guildId, oldPlayerId, oldPlayer.displayName, oldGameName, duration).catch(() => {});
                }
            }
        }
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
                            description += `🎮 **${game.name}** - ⏳ \`${formatTime(sessionLength)}\`\n`;
                            
                            const playersArr = Object.values(game.players).sort((a, b) => a.startTime - b.startTime);
                            for (const player of playersArr) {
                                const playerLength = Date.now() - player.startTime;
                                description += `└ 👤 ${player.displayName} ⏱️ \`${formatTime(playerLength)}\`\n`;
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

    if (state.lastHofMessage && state.lastHofMessage.channelId && state.lastHofMessage.messageId) {
        try {
            const channel = await client.channels.fetch(state.lastHofMessage.channelId);
            if (channel) {
                const message = await channel.messages.fetch(state.lastHofMessage.messageId);
                if (message) {
                    const data = await getHallOfFameData(guildId, client);
                    const voiceData = await getVoiceHallOfFame(guildId, client);
                    const ui = await getUI(guildId, 'halloffame');

                    const embed = new EmbedBuilder()
                        .setTitle(`${ui.title}`)
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
                    if (!data || data.length === 0) {
                        gamesDesc = ui.empty;
                    } else {
                        data.forEach((game) => {
                            gamesDesc += `🎮 **${game.gameName}** - ⏳ \`${formatTime(game.totalTime)}\`\n`;
                            game.topPlayers.forEach((player, pIndex) => {
                                const medal = medals[pIndex] || '🏅';
                                gamesDesc += `└ ${medal} ${player.username} ⏱️ \`${formatTime(player.time)}\`\n`;
                            });
                            gamesDesc += '\n';
                        });
                    }

                    embed.addFields({ name: `🕹️ ${ui.gamesTitle}`, value: gamesDesc || ui.empty, inline: false });
                    
                    await message.edit({ content: null, embeds: [embed] });
                }
            }
        } catch (err) {
            if (err.code === 10008 || err.code === 10003) {
                state.lastHofMessage = null;
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

module.exports = { updateGuildSessions, formatTime };