const { Events, ActivityType } = require('discord.js'); // Додано ActivityType
const { generateAiResponse } = require('../services/aiService');
const { getData } = require('../services/dataService');

const channelHistory = new Map();

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const guildId = message.guild.id;
        const channelId = message.channel.id;
        const data = getData(guildId);
        
        const apiKeys = data.config?.apiKeys || {};
        if (!apiKeys.gemini && !apiKeys.openai && !apiKeys.anthropic && !apiKeys.openrouter) return;

        if (!channelHistory.has(channelId)) {
            channelHistory.set(channelId, []);
        }
        const history = channelHistory.get(channelId);
        
        history.push({ author: message.author.displayName, content: message.content });
        if (history.length > 15) history.shift();

        const isMentioned = message.mentions.has(client.user.id);
        
        const randomChance = data.config?.aiRandomChance || 0; 
        const isRandomReply = Math.random() * 100 < randomChance;

        if (isMentioned || isRandomReply) {
            await message.channel.sendTyping();

            const systemPrompt = data.config?.aiSystemPrompt || "You are a helpful Discord bot.";

            let activityContext = "\n\n--- Поточна активність на сервері ---\n";
            let hasActivity = false;

            message.guild.members.cache.forEach(member => {
                if (member.user.bot) return;

                let activities = [];

                if (member.voice && member.voice.channel) {
                    let voiceStatus = `сидить у войсі "${member.voice.channel.name}"`;
                    if (member.voice.streaming) voiceStatus += ` (демонструє екран)`;
                    if (member.voice.selfVideo) voiceStatus += ` (з увімкненою вебкою)`;
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
                                if (diffMins > 0) timeStr = ` (вже ${diffMins} хв)`;
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

            activityContext += "\n[СИСТЕМНА ВКАЗІВКА]: Ти бачиш поточну активність користувачів. ПОВТОРЮЙ ТА ВИКОРИСТОВУЙ ЦІ ДАНІ ТІЛЬКИ ТОДІ, КОЛИ ЦЕ ДОРЕЧНО (наприклад, щоб підколоти когось, або якщо в тебе прямо запитали, хто що робить). Категорично заборонено перераховувати цю активність у кожній відповіді просто так!\n---------------------------------------\n";

            let conversationContext = "Ось історія останніх повідомлень в чаті для розуміння контексту:\n\n";
            history.forEach(msg => {
                conversationContext += `${msg.author}: ${msg.content}\n`;
            });
            
            conversationContext += activityContext;
            conversationContext += `\nЗараз ${message.author.displayName} звернувся або щось сказав. Відповідай йому, враховуючи попередній контекст. Твоє ім'я: ${client.user.username}.`;

            try {
                const aiResponse = await generateAiResponse(conversationContext, systemPrompt, apiKeys);
                
                history.push({ author: client.user.username, content: aiResponse });
                if (history.length > 15) history.shift();

                await message.reply(aiResponse);
            } catch (error) {
                console.error("AI Error:", error);
            }
        }
    },
};