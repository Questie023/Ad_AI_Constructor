// server/utils/geminiClient.js
import dotenv from 'dotenv';
// 'node-fetch' is needed for fetch in Node.js environments
import fetch from 'node-fetch';
import path from 'path'; // Import path module
import { fileURLToPath } from 'url'; // Import fileURLToPath for __dirname equivalent

// Get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file, explicitly specifying the path
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// --- DEBUGGING LOG FOR API KEY ---
console.log('DEBUG: Value of process.env.MY_APP_GEMINI_API_KEY:', process.env.MY_APP_GEMINI_API_KEY);
// --- END DEBUGGING LOG ---

// Змінено назву змінної
const GEMINI_API_KEY = process.env.MY_APP_GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=";
const IMAGEN_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=";

/**
 * Calls the Imagen API to generate an image based on a prompt.
 * This function will now be called directly by the frontend or a separate backend endpoint,
 * not by generateHtmlWithGemini, to manage token limits.
 * @param {string} promptText - The text prompt for image generation.
 * @returns {Promise<string>} - A promise that resolves with the Base64 encoded image URL.
 * @throws {Error} - Throws an error if the API call fails or returns an unexpected response.
 */
export async function generateImageWithImagen(promptText) { // Exported for potential direct use or new endpoint
    if (!GEMINI_API_KEY) {
        throw new Error("MY_APP_GEMINI_API_KEY is not set in the .env file.");
    }

    const fullApiUrl = `${IMAGEN_API_URL}${GEMINI_API_KEY}`;
    const payload = {
        instances: { prompt: promptText },
        parameters: { "sampleCount": 1 }
    };

    try {
        const response = await fetch(fullApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Imagen API error response:', errorData);
            throw new Error(`Imagen API returned an error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const result = await response.json();

        if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
            // Return the Base64 image URL
            return `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
        } else {
            console.error('Unexpected Imagen API response structure:', result);
            throw new Error('Unexpected response from Imagen API: No image generated.');
        }
    } catch (error) {
        console.error('Error in generateImageWithImagen:', error);
        throw error;
    }
}

/**
 * Calls the Gemini API to generate HTML content based on provided media (URLs or metadata) and logic.
 * This function no longer generates images directly.
 * @param {string} imageSourceType - Type of image source ('link', 'upload', 'generate').
 * @param {Array<string|object>} mediaData - Array of image URLs (for 'link') or metadata objects (for 'upload'/'generate').
 * @param {string} logicDescription - Description of the ad's behavior.
 * @returns {Promise<string>} - A promise that resolves with the generated HTML string.
 * @throws {Error} - Throws an error if the API call fails or returns an unexpected response.
 */
export async function generateHtmlWithGemini(imageSourceType, mediaData, logicDescription) {
    if (!GEMINI_API_KEY) {
        throw new Error("MY_APP_GEMINI_API_KEY is not set in the .env file.");
    }

    const fullApiUrl = `${GEMINI_API_URL}${GEMINI_API_KEY}`;
    let imagePromptDescriptions = []; // This will hold textual descriptions for the AI

    // Process mediaData based on imageSourceType to create textual descriptions for the AI
    if (imageSourceType === 'link') {
        // For 'link', send URLs directly to Gemini
        imagePromptDescriptions = mediaData.map((url, idx) => `Зображення URL: ${url}.`);
    } else if (imageSourceType === 'upload') {
        // For 'upload', send metadata and instruct AI to create placeholders with IDs
        imagePromptDescriptions = mediaData.map((meta, idx) => `Зображення-плейсхолдер ${idx + 1} (тип: ${meta.type || 'невідомий'}).`);
    } else if (imageSourceType === 'generate') {
        // For 'generate', send metadata (prompts) and instruct AI to create placeholders with IDs
        imagePromptDescriptions = mediaData.map((meta, idx) => `Зображення-плейсхолдер ${idx + 1} (опис: "${meta.prompt}").`);
    }

    // Construct the parts for the Gemini prompt
    const promptParts = [
        { text: `Створи ТІЛЬКИ ПОВНИЙ HTML, CSS (використовуй Tailwind CSS) та JavaScript код для рекламного веб-додатку. НЕ ДОДАВАЙ ЖОДНОГО ІНШОГО ТЕКСТУ, ПОЯСНЕНЬ ЧИ MARKDOWN-БЛОКІВ ОКРІМ САМОГО КОДУ.
        Реклама повинна бути повністю адаптивною для всіх розмірів екрану (мобільні, планшети, десктопи) та орієнтацій.
        Уникай внутрішніх повзунків у згенерованому HTML.
        Якщо логіка передбачає слайд-шоу або галерею, переконайся, що зображення правильно масштабуються та вирівнюються, без шпаринок між ними.
        ОБОВ'ЯЗКОВО СТВОРИ ТЕГИ <img> ДЛЯ КОЖНОГО ЗОБРАЖЕННЯ ВІДПОВІДНО ДО ІНСТРУКЦІЙ НИЖЧЕ.
        КОЖЕН ЕЛЕМЕНТ КАРОУСЕЛІ (якщо карусель) АБО КОНТЕЙНЕР ЗОБРАЖЕННЯ ПОВИНЕН МІСТИТИ ОДИН ТЕГ <img>.
        Приклад структури тегу <img>: <img id="ad-image-0" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="Опис зображення" class="w-full h-full object-cover">. Використовуй цей порожній Base64 GIF як тимчасовий src.
        Логіка поведінки реклами: ${logicDescription}.
        Уникай alert()/confirm().
        Завжди використовуй відносні одиниці (%, vw, vh) для розмірів елементів та адаптивні класи Tailwind CSS.
        Завжди включай атрибут 'alt' для зображень.` }
    ];

    // Add image descriptions to the prompt parts
    imagePromptDescriptions.forEach((desc, idx) => {
        promptParts.push({ text: `Для зображення ${idx + 1}: ${desc} Створи тег <img> з id="ad-image-${idx}" та відповідним атрибутом alt.` });
    });

    const payload = { contents: [{ role: "user", parts: promptParts }] };

    try {
        const response = await fetch(fullApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API error response:', errorData);
            throw new Error(`Gemini API returned an error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            return result.candidates[0].content.parts[0].text;
        } else {
            console.error('Unexpected Gemini API response structure:', result);
            throw new Error('Unexpected response from Gemini API: No content generated.');
        }
    } catch (error) {
        console.error('Error in generateHtmlWithGemini:', error);
        throw error;
    }
}
