const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const validateGuildId = (guildId) => {
    if (!guildId || typeof guildId !== 'string') throw new Error(`Invalid guildId provided.`);
};

const getGuildConfig = async (guildId) => {
    validateGuildId(guildId);
    const doc = await db.collection('guilds').doc(guildId).collection('settings').doc('config').get();
    return doc.exists ? doc.data() : {};
};

const updateGuildConfig = async (guildId, data) => {
    validateGuildId(guildId);
    await db.collection('guilds').doc(guildId).collection('settings').doc('config').set(data, { merge: true });
};

const getSessionsState = async (guildId) => {
    validateGuildId(guildId);
    const doc = await db.collection('guilds').doc(guildId).collection('modules').doc('sessions').get();
    return doc.exists ? doc.data() : {};
};

const saveSessionsState = async (guildId, data) => {
    validateGuildId(guildId);
    await db.collection('guilds').doc(guildId).collection('modules').doc('sessions').set(data);
};

module.exports = { db, getGuildConfig, updateGuildConfig, getSessionsState, saveSessionsState };