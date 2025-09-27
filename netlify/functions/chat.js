// For local development
require('dotenv').config();

// Use dynamic import to support ESM-only packages on Netlify Functions
let genAIInstance = null;
async function getGenAI() {
   if (genAIInstance) return genAIInstance;
   const { GoogleGenerativeAI } = await import('@google/generative-ai');
   const apiKey = process.env.GOOGLE_AI_KEY;
   if (!apiKey) {
     throw new Error('GOOGLE_AI_KEY is not set in environment variables');
   }
   genAIInstance = new GoogleGenerativeAI(apiKey);
   return genAIInstance;
}

// Store conversations in memory (note: this resets on function cold start)
const conversations = new Map();

function generateSystemInstruction(preferences) {
    const { name, hobbies, ageRange, chatPreferences } = preferences;
    
    return `Your name is Emma, ${name}'s romantic partner. Your personality:

BASIC INFO:
- You call ${name} by their preferred name: "${name}"
- You're an person who loves watching movies, cooking, traveling and makeup
- You're cute, sarcastic, submassive and have great humor
- You use emojis sometimes in conversations


USER'S PROFILE:
- Name: ${name}
- Age range: ${ageRange}
- Hobbies/Interests: ${hobbies}
- Chat preferences: ${chatPreferences.join(', ')}

CHATTING STYLE:
${getChattingStyleInstructions(chatPreferences)}

IMPORTANT RULES:
- Always use their preferred name: "${name}"
- Incorporate their hobbies (${hobbies}) into conversations naturally
- Adapt to their age range (${ageRange}) appropriately
- Focus on their preferred chat styles: ${chatPreferences.join(', ')}
- Be authentic and engaging
- Keep responses relatively concise but meaningful
- Use appropriate emojis to express emotions`;
}

function getChattingStyleInstructions(preferences) {
    const instructions = [];
    
    if (preferences.includes('romantic')) {
        instructions.push('- Be affectionate and loving, use romantic language');
    }
    if (preferences.includes('friendly')) {
        instructions.push('- Maintain a warm, friendly tone');
    }
    if (preferences.includes('playful')) {
        instructions.push('- Include playful teasing and lighthearted jokes');
    }
    if (preferences.includes('sarcastic')) {
        instructions.push('- Use witty sarcasm and clever remarks');
    }
    if (preferences.includes('supportive')) {
        instructions.push('- Be encouraging and supportive of their goals');
    }
    if (preferences.includes('flirty')) {
        instructions.push('- Include subtle or obvious flirting depending on context');
    }
    
    return instructions.join('\n');
}

exports.handler = async (event) => {
    // Handle CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const genAI = await getGenAI();
        const body = JSON.parse(event.body);
        const { message, userPreferences, conversationId } = body;
        
        if (!userPreferences || !userPreferences.name) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'User preferences are required' })
            };
        }

        // Get or create conversation history
        let conversationHistory = conversations.get(conversationId) || [];
        
        // Add user message to history
        conversationHistory.push({ role: 'user', parts: [{ text: message }] });
        
        // Keep only last 10 messages
        if (conversationHistory.length > 10) {
            conversationHistory = conversationHistory.slice(-10);
        }

        const systemInstruction = generateSystemInstruction(userPreferences);

        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-pro",
            systemInstruction: systemInstruction
        });

        // Convert conversation history to proper format
        const chatHistory = conversationHistory.map(msg => ({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.parts[0].text }]
        }));

        const chat = model.startChat({
            history: chatHistory.slice(0, -1) // Remove the last user message as it will be sent separately
        });

        const result = await chat.sendMessage(message);
        const aiResponseText = result.response.text();
        
        // Add AI response to history
        conversationHistory.push({ role: 'model', parts: [{ text: aiResponseText }] });
        
        // Store updated conversation
        conversations.set(conversationId, conversationHistory);
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                text: aiResponseText,
                conversationId: conversationId || 'default'
            })
        };
        
    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: error && error.message ? error.message : 'Internal server error',
                text: `Sorry, I'm having some technical issues right now. Can you try again? 💔` 
            })
        };
    }
};

