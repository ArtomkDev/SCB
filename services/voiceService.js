const { getData } = require('./dataService');

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const handleVoiceState = (guildId, userId, username, action) => {
    const data = getData(guildId);
    const today = getTodayDateString();

    let userStats = data.voiceStats.get(userId) || { username, currentStreak: 1, lastJoinDate: today, totalTime: 0, streamTime: 0 };

    if (action === 'join') {
        data.sessions.voice[userId] = Date.now();
        data.dirty.sessions = true;
        
        if (userStats.lastJoinDate) {
            const prevDate = new Date(userStats.lastJoinDate);
            const currDate = new Date(today);
            const diffDays = Math.ceil(Math.abs(currDate - prevDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                userStats.currentStreak = (userStats.currentStreak || 0) + 1;
            } else if (diffDays > 1) {
                userStats.currentStreak = 1;
            }
        }
        
        userStats.lastJoinDate = today;
        userStats.username = username;
        data.voiceStats.set(userId, userStats);
        data.dirty.voice.add(userId);

    } else if (action === 'leave') {
        const joinTime = data.sessions.voice[userId];
        if (joinTime) {
            const durationMs = Date.now() - joinTime;
            delete data.sessions.voice[userId];
            data.dirty.sessions = true;
            
            userStats.totalTime = (userStats.totalTime || 0) + durationMs;
            data.voiceStats.set(userId, userStats);
            data.dirty.voice.add(userId);
        }
    } else if (action === 'start_stream') {
        data.sessions.streams[userId] = Date.now();
        data.dirty.sessions = true;
        
        userStats.username = username;
        data.voiceStats.set(userId, userStats);
        data.dirty.voice.add(userId);
    } else if (action === 'stop_stream') {
        const streamStart = data.sessions.streams[userId];
        if (streamStart) {
            const durationMs = Date.now() - streamStart;
            delete data.sessions.streams[userId];
            data.dirty.sessions = true;
            
            userStats.streamTime = (userStats.streamTime || 0) + durationMs;
            data.voiceStats.set(userId, userStats);
            data.dirty.voice.add(userId);
        }
    }
};

const getVoiceHallOfFame = (guildId, client) => {
    const data = getData(guildId);
    const guild = client?.guilds.cache.get(guildId);
    const now = Date.now();

    const voiceStatsArray = Array.from(data.voiceStats.entries()).map(([userId, stats]) => {
        let activeTime = 0;
        if (data.sessions.voice[userId]) {
            activeTime = now - data.sessions.voice[userId];
        }

        let activeStreamTime = 0;
        if (data.sessions.streams[userId]) {
            activeStreamTime = now - data.sessions.streams[userId];
        }

        let displayName = stats.username;
        if (guild) {
            const member = guild.members.cache.get(userId);
            if (member) displayName = member.displayName;
        }

        return {
            userId,
            ...stats,
            username: displayName,
            totalTime: (stats.totalTime || 0) + activeTime,
            streamTime: (stats.streamTime || 0) + activeStreamTime
        };
    });

    const topStreaks = [...voiceStatsArray]
        .filter(u => u.currentStreak > 0)
        .sort((a, b) => b.currentStreak - a.currentStreak)
        .slice(0, 3);

    const topTime = [...voiceStatsArray]
        .filter(u => u.totalTime > 60000)
        .sort((a, b) => b.totalTime - a.totalTime)
        .slice(0, 3);

    const topStreams = [...voiceStatsArray]
        .filter(u => u.streamTime > 60000)
        .sort((a, b) => b.streamTime - a.streamTime)
        .slice(0, 3);

    return { topStreaks, topTime, topStreams };
};

module.exports = { handleVoiceState, getVoiceHallOfFame };