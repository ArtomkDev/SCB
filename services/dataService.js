const { db } = require('./firebaseService');

const cache = new Map();

const initializeData = async (client) => {
    for (const guild of client.guilds.cache.values()) {
        await loadGuildData(guild.id);
    }
};

const loadGuildData = async (guildId) => {
    const guildCache = {
        voiceStats: new Map(),
        gameStats: new Map(),
        sessions: { games: {} },
        config: {},
        activeVoiceSessions: new Map()
    };

    const voiceSnapshot = await db.collection('guilds').doc(guildId).collection('voiceStats').get();
    voiceSnapshot.forEach(doc => guildCache.voiceStats.set(doc.id, doc.data()));

    const gameSnapshot = await db.collection('guilds').doc(guildId).collection('gameStats').get();
    for (const doc of gameSnapshot.docs) {
        const gameData = doc.data();
        gameData.players = new Map();
        const playersSnapshot = await doc.ref.collection('players').get();
        playersSnapshot.forEach(pDoc => gameData.players.set(pDoc.id, pDoc.data()));
        guildCache.gameStats.set(doc.id, gameData);
    }

    const sessionsDoc = await db.collection('guilds').doc(guildId).collection('modules').doc('sessions').get();
    if (sessionsDoc.exists) guildCache.sessions = sessionsDoc.data();
    if (!guildCache.sessions.games) guildCache.sessions.games = {};

    const configDoc = await db.collection('guilds').doc(guildId).collection('settings').doc('config').get();
    if (configDoc.exists) guildCache.config = configDoc.data();

    cache.set(guildId, guildCache);
};

const saveGuildData = async (guildId) => {
    const guildCache = cache.get(guildId);
    if (!guildCache) return;

    let batch = db.batch();
    let count = 0;

    const commitBatch = async () => {
        if (count > 0) {
            await batch.commit();
            batch = db.batch();
            count = 0;
        }
    };

    const guildRef = db.collection('guilds').doc(guildId);

    for (const [userId, stats] of guildCache.voiceStats) {
        batch.set(guildRef.collection('voiceStats').doc(userId), stats, { merge: true });
        count++;
        if (count >= 490) await commitBatch();
    }

    for (const [gameName, gameData] of guildCache.gameStats) {
        batch.set(guildRef.collection('gameStats').doc(gameName), { totalTime: gameData.totalTime }, { merge: true });
        count++;
        if (count >= 490) await commitBatch();

        for (const [userId, playerData] of gameData.players) {
            batch.set(guildRef.collection('gameStats').doc(gameName).collection('players').doc(userId), playerData, { merge: true });
            count++;
            if (count >= 490) await commitBatch();
        }
    }

    batch.set(guildRef.collection('modules').doc('sessions'), guildCache.sessions);
    count++;
    if (count >= 490) await commitBatch();

    batch.set(guildRef.collection('settings').doc('config'), guildCache.config, { merge: true });
    count++;
    
    await commitBatch();
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