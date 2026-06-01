const { db } = require('./firebaseService');

const activeVoiceSessions = new Map();

const getTodayDateString = () => new Date().toISOString().split('T')[0];

async function handleVoiceState(guildId, userId, username, action) {
    const sessionKey = `${guildId}_${userId}`;

    if (action === 'join') {
        activeVoiceSessions.set(sessionKey, Date.now());
        
        const userRef = db.collection('guilds').doc(guildId).collection('voiceStats').doc(userId);
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const today = getTodayDateString();
            
            let currentStreak = 1;
            let lastJoinDate = today;
            let totalTime = 0;

            if (userDoc.exists) {
                const data = userDoc.data();
                totalTime = data.totalTime || 0;
                const previousJoinDate = data.lastJoinDate;

                if (previousJoinDate) {
                    const prevDate = new Date(previousJoinDate);
                    const currDate = new Date(today);
                    const diffTime = Math.abs(currDate - prevDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) {
                        currentStreak = (data.currentStreak || 0) + 1;
                    } else if (diffDays === 0) {
                        currentStreak = data.currentStreak || 1;
                    } else {
                        currentStreak = 1;
                    }
                }
            }

            transaction.set(userRef, {
                username,
                currentStreak,
                lastJoinDate: today,
                totalTime
            }, { merge: true });
        });
    } 
    else if (action === 'leave') {
        const joinTime = activeVoiceSessions.get(sessionKey);
        if (joinTime) {
            const durationMs = Date.now() - joinTime;
            activeVoiceSessions.delete(sessionKey);

            const userRef = db.collection('guilds').doc(guildId).collection('voiceStats').doc(userId);
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                const currentTotal = userDoc.exists ? (userDoc.data().totalTime || 0) : 0;
                
                transaction.set(userRef, { 
                    totalTime: currentTotal + durationMs 
                }, { merge: true });
            });
        }
    }
}

async function getVoiceHallOfFame(guildId, client) {
    const statsRef = db.collection('guilds').doc(guildId).collection('voiceStats');
    const guild = client ? client.guilds.cache.get(guildId) : null;
    
    const streakSnapshot = await statsRef.orderBy('currentStreak', 'desc').limit(3).get();
    const topStreaks = streakSnapshot.docs.map(doc => {
        let displayName = doc.data().username;
        if (guild) {
            const member = guild.members.cache.get(doc.id);
            if (member) displayName = member.displayName;
        }
        return {
            userId: doc.id,
            ...doc.data(),
            username: displayName
        };
    }).filter(user => user.currentStreak > 0);

    const timeSnapshot = await statsRef.get();
    let allVoiceStats = timeSnapshot.docs.map(doc => {
        let displayName = doc.data().username;
        if (guild) {
            const member = guild.members.cache.get(doc.id);
            if (member) displayName = member.displayName;
        }
        return {
            userId: doc.id,
            ...doc.data(),
            username: displayName
        };
    });

    const now = Date.now();

    for (let user of allVoiceStats) {
        const sessionKey = `${guildId}_${user.userId}`;
        if (activeVoiceSessions.has(sessionKey)) {
            const activeTime = now - activeVoiceSessions.get(sessionKey);
            user.totalTime = (user.totalTime || 0) + activeTime;
        }
    }

    const topTime = allVoiceStats
        .filter(user => (user.totalTime || 0) > 60000)
        .sort((a, b) => b.totalTime - a.totalTime)
        .slice(0, 3);

    return { topStreaks, topTime };
}

module.exports = { handleVoiceState, getVoiceHallOfFame, activeVoiceSessions };