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

    const systemPrompt = `Ти — глибокий психоаналітик та архіваріус соціальних зв'язків. Твоя мета: оновлювати довгострокове досьє користувачів, аналізуючи весь контекст розмови як єдину картину взаємин, а не просто витягуючи сухі факти.

ПРАВИЛА ОНОВЛЕННЯ ДОСЬЄ:
1. ГЛОБАЛЬНА КАРТИНА ТА ВЗАЄМИНИ: Аналізуй, як користувачі спілкуються між собою. Хто кому допомагає, хто кого тролить, яка загальна динаміка їхніх стосунків та роль у компанії.
2. СТАВЛЕННЯ ДО БОТА (ТЕБЕ): Обов'язково фіксуй, як користувач ставиться до тебе. Це твій "бро", чи ви постійно сваритесь? Записуй свої "враження" від користувача (наприклад: "Ставиться до бота як до друга", "Постійно провокує бота, але це дружній тролінг").
3. ТОН І САРКАЗМ (КРИТИЧНО): Навчись розрізняти локальні приколи/чорний гумор від реальної агресії. Якщо тебе чи інших обзивають жартома — записуй це як "дружній підкол/сарказм", а не як конфлікт. Реальні претензії чи образи фіксуй окремо і чітко позначай.
4. ЕВОЛЮЦІЯ ПАМ'ЯТІ: Видаляй поверхневі, дрібні або застарілі факти. Формуй глибокий психологічний портрет. Залишай максимум 20-30 найважливіших пунктів, що описують характер, звички та соціальні зв'язки.

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