// server/index.js
import dotenv from 'dotenv'; // Import dotenv
import path from 'path'; // Import path module
import { fileURLToPath } from 'url'; // Import fileURLToPath

// Get __dirname equivalent in ES Modules for dotenv path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file as early as possible
dotenv.config({ path: path.resolve(__dirname, '.env') }); // Point to .env in the server/ directory

// --- DEBUGGING LOG FOR API KEY (now in index.js) ---
console.log('DEBUG (index.js): Value of process.env.MY_APP_GEMINI_API_KEY:', process.env.MY_APP_GEMINI_API_KEY);
// --- END DEBUGGING LOG ---

import express from 'express';
import cors from 'cors';
import generateRoute from './routes/generate.js';
import imageGenerateRoute from './routes/imageGenerate.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all origins (for development)
// Parse JSON request bodies with an increased limit to handle larger payloads (e.g., Base64 images)
app.use(express.json({ limit: '50mb' })); // Increased limit to 50MB

// Routes
app.use('/generate', generateRoute);
app.use('/image-generate', imageGenerateRoute);

// Basic route for testing server status
app.get('/', (req, res) => {
    res.send('Ad Generator Backend is running!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
