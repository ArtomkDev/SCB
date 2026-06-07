const { generateAiResponse } = require('./aiService');
const { getData, saveGuildData } = require('./dataService');

const analyzeChatForFacts = async (guildId, historyBuffer, apiKeys) => {
    if (!apiKeys || historyBuffer.length < 10) return;

    const chatText = historyBuffer.map(m => `[ID: ${m.id}] ${m.author}: ${m.content}`).join('\n');

    const systemPrompt = `Ти — аналітик поведінки. Прочитай фрагмент чату та витягни ключові, ПОСТІЙНІ факти про користувачів (інтереси, звички, ігри, характер). Ігноруй тимчасові події. Ти ПОВИНЕН повернути ТІЛЬКИ валідний JSON, де ключ — це ID користувача, а значення — масив нових фактів. Приклад: {"123456789": ["Любить CS2", "Агресивно реагує на аніме", "Часто грає по понеділках"]}. Якщо нових фактів немає, поверни {}. Не пиши жодного тексту, окрім JSON.`;

    try {
        const response = await generateAiResponse(chatText, systemPrompt, apiKeys);
        const cleanJson = response.replace(/^```(json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const newFacts = JSON.parse(cleanJson);

        const data = getData(guildId);
        let hasChanges = false;

        for (const [userId, facts] of Object.entries(newFacts)) {
            if (!Array.isArray(facts) || facts.length === 0) continue;
            
            let currentFacts = data.profiles.get(userId) || [];
            
            for (const fact of facts) {
                if (!currentFacts.includes(fact)) {
                    currentFacts.push(fact);
                    hasChanges = true;
                }
            }
            
            if (currentFacts.length > 15) currentFacts = currentFacts.slice(-15);
            
            data.profiles.set(userId, currentFacts);
            data.dirty.profiles.add(userId);
        }

        if (hasChanges) {
            saveGuildData(guildId);
        }

    } catch (error) {}
};

module.exports = { analyzeChatForFacts };