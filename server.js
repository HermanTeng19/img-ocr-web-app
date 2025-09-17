const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|bmp|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Store processing results
const processingResults = new Map();

// Routes

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload image endpoint
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded' });
        }

        const imageInfo = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            path: req.file.path,
            uploadTime: new Date().toISOString()
        };

        // Generate a processing ID
        const processingId = 'proc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Store initial processing state
        processingResults.set(processingId, {
            status: 'processing',
            imageInfo: imageInfo,
            result: null,
            error: null,
            timestamp: new Date().toISOString()
        });

        // Call webhook for OCR processing (placeholder for now)
        try {
            await callOcrWebhook(processingId, imageInfo);
        } catch (webhookError) {
            console.error('Webhook call failed:', webhookError.message);
            // Update result with error
            processingResults.set(processingId, {
                ...processingResults.get(processingId),
                status: 'error',
                error: 'OCR service temporarily unavailable. Webhook endpoint not configured.'
            });
        }

        res.json({
            success: true,
            processingId: processingId,
            imageInfo: imageInfo,
            message: 'Image uploaded successfully. Processing...'
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            error: 'Upload failed', 
            details: error.message 
        });
    }
});

// Get processing result
app.get('/api/result/:processingId', (req, res) => {
    const processingId = req.params.processingId;
    const result = processingResults.get(processingId);
    
    if (!result) {
        return res.status(404).json({ error: 'Processing ID not found' });
    }
    
    res.json(result);
});

// Serve uploaded images
app.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'Image not found' });
    }
});

// Webhook endpoint for receiving OCR results
app.post('/api/webhook/ocr-result', (req, res) => {
    try {
        const { processingId, result, error } = req.body;
        
        if (!processingId) {
            return res.status(400).json({ error: 'Processing ID is required' });
        }
        
        const existingResult = processingResults.get(processingId);
        if (!existingResult) {
            return res.status(404).json({ error: 'Processing ID not found' });
        }
        
        // Update the processing result
        processingResults.set(processingId, {
            ...existingResult,
            status: error ? 'error' : 'completed',
            result: result || null,
            error: error || null,
            completedAt: new Date().toISOString()
        });
        
        res.json({ success: true, message: 'Result received successfully' });
        
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Failed to process webhook result' });
    }
});

// Function to call external OCR webhook (placeholder)
async function callOcrWebhook(processingId, imageInfo) {
    // TODO: Replace with actual webhook URL
    const webhookUrl = process.env.OCR_WEBHOOK_URL || 'https://your-ocr-service.com/webhook';
    
    // For now, simulate a processing delay and return mock data
    setTimeout(() => {
        // Simulate successful OCR result
        const mockResult = {
            text: 'This is a mock OCR result. The actual webhook is not configured yet.',
            confidence: 0.95,
            language: 'en',
            boundingBoxes: [
                { text: 'Sample', x: 10, y: 20, width: 100, height: 30 },
                { text: 'Text', x: 120, y: 20, width: 80, height: 30 }
            ]
        };
        
        processingResults.set(processingId, {
            ...processingResults.get(processingId),
            status: 'completed',
            result: mockResult,
            completedAt: new Date().toISOString()
        });
    }, 2000); // 2 second delay to simulate processing
    
    // Uncomment and modify this section when you have a real webhook endpoint:
    /*
    try {
        const response = await axios.post(webhookUrl, {
            processingId: processingId,
            imageUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/uploads/${imageInfo.filename}`,
            callbackUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/webhook/ocr-result`,
            metadata: {
                originalName: imageInfo.originalName,
                size: imageInfo.size,
                uploadTime: imageInfo.uploadTime
            }
        }, {
            timeout: 30000 // 30 second timeout
        });
        
        console.log('Webhook called successfully:', response.status);
        return response.data;
    } catch (error) {
        console.error('Webhook call failed:', error.message);
        throw error;
    }
    */
}

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
    }
    
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Upload directory: ${uploadsDir}`);
    console.log(`🔗 OCR Webhook URL: ${process.env.OCR_WEBHOOK_URL || 'Not configured (using mock data)'}`);
});

module.exports = app;
