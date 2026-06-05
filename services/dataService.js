const { db } = require('./firebaseService');

const cache = new Map();

const initializeData = async (client) => {
    for (const guild of client.guilds.cache.values()) {
        await loadGuildData(guild.id, guild.name);
    }
};

const loadGuildData = async (guildId, guildName = 'Unknown Server') => {
    console.log(`[Firebase] Server "${guildName}" (${guildId}) requested data.`);

    const guildCache = {
        voiceStats: new Map(),
        gameStats: new Map(),
        sessions: { games: {} },
        config: {},
        activeVoiceSessions: new Map()
    };

    try {
        const voiceSnapshot = await db.collection('guilds').doc(guildId).collection('voiceStats').get();
        voiceSnapshot.forEach(doc => guildCache.voiceStats.set(doc.id, doc.data()));

        const gameSnapshot = await db.collection('guilds').doc(guildId).collection('gameStats').get();
        for (const doc of gameSnapshot.docs) {
            const data = doc.data();
            const playersMap = new Map();
            if (data.players) {
                for (const [pId, pData] of Object.entries(data.players)) {
                    playersMap.set(pId, pData);
                }
            }
            guildCache.gameStats.set(doc.id, { totalTime: data.totalTime || 0, players: playersMap });
        }

        const sessionsDoc = await db.collection('guilds').doc(guildId).collection('modules').doc('sessions').get();
        if (sessionsDoc.exists) guildCache.sessions = sessionsDoc.data();
        if (!guildCache.sessions.games) guildCache.sessions.games = {};

        const configDoc = await db.collection('guilds').doc(guildId).collection('settings').doc('config').get();
        if (configDoc.exists) guildCache.config = configDoc.data();

        console.log(`[Firebase] Server "${guildName}" (${guildId}) successfully received data.`);
    } catch (error) {
        console.error(`[Firebase] Server "${guildName}" (${guildId}) failed to receive data:`, error.message);
        console.error("Ой щось трапилося firebase не відповідає зачекайте. Помилка завантаження:", error.message);
    }

    cache.set(guildId, guildCache);
};

const saveGuildData = async (guildId, guildName = 'Unknown Server') => {
    const guildCache = cache.get(guildId);
    if (!guildCache) return;

    console.log(`[Firebase] Server "${guildName}" (${guildId}) requested to save data.`);

    let batch = db.batch();
    let count = 0;

    const commitBatch = async () => {
        if (count > 0) {
            try {
                await batch.commit();
            } catch (error) {
                console.error("Ой щось трапилося firebase не відповідає зачекайте. Помилка збереження (commit):", error.message);
            }
            batch = db.batch();
            count = 0;
        }
    };

    try {
        const guildRef = db.collection('guilds').doc(guildId);

        for (const [userId, stats] of guildCache.voiceStats) {
            batch.set(guildRef.collection('voiceStats').doc(userId), stats, { merge: true });
            count++;
            if (count >= 490) await commitBatch();
        }

        for (const [gameName, gameData] of guildCache.gameStats) {
            const playersObj = {};
            for (const [userId, playerData] of gameData.players) {
                playersObj[userId] = playerData;
            }

            batch.set(guildRef.collection('gameStats').doc(gameName), { 
                totalTime: gameData.totalTime,
                players: playersObj 
            }, { merge: true });
            
            count++;
            if (count >= 490) await commitBatch();
        }

        batch.set(guildRef.collection('modules').doc('sessions'), guildCache.sessions);
        count++;
        if (count >= 490) await commitBatch();

        batch.set(guildRef.collection('settings').doc('config'), guildCache.config, { merge: true });
        count++;
        
        await commitBatch();
        
        console.log(`[Firebase] Server "${guildName}" (${guildId}) successfully saved data.`);
    } catch (error) {
        console.error("Ой щось трапилося firebase не відповідає зачекайте. Загальна помилка:", error.message);
    }
};

const getData = (guildId) => {
    if (!cache.has(guildId)) {
        cache.set(guildId, {
            voiceStats: new Map(),
            gameStats: new Map(),
            sessions: { games: {} },
            config: {},
            activeVoiceSessions: new Map()
        });
    }
    return cache.get(guildId);
};

module.exports = { initializeData, loadGuildData, saveGuildData, getData };