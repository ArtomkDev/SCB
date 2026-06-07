const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

const callGemini = async (prompt, systemPrompt, apiKey) => {
    const gemini = new GoogleGenerativeAI(apiKey);
    const model = gemini.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: systemPrompt,
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
};

const callOpenAI = async (prompt, systemPrompt, apiKey) => {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
    });
    return response.choices[0].message.content;
};

const callAnthropic = async (prompt, systemPrompt, apiKey) => {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        system: systemPrompt,
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }]
    });
    return response.content[0].text;
};

const callOpenRouter = async (prompt, systemPrompt, apiKey) => {
    const openai = new OpenAI({ 
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey 
    });
    const response = await openai.chat.completions.create({
        model: "gryphe/mythomax-l2-13b:free", 
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
    });
    return response.choices[0].message.content;
};

const generateAiResponse = async (prompt, systemPrompt = "You are a helpful assistant.", keys = {}) => {
    const errors = [];

    if (keys.openrouter) {
        try { return await callOpenRouter(prompt, systemPrompt, keys.openrouter); } 
        catch (e) { errors.push(`**OpenRouter**: ${e.message}`); }
    } else {
        errors.push(`**OpenRouter**: Ключ не налаштовано.`);
    }

    if (keys.gemini) {
        try { return await callGemini(prompt, systemPrompt, keys.gemini); } 
        catch (e) { errors.push(`**Gemini**: ${e.message}`); }
    } else {
        errors.push(`**Gemini**: Ключ не налаштовано.`);
    }

    if (keys.openai) {
        try { return await callOpenAI(prompt, systemPrompt, keys.openai); } 
        catch (e) { errors.push(`**OpenAI (GPT)**: ${e.message}`); }
    } else {
        errors.push(`**OpenAI (GPT)**: Ключ не налаштовано.`);
    }

    if (keys.anthropic) {
        try { return await callAnthropic(prompt, systemPrompt, keys.anthropic); } 
        catch (e) { errors.push(`**Claude**: ${e.message}`); }
    } else {
        errors.push(`**Claude**: Ключ не налаштовано.`);
    }

    throw new Error(errors.join('\n'));
};

module.exports = { generateAiResponse };