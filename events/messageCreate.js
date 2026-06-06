const { Events } = require('discord.js');
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
        if (!apiKeys.gemini && !apiKeys.openai && !apiKeys.anthropic) return;

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
            
            let conversationContext = "Ось історія останніх повідомлень в чаті для розуміння контексту:\n\n";
            history.forEach(msg => {
                conversationContext += `${msg.author}: ${msg.content}\n`;
            });
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