import express from 'express';
import cors from 'cors';
import generateRoute from './routes/generate.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all origins (for development)
// Parse JSON request bodies with an increased limit to handle larger payloads (e.g., Base64 images)
app.use(express.json({ limit: '50mb' })); // Increased limit to 50MB

app.use('/generate', generateRoute);

app.get('/', (req, res) => {
    res.send('Ad Generator Backend is running!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
