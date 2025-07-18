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

// Змінено назву змінної
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // <-- Змінено тут
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=";
const IMAGEN_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=";

/**
 * Calls the Imagen API to generate an image based on a prompt.
 * @param {string} promptText - The text prompt for image generation.
 * @returns {Promise<string>} - A promise that resolves with the Base64 encoded image URL.
 * @throws {Error} - Throws an error if the API call fails or returns an unexpected response.
 */
async function generateImageWithImagen(promptText) {
    if (!GEMINI_API_KEY) {
        throw new Error("MY_APP_GEMINI_API_KEY is not set in the .env file."); // <-- Змінено тут
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
 * Calls the Gemini API to generate HTML content based on provided media and logic.
 * @param {string} imageSourceType - Type of image source ('link', 'upload', 'generate').
 * @param {Array<string>} mediaData - Array of image URLs, Base64 strings, or image generation prompts.
 * @param {string} logicDescription - Description of the ad's behavior.
 * @returns {Promise<string>} - A promise that resolves with the generated HTML string.
 * @throws {Error} - Throws an error if the API call fails or returns an unexpected response.
 */
export async function generateHtmlWithGemini(imageSourceType, mediaData, logicDescription) {
    if (!GEMINI_API_KEY) {
        throw new Error("MY_APP_GEMINI_API_KEY is not set in the .env file."); // <-- Змінено тут
    }

    const fullApiUrl = `${GEMINI_API_URL}${GEMINI_API_KEY}`;
    let imageReferences = []; // This will hold URLs or inlineData objects for the Gemini prompt

    // Process mediaData based on imageSourceType
    if (imageSourceType === 'link') {
        imageReferences = mediaData; // mediaData already contains URLs
    } else if (imageSourceType === 'upload') {
        // mediaData contains Base64 strings from uploaded files
        imageReferences = mediaData.map(base64String => {
            // Extract mimeType from Base64 string (e.g., "data:image/png;base64,...")
            const mimeType = base64String.substring(base64String.indexOf(':') + 1, base64String.indexOf(';'));
            const data = base64String.split(',')[1]; // Get the actual Base64 data
            return {
                inlineData: {
                    mimeType: mimeType,
                    data: data
                }
            };
        });
    } else if (imageSourceType === 'generate') {
        // mediaData contains prompts for image generation
        // Call Imagen API for each prompt and collect the generated image URLs (Base64)
        const generatedImageUrls = [];
        for (const prompt of mediaData) {
            try {
                const imageUrl = await generateImageWithImagen(prompt);
                generatedImageUrls.push(imageUrl);
            } catch (error) {
                console.warn(`Failed to generate image for prompt "${prompt}": ${error.message}`);
                // Use a placeholder if image generation fails
                generatedImageUrls.push(`https://placehold.co/600x400/cccccc/333333?text=Image+Gen+Failed`);
            }
        }
        imageReferences = generatedImageUrls; // Gemini will receive these Base64 URLs
    }

    // Construct the parts for the Gemini prompt - MADE MORE CONCISE
    const promptParts = [
        { text: `Створи адаптивний HTML, CSS (використовуй Tailwind CSS) та JavaScript код для рекламного веб-додатку.
Реклама повинна бути повністю адаптивною для всіх розмірів екрану (мобільні, планшети, десктопи) та орієнтацій.
Уникай внутрішніх повзунків у згенерованому HTML.
Якщо логіка передбачає слайд-шоу або галерею, переконайся, що зображення правильно масштабуються та вирівнюються, без шпаринок між ними.
Логіка поведінки реклами: ${logicDescription}.
Використай надані зображення. Забезпеч інтерактивність для слайд-шоу, якщо потрібно.
Використовуй заглушки, якщо зображення недоступні. Уникай alert()/confirm().` }
    ];

    // Add image references to the prompt parts
    imageReferences.forEach(ref => {
        if (typeof ref === 'string') {
            // It's a URL (either from 'link' or generated Base64 URL)
            promptParts.push({ text: `Зображення URL: ${ref}` });
        } else if (ref.inlineData) {
            // It's an inlineData object for Base64 image
            promptParts.push(ref);
        }
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
