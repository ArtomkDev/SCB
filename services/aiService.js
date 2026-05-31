const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const generateAiResponse = async (prompt, systemPrompt) => {
    const apiKey = process.env.AI_API_KEY;
    
    if (!apiKey) {
        throw new Error('AI_API_KEY відсутній у змінних середовища (.env).');
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        
        const safetySettings = [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
        ];

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash', 
            systemInstruction: systemPrompt,
            safetySettings: safetySettings 
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        return response.text();
    } catch (error) {
        console.error('[AI SERVICE ERROR] Помилка API Gemini:', error);
        throw new Error(`AI API request failed: ${error.message}`);
    }
};

module.exports = {
    generateAiResponse
};