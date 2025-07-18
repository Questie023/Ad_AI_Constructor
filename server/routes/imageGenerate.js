// server/routes/imageGenerate.js
import express from 'express';
import { generateImageWithImagen } from '../utils/geminiClient.js';

const router = express.Router();

// Route to generate a single image based on a prompt
router.post('/', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        return res.status(400).json({ error: 'Prompt for image generation is required.' });
    }

    try {
        const imageUrl = await generateImageWithImagen(prompt);
        res.json({ imageUrl: imageUrl }); // Send back the Base64 image URL
    } catch (error) {
        console.error('Error generating image:', error);
        res.status(500).json({ error: 'Failed to generate image', details: error.message });
    }
});

export default router;
