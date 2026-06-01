const { db } = require('./firebaseService');

const dbCache = new Map();

async function updateGameTime(guildId, userId, username, gameName, durationMs) {
    const gameRef = db.collection('guilds').doc(guildId).collection('gameStats').doc(gameName);
    const userRef = gameRef.collection('players').doc(userId);

    await db.runTransaction(async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        const userDoc = await transaction.get(userRef);

        const newGameTotal = (gameDoc.exists ? gameDoc.data().totalTime : 0) + durationMs;
        const newUserTotal = (userDoc.exists ? userDoc.data().time : 0) + durationMs;

        transaction.set(gameRef, { totalTime: newGameTotal }, { merge: true });
        transaction.set(userRef, { username, time: newUserTotal }, { merge: true });
    });
}

async function getHallOfFameData(guildId, client) {
    const cacheKey = `hof_db_${guildId}`;
    let cached = dbCache.get(cacheKey);

    if (!cached || Date.now() - cached.timestamp > 60000) {
        const gamesSnapshot = await db.collection('guilds').doc(guildId).collection('gameStats')
            .orderBy('totalTime', 'desc')
            .limit(20)
            .get();

        const freshMergedGames = new Map();

        for (const doc of gamesSnapshot.docs) {
            const gameName = doc.id;
            const totalTime = doc.data().totalTime || 0;
            
            const playersSnapshot = await db.collection('guilds').doc(guildId).collection('gameStats')
                .doc(gameName).collection('players').get();
                
            const playersMap = new Map();
            for (const pDoc of playersSnapshot.docs) {
                playersMap.set(pDoc.id, { username: pDoc.data().username, time: pDoc.data().time || 0 });
            }
            
            freshMergedGames.set(gameName, { totalTime, players: playersMap });
        }

        cached = { timestamp: Date.now(), data: freshMergedGames };
        dbCache.set(cacheKey, cached);
    }

    const mergedGames = new Map();
    for (const [key, val] of cached.data.entries()) {
        const playersCopy = new Map();
        for (const [pKey, pVal] of val.players.entries()) {
            playersCopy.set(pKey, { ...pVal });
        }
        mergedGames.set(key, { totalTime: val.totalTime, players: playersCopy });
    }

    if (client) {
        const activeState = client.gameSessions?.get(guildId);
        if (activeState && activeState.games) {
            for (const [activeGameName, activeGameData] of Object.entries(activeState.games)) {
                
                if (!mergedGames.has(activeGameName)) {
                    mergedGames.set(activeGameName, { totalTime: 0, players: new Map() });
                }
                
                const gameData = mergedGames.get(activeGameName);
                
                for (const [playerId, playerObj] of Object.entries(activeGameData.players)) {
                    const activeDuration = Date.now() - playerObj.startTime; 
                    
                    gameData.totalTime += activeDuration;
                    
                    if (!gameData.players.has(playerId)) {
                        gameData.players.set(playerId, { username: playerObj.displayName, time: 0 });
                    }
                    gameData.players.get(playerId).time += activeDuration;
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
            
        hallOfFame.push({
            gameName,
            totalTime: gameData.totalTime,
            topPlayers: sortedPlayers
        });
    }

    return hallOfFame.sort((a, b) => b.totalTime - a.totalTime).slice(0, 10);
}

function formatTime(ms) {
    const totalMinutes = Math.floor(ms / 60000);
    if (totalMinutes < 1) return '0 хв';
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours} год ${minutes} хв` : `${minutes} хв`;
}

module.exports = {
    updateGameTime,
    getHallOfFameData,
    formatTime
};