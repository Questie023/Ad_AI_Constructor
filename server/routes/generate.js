// server/routes/generate.js
import express from 'express';
// Ensure that generateHtmlWithGemini is imported from the correct path
import { generateHtmlWithGemini } from '../utils/geminiClient.js';

const router = express.Router();

router.post('/', async (req, res) => {
    // --- DEBUGGING LOG ---
    console.log('Received request body:', req.body);
    // --- END DEBUGGING LOG ---

    // Destructure the new fields from the request body
    const { imageSourceType, mediaData, logicDescription } = req.body;

    // Validate inputs based on the new structure
    if (!imageSourceType || !mediaData || mediaData.length === 0 || !logicDescription) {
        console.error('Validation failed: Missing required fields.'); // Debug log
        return res.status(400).json({ error: 'Image source type, media data, and logic description are required.' });
    }

    // New validation: Limit the number of media items to 3
    if (mediaData.length > 3) {
        console.error('Validation failed: Too many media items.'); // Debug log
        return res.status(400).json({ error: 'Maximum of 3 media items (links, uploads, or generation prompts) are allowed.' });
    }

    try {
        // Pass all necessary parameters to the updated generateHtmlWithGemini function
        const generatedHtml = await generateHtmlWithGemini(imageSourceType, mediaData, logicDescription);
        res.json({ html: generatedHtml });
    } catch (error) {
        console.error('Error generating ad HTML:', error);
        // Provide more details in the error response for debugging
        res.status(500).json({ error: 'Failed to generate ad HTML', details: error.message });
    }
});

export default router;
