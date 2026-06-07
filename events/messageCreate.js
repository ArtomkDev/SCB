const { Events, ActivityType } = require('discord.js');
const { generateAiResponse } = require('../services/aiService');
const { getData } = require('../services/dataService');
const { analyzeChatForFacts } = require('../services/memoryService');
const { getGifUrl } = require('../services/gifService');

const channelHistory = new Map();
const memoryBuffers = new Map();

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const guildId = message.guild.id;
        const channelId = message.channel.id;
        const data = getData(guildId);
        
        const apiKeys = data.config?.apiKeys || {};
        if (!apiKeys.gemini && !apiKeys.openai && !apiKeys.anthropic && !apiKeys.openrouter) return;

        if (!channelHistory.has(channelId)) channelHistory.set(channelId, []);
        const history = channelHistory.get(channelId);
        history.push({ id: message.author.id, author: message.author.displayName, content: message.content });
        if (history.length > 15) history.shift();

        if (!memoryBuffers.has(channelId)) memoryBuffers.set(channelId, []);
        const memBuf = memoryBuffers.get(channelId);
        memBuf.push({ id: message.author.id, author: message.author.displayName, content: message.content });

        if (memBuf.length >= 25) {
            const bufferToAnalyze = [...memBuf];
            memBuf.length = 0;
            analyzeChatForFacts(guildId, bufferToAnalyze, apiKeys).catch(() => {});
        }

        const isMentioned = message.mentions.has(client.user.id);
        const randomChance = data.config?.aiRandomChance || 0; 
        const isRandomReply = Math.random() * 100 < randomChance;

        if (isMentioned || isRandomReply) {
            await message.channel.sendTyping();

            const baseSystemPrompt = data.config?.aiSystemPrompt || "You are a helpful Discord bot.";
            const gifInstruction = `\n\n[КРИТИЧНА СИСТЕМНА ВКАЗІВКА]: Якщо за твоїм поточним характером доречно використати GIF-анімацію для емоції чи реакції, ти ПОВИНЕН вставити в текст тег у форматі [GIF: ключові слова англійською]. Наприклад: [GIF: smug anime face] або [GIF: angry flip table]. Генеруй запити, які ідеально підкреслюють твою особистість.`;
            const systemPrompt = baseSystemPrompt + gifInstruction;

            let activityContext = "\n\n--- Поточна активність на сервері ---\n";
            let hasActivity = false;

            message.guild.members.cache.forEach(member => {
                if (member.user.bot) return;

                let activities = [];

                if (member.voice && member.voice.channel) {
                    let voiceStatus = `у войсі "${member.voice.channel.name}"`;
                    if (member.voice.streaming) voiceStatus += ` (стрімить екран)`;
                    if (member.voice.selfVideo) voiceStatus += ` (з вебкою)`;
                    if (member.voice.selfMute || member.voice.serverMute) voiceStatus += ` (замучений)`;
                    activities.push(voiceStatus);
                }

                if (member.presence && member.presence.activities.length > 0) {
                    member.presence.activities.forEach(activity => {
                        if (activity.type === ActivityType.Playing || activity.type === 0) {
                            let timeStr = "";
                            if (activity.timestamps && activity.timestamps.start) {
                                const diffMs = Date.now() - activity.timestamps.start.getTime();
                                const diffMins = Math.floor(diffMs / 60000);
                                if (diffMins > 0) timeStr = ` (час: ${diffMins} хв)`;
                            }
                            activities.push(`грає в ${activity.name}${timeStr}`);
                        }
                    });
                }

                if (activities.length > 0) {
                    activityContext += `👤 ${member.displayName}: ${activities.join(', ')}\n`;
                    hasActivity = true;
                }
            });

            if (!hasActivity) {
                activityContext += "Зараз ніхто ні в що не грає і не сидить у войсі.\n";
            }

            activityContext += "\n[КРИТИЧНА СИСТЕМНА ВКАЗІВКА ЩОДО АКТИВНОСТІ]: Ти бачиш точний час у хвилинах. ТОБІ СУВОРО ЗАБОРОНЕНО використовувати точні цифри (наприклад, '39 хвилин' або '51 хвилина') у своїх відповідях. Ти ПОВИНЕН самостійно і природно округлювати цей час як жива людина, використовуючи ту мову, якою зараз ведеш діалог (наприклад: 'десь півгодини', 'майже годину', 'about half an hour', 'almost an hour'). Використовуй інформацію про активність ТІЛЬКИ коли це доречно.\n---------------------------------------\n";

            let profilesContext = "\n--- Досьє на активних користувачів (твоя довгострокова пам'ять) ---\n";
            let hasProfiles = false;
            
            const recentUserIds = [...new Set(history.map(m => m.id))]; 
            
            recentUserIds.forEach(id => {
                const facts = data.profiles.get(id);
                if (facts && facts.length > 0) {
                    const member = message.guild.members.cache.get(id);
                    const name = member ? member.displayName : id;
                    profilesContext += `👤 ${name}: ${facts.join(', ')}\n`;
                    hasProfiles = true;
                }
            });

            if (!hasProfiles) profilesContext += "Поки що немає даних.\n";
            profilesContext += "[СИСТЕМНА ВКАЗІВКА]: Використовуй ці факти, щоб краще розуміти користувачів, адаптувати свої жарти та поведінку.\n";

            let conversationContext = "Ось історія останніх повідомлень:\n\n";
            history.forEach(msg => {
                conversationContext += `${msg.author}: ${msg.content}\n`;
            });
            
            conversationContext += "\n" + activityContext; 
            conversationContext += "\n" + profilesContext;
            conversationContext += `\nЗараз ${message.author.displayName} звернувся. Твоє ім'я: ${client.user.username}.`;

            try {
                let aiResponse = await generateAiResponse(conversationContext, systemPrompt, apiKeys);
                
                const gifRegex = /\[GIF:\s*(.+?)\]/gi;
                let match;
                let gifLinks = [];

                
                while ((match = gifRegex.exec(aiResponse)) !== null) {
                    const query = match[1];
                    const gifUrl = await getGifUrl(query, apiKeys?.giphy); 

                    if (gifUrl) {
                        gifLinks.push(gifUrl);
                    }
                }

                aiResponse = aiResponse.replace(/\[GIF:\s*(.+?)\]/gi, '').trim();

                if (gifLinks.length > 0) {
                     aiResponse += `\n\n${gifLinks.join('\n')}`;
                }

                history.push({ id: client.user.id, author: client.user.username, content: aiResponse });
                if (history.length > 15) history.shift();
                await message.reply(aiResponse.trim());
            } catch (error) {}
        }
    },
};