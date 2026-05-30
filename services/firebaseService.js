const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Internal validation function to prevent catastrophic data leaks
const validateGuildId = (guildId) => {
    if (!guildId || typeof guildId !== 'string') {
        throw new Error(`[SECURITY ALERT] Спроба доступу до БД без валідного guildId! Надано: ${guildId}`);
    }
};

const getGuildConfig = async (guildId) => {
    validateGuildId(guildId); // Strict enforcement

    const docRef = db.collection('guilds').doc(guildId);
    const doc = await docRef.get();
    return doc.exists ? doc.data() : {};
};

const updateGuildConfig = async (guildId, data) => {
    validateGuildId(guildId); // Strict enforcement

    const docRef = db.collection('guilds').doc(guildId);
    await docRef.set(data, { merge: true }); // 'merge: true' ensures we don't overwrite other settings
};

module.exports = {
    db,
    getGuildConfig,
    updateGuildConfig
};