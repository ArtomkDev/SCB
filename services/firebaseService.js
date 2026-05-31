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
    const doc = await db.collection('guilds').doc(guildId).get();
    return doc.exists ? doc.data() : {};
};

const updateGuildConfig = async (guildId, data) => {
    validateGuildId(guildId); 
    await db.collection('guilds').doc(guildId).set(data, { merge: true }); 
};

module.exports = { db, getGuildConfig, updateGuildConfig };