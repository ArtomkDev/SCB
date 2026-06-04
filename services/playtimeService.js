const { getData } = require('./dataService');

const updateGameTime = (guildId, userId, username, gameName, durationMs) => {
    const data = getData(guildId);
    
    let gameData = data.gameStats.get(gameName) || { totalTime: 0, players: new Map() };
    gameData.totalTime += durationMs;

    let playerData = gameData.players.get(userId) || { username, time: 0 };
    playerData.time += durationMs;
    playerData.username = username;

    gameData.players.set(userId, playerData);
    data.gameStats.set(gameName, gameData);
};

const getHallOfFameData = (guildId, client) => {
    const data = getData(guildId);
    const guild = client?.guilds.cache.get(guildId);
    const mergedGames = new Map();

    for (const [gameName, gameData] of data.gameStats.entries()) {
        const playersCopy = new Map();
        for (const [userId, pData] of gameData.players.entries()) {
            let displayName = pData.username;
            if (guild) {
                const member = guild.members.cache.get(userId);
                if (member) displayName = member.displayName;
            }
            playersCopy.set(userId, { username: displayName, time: pData.time });
        }
        mergedGames.set(gameName, { totalTime: gameData.totalTime, players: playersCopy });
    }

    if (data.sessions?.games) {
        for (const [gameName, activeGameData] of Object.entries(data.sessions.games)) {
            if (!mergedGames.has(gameName)) {
                mergedGames.set(gameName, { totalTime: 0, players: new Map() });
            }
            const gameData = mergedGames.get(gameName);

            for (const [userId, playerObj] of Object.entries(activeGameData.players)) {
                const activeDuration = Date.now() - playerObj.startTime;
                gameData.totalTime += activeDuration;

                if (!gameData.players.has(userId)) {
                    gameData.players.set(userId, { username: playerObj.displayName, time: 0 });
                }
                gameData.players.get(userId).time += activeDuration;

                if (guild) {
                    const member = guild.members.cache.get(userId);
                    if (member) gameData.players.get(userId).username = member.displayName;
                }
            }
        }
    }

    const hallOfFame = [];
    for (const [gameName, gameData] of mergedGames.entries()) {
        if (gameData.totalTime < 60000) continue;

        const sortedPlayers = Array.from(gameData.players.values())
            .sort((a, b) => b.time - a.time)
            .slice(0, 3);
        
        hallOfFame.push({ gameName, totalTime: gameData.totalTime, topPlayers: sortedPlayers });
    }

    return hallOfFame.sort((a, b) => b.totalTime - a.totalTime).slice(0, 10);
};

const formatTime = (ms) => {
    const totalMinutes = Math.floor(ms / 60000);
    if (totalMinutes < 1) return '0 хв';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours} год ${minutes} хв` : `${minutes} хв`;
};

module.exports = { updateGameTime, getHallOfFameData, formatTime };