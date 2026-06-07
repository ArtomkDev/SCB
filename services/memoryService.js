const { generateAiResponse } = require('./aiService');
const { getData, saveGuildData } = require('./dataService');

const analyzeChatForFacts = async (guildId, historyBuffer, apiKeys) => {
    if (!apiKeys || historyBuffer.length < 10) return;

    const data = getData(guildId);
    
    const userIds = [...new Set(historyBuffer.map(m => m.id))];
    
    const currentProfiles = {};
    userIds.forEach(id => {
        const facts = data.profiles.get(id);
        if (facts && facts.length > 0) {
            currentProfiles[id] = facts;
        }
    });

    const chatText = historyBuffer.map(m => `[ID: ${m.id}] ${m.author}: ${m.content}`).join('\n');

    const systemPrompt = `Ти — розумний аналітик поведінки. Твоя мета: оновлювати довгострокове досьє користувачів на основі їх спілкування.

ПРАВИЛА ОНОВЛЕННЯ:
1. ІГНОРУЙ СПАМ ТА ФЛУД. Якщо людина 15 разів підряд написала "ГО В КС", не дублюй це. Зроби один логічний висновок: "Часто емоційно кличе грати в CS".
2. ОНОВЛЮЙ СТАРІ ДАНІ. Якщо раніше людина любила щось, а тепер каже протилежне (або інформація застаріла) — ЗАМІНИ старий факт. Не допускай суперечностей (наприклад, "Любить Майнкрафт" і "Ненавидить Майнкрафт" не можуть існувати одночасно).
3. ФІЛЬТРУЙ СМІТТЯ. Зберігай тільки справді важливі, постійні риси: улюблені ігри, звички, професію, хобі, типову поведінку, ставлення до речей.
4. ЛІМІТ. Тримай максимум 20-30 найголовніших фактів на одну людину.

Ти ПОВИНЕН повернути ТІЛЬКИ валідний JSON. Ключ — ID користувача, значення — ПОВНІСТЮ ОНОВЛЕНИЙ масив фактів. 
Якщо для користувача немає ніяких змін, просто не повернай його ID. Нічого не пиши крім JSON!`;

    const prompt = `ОСЬ ПОТОЧНІ ДОСЬЄ (які потрібно оновити або змінити):
${JSON.stringify(currentProfiles, null, 2)}

ОСЬ НОВІ ПОВІДОМЛЕННЯ (для аналізу):
${chatText}`;

    try {
        const response = await generateAiResponse(prompt, systemPrompt, apiKeys);
        
        const cleanJson = response.replace(/^```(json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const updatedProfiles = JSON.parse(cleanJson);

        let hasChanges = false;

        for (const [userId, facts] of Object.entries(updatedProfiles)) {
            if (!Array.isArray(facts)) continue;
            
            const limitedFacts = facts.slice(0, 15);
            const oldFacts = data.profiles.get(userId) || [];
            
            if (JSON.stringify(oldFacts) !== JSON.stringify(limitedFacts)) {
                data.profiles.set(userId, limitedFacts);
                data.dirty.profiles.add(userId);
                hasChanges = true;
            }
        }

        if (hasChanges) {
            saveGuildData(guildId);
        }

    } catch (error) {
        console.error("[Memory] Помилка аналізу пам'яті (AI міг повернути не JSON):", error.message);
    }
};

module.exports = { analyzeChatForFacts };