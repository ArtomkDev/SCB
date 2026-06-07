const { db } = require('./firebaseService');

const cache = new Map();

const initializeData = async (client) => {
    for (const guild of client.guilds.cache.values()) {
        await loadGuildData(guild.id, guild.name);
    }
};

const loadGuildData = async (guildId, guildName = 'Unknown Server') => {
    const guildCache = {
        voiceStats: new Map(),
        gameStats: new Map(),
        sessions: { games: {}, voice: {}, streams: {} },
        config: {},
        profiles: new Map(),
        dirty: {
            voice: new Set(),
            games: new Set(),
            profiles: new Set(),
            sessions: false,
            config: false
        }
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
        if (!guildCache.sessions.voice) guildCache.sessions.voice = {};
        if (!guildCache.sessions.streams) guildCache.sessions.streams = {};

        const configDoc = await db.collection('guilds').doc(guildId).collection('settings').doc('config').get();
        if (configDoc.exists) guildCache.config = configDoc.data();

        const profilesSnapshot = await db.collection('guilds').doc(guildId).collection('profiles').get();
        profilesSnapshot.forEach(doc => guildCache.profiles.set(doc.id, doc.data().facts || []));

    } catch (error) {}

    cache.set(guildId, guildCache);
};

const saveGuildData = async (guildId, guildName = 'Unknown Server') => {
    const guildCache = cache.get(guildId);
    if (!guildCache) return;

    const hasChanges = guildCache.dirty.voice.size > 0 || 
                       guildCache.dirty.games.size > 0 || 
                       guildCache.dirty.profiles.size > 0 ||
                       guildCache.dirty.sessions || 
                       guildCache.dirty.config;

    if (!hasChanges) return;

    let batch = db.batch();
    let count = 0;

    const commitBatch = async () => {
        if (count > 0) {
            try { await batch.commit(); } catch (error) {}
            batch = db.batch();
            count = 0;
        }
    };

    try {
        const guildRef = db.collection('guilds').doc(guildId);

        for (const userId of guildCache.dirty.voice) {
            const stats = guildCache.voiceStats.get(userId);
            if (stats) {
                batch.set(guildRef.collection('voiceStats').doc(userId), stats, { merge: true });
                count++;
                if (count >= 490) await commitBatch();
            }
        }

        for (const gameName of guildCache.dirty.games) {
            const gameData = guildCache.gameStats.get(gameName);
            if (gameData) {
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
        }

        for (const userId of guildCache.dirty.profiles) {
            const facts = guildCache.profiles.get(userId);
            if (facts) {
                batch.set(guildRef.collection('profiles').doc(userId), { facts }, { merge: true });
                count++;
                if (count >= 490) await commitBatch();
            }
        }

        if (guildCache.dirty.sessions) {
            batch.set(guildRef.collection('modules').doc('sessions'), guildCache.sessions);
            count++;
            if (count >= 490) await commitBatch();
        }

        if (guildCache.dirty.config) {
            batch.set(guildRef.collection('settings').doc('config'), guildCache.config, { merge: true });
            count++;
        }
        
        await commitBatch();
        
        guildCache.dirty.voice.clear();
        guildCache.dirty.games.clear();
        guildCache.dirty.profiles.clear();
        guildCache.dirty.sessions = false;
        guildCache.dirty.config = false;

    } catch (error) {}
};

const getData = (guildId) => {
    if (!cache.has(guildId)) {
        cache.set(guildId, {
            voiceStats: new Map(),
            gameStats: new Map(),
            sessions: { games: {}, voice: {}, streams: {} },
            config: {},
            profiles: new Map(),
            dirty: {
                voice: new Set(),
                games: new Set(),
                profiles: new Set(),
                sessions: false,
                config: false
            }
        });
    }
    return cache.get(guildId);
};

module.exports = { initializeData, loadGuildData, saveGuildData, getData };