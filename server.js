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

        // Call webhook for OCR processing
        try {
            await callOcrWebhook(processingId, imageInfo);
        } catch (webhookError) {
            console.error('Webhook call failed:', webhookError.message);
            // Error is already handled in callOcrWebhook function
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
        console.log('Received webhook callback:', JSON.stringify(req.body, null, 2));
        
        const { processingId, result, error } = req.body;
        
        if (!processingId) {
            console.error('No processing ID provided in webhook callback');
            return res.status(400).json({ error: 'Processing ID is required' });
        }
        
        const existingResult = processingResults.get(processingId);
        if (!existingResult) {
            console.error(`Processing ID not found: ${processingId}`);
            return res.status(404).json({ error: 'Processing ID not found' });
        }
        
        console.log(`Updating result for processing ID: ${processingId}`);
        
        // Update the processing result
        processingResults.set(processingId, {
            ...existingResult,
            status: error ? 'error' : 'completed',
            result: result || null,
            error: error || null,
            completedAt: new Date().toISOString()
        });
        
        console.log(`Processing ${processingId} ${error ? 'failed' : 'completed'}`);
        
        res.json({ success: true, message: 'Result received successfully' });
        
    } catch (error) {
        console.error('Webhook callback error:', error);
        res.status(500).json({ error: 'Failed to process webhook result' });
    }
});

// Function to call external OCR webhook
async function callOcrWebhook(processingId, imageInfo) {
    const webhookUrl = 'http://localhost:5678/webhook/773ced4a-d812-4ecf-84e8-ee3bfefe277f';
    
    try {
        console.log(`Calling OCR webhook for processing ID: ${processingId}`);
        console.log(`Image file: ${imageInfo.filename}`);
        
        // Read the image file as binary data
        const imagePath = path.join(__dirname, 'uploads', imageInfo.filename);
        const imageBuffer = fs.readFileSync(imagePath);
        
        console.log(`Image size: ${imageBuffer.length} bytes`);
        
        // Create FormData to send binary file
        const FormData = require('form-data');
        const formData = new FormData();
        
        // Add the binary image file
        formData.append('data', imageBuffer, {
            filename: imageInfo.originalName,
            contentType: 'image/' + path.extname(imageInfo.originalName).substring(1)
        });
        
        // Add other parameters
        formData.append('processingId', processingId);
        formData.append('callbackUrl', 'http://localhost:3000/api/webhook/ocr-result');
        formData.append('originalName', imageInfo.originalName);
        formData.append('size', imageInfo.size.toString());
        formData.append('uploadTime', imageInfo.uploadTime);
        
        console.log('Sending binary image data to webhook...');
        
        const response = await axios.post(webhookUrl, formData, {
            timeout: 30000, // 30 second timeout
            headers: {
                ...formData.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        
        console.log('Webhook called successfully:', response.status);
        console.log('Webhook response:', response.data);
        
        // Process the response from n8n directly
        if (response.data) {
            console.log('Processing n8n response directly...');
            console.log('Raw response data:', JSON.stringify(response.data, null, 2));
            
            // Extract text from Gemini API response format
            let extractedText = '';
            let confidence = 0.95;
            let language = 'zh-CN';
            
            try {
                // Handle Gemini API response format: candidates[0].content.parts[0].text
                if (response.data.candidates && 
                    response.data.candidates[0] && 
                    response.data.candidates[0].content && 
                    response.data.candidates[0].content.parts && 
                    response.data.candidates[0].content.parts[0] && 
                    response.data.candidates[0].content.parts[0].text) {
                    
                    extractedText = response.data.candidates[0].content.parts[0].text;
                    console.log('Extracted text from Gemini response:', extractedText);
                    
                    // Calculate confidence from avgLogprobs if available
                    if (response.data.candidates[0].avgLogprobs) {
                        const avgLogprobs = response.data.candidates[0].avgLogprobs;
                        // Convert log probability to confidence (rough estimation)
                        confidence = Math.max(0.1, Math.min(1.0, Math.exp(avgLogprobs)));
                    }
                } else {
                    // Fallback: try other possible text locations
                    extractedText = response.data.text || 
                                  response.data.result || 
                                  (typeof response.data === 'string' ? response.data : JSON.stringify(response.data));
                    console.log('Using fallback text extraction:', extractedText);
                }
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                extractedText = JSON.stringify(response.data);
            }
            
            // Update the processing result with extracted text
            processingResults.set(processingId, {
                ...processingResults.get(processingId),
                status: 'completed',
                result: {
                    text: extractedText,
                    confidence: confidence,
                    language: language
                },
                error: null,
                completedAt: new Date().toISOString()
            });
            
            console.log(`Processing ${processingId} completed with extracted text: "${extractedText.substring(0, 100)}..."`);
        }
        
        return response.data;
        
    } catch (error) {
        console.error('Webhook call failed:', error.message);
        console.error('Error details:', error.response?.data);
        
        // Update processing result with error
        processingResults.set(processingId, {
            ...processingResults.get(processingId),
            status: 'error',
            error: `Webhook调用失败: ${error.message}`,
            completedAt: new Date().toISOString()
        });
        
        throw error;
    }
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
