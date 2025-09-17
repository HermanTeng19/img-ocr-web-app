// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const previewImage = document.getElementById('previewImage');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const processBtn = document.getElementById('processBtn');
const cancelBtn = document.getElementById('cancelBtn');

const uploadSection = document.getElementById('uploadSection');
const processingSection = document.getElementById('processingSection');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');

const resultImage = document.getElementById('resultImage');
const recognizedText = document.getElementById('recognizedText');
const confidence = document.getElementById('confidence');
const language = document.getElementById('language');
const processingTime = document.getElementById('processingTime');

const copyBtn = document.getElementById('copyBtn');
const newBtn = document.getElementById('newBtn');
const retryBtn = document.getElementById('retryBtn');
const errorMessage = document.getElementById('errorMessage');

const toast = document.getElementById('toast');

// State
let currentFile = null;
let currentProcessingId = null;
let processingStartTime = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

function initializeEventListeners() {
    // Upload area events
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Button events
    uploadBtn.addEventListener('click', () => fileInput.click());
    processBtn.addEventListener('click', processImage);
    cancelBtn.addEventListener('click', resetUpload);
    copyBtn.addEventListener('click', copyTextToClipboard);
    newBtn.addEventListener('click', resetToUpload);
    retryBtn.addEventListener('click', processImage);
}

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

// File selection handler
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// File validation and preview
function handleFile(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('请选择有效的图片文件', 'error');
        return;
    }
    
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showToast('文件大小不能超过10MB', 'error');
        return;
    }
    
    currentFile = file;
    displayFilePreview(file);
}

function displayFilePreview(file) {
    // Show file info section
    uploadArea.style.display = 'none';
    fileInfo.style.display = 'flex';
    
    // Display file details
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    // Create and display image preview
    const reader = new FileReader();
    reader.onload = function(e) {
        previewImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Reset upload state
function resetUpload() {
    currentFile = null;
    currentProcessingId = null;
    fileInput.value = '';
    
    uploadArea.style.display = 'block';
    fileInfo.style.display = 'none';
    
    hideAllSections();
    uploadSection.style.display = 'block';
}

function resetToUpload() {
    resetUpload();
}

// Process image
async function processImage() {
    if (!currentFile) {
        showToast('请先选择图片文件', 'error');
        return;
    }
    
    // Show processing section
    hideAllSections();
    processingSection.style.display = 'block';
    processingStartTime = Date.now();
    
    try {
        // Create form data for upload
        const formData = new FormData();
        formData.append('image', currentFile);
        
        // Upload image
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`上传失败: ${response.status}`);
        }
        
        const uploadResult = await response.json();
        
        if (!uploadResult.success) {
            throw new Error(uploadResult.error || '上传失败');
        }
        
        currentProcessingId = uploadResult.processingId;
        
        // Poll for processing result
        pollForResult();
        
    } catch (error) {
        console.error('Process error:', error);
        showError(error.message);
    }
}

// Poll for processing result
async function pollForResult() {
    if (!currentProcessingId) return;
    
    try {
        const response = await fetch(`/api/result/${currentProcessingId}`);
        
        if (!response.ok) {
            throw new Error(`获取结果失败: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'completed') {
            displayResult(result);
        } else if (result.status === 'error') {
            throw new Error(result.error || '处理失败');
        } else if (result.status === 'processing') {
            // Continue polling
            setTimeout(pollForResult, 1000);
        }
        
    } catch (error) {
        console.error('Poll error:', error);
        showError(error.message);
    }
}

// Display processing result
function displayResult(result) {
    hideAllSections();
    resultsSection.style.display = 'block';
    
    // Display result image
    if (result.imageInfo && result.imageInfo.filename) {
        resultImage.src = `/uploads/${result.imageInfo.filename}`;
    }
    
    // Display OCR result
    if (result.result) {
        recognizedText.textContent = result.result.text || '未识别到文字内容';
        confidence.textContent = result.result.confidence ? 
            `${(result.result.confidence * 100).toFixed(1)}%` : '未知';
        language.textContent = result.result.language || '未知';
    } else {
        recognizedText.textContent = '未识别到文字内容';
        confidence.textContent = '未知';
        language.textContent = '未知';
    }
    
    // Calculate and display processing time
    if (processingStartTime) {
        const processingTimeMs = Date.now() - processingStartTime;
        processingTime.textContent = `${(processingTimeMs / 1000).toFixed(1)}秒`;
    } else {
        processingTime.textContent = '未知';
    }
    
    showToast('图片识别完成！', 'success');
}

// Show error
function showError(message) {
    hideAllSections();
    errorSection.style.display = 'block';
    errorMessage.textContent = message;
    showToast(message, 'error');
}

// Copy text to clipboard
async function copyTextToClipboard() {
    const textToCopy = recognizedText.textContent;
    
    if (!textToCopy || textToCopy === '未识别到文字内容') {
        showToast('没有可复制的文本', 'error');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(textToCopy);
        showToast('文本已复制到剪贴板', 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            showToast('文本已复制到剪贴板', 'success');
        } catch (fallbackError) {
            showToast('复制失败，请手动复制', 'error');
        }
        
        document.body.removeChild(textArea);
    }
}

// Show toast message
function showToast(message, type = 'success') {
    const toastContent = toast.querySelector('.toast-content');
    const toastIcon = toast.querySelector('.toast-icon');
    const toastMessage = toast.querySelector('.toast-message');
    
    // Set message
    toastMessage.textContent = message;
    
    // Set icon and style based on type
    if (type === 'error') {
        toast.classList.add('error');
        toastIcon.className = 'toast-icon fas fa-exclamation-circle';
    } else {
        toast.classList.remove('error');
        toastIcon.className = 'toast-icon fas fa-check-circle';
    }
    
    // Show toast
    toast.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Hide all main sections
function hideAllSections() {
    uploadSection.style.display = 'none';
    processingSection.style.display = 'none';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
}

// Utility functions for debugging and development
window.debugApp = {
    getCurrentFile: () => currentFile,
    getCurrentProcessingId: () => currentProcessingId,
    getProcessingStartTime: () => processingStartTime,
    showTestToast: (message, type) => showToast(message, type),
    resetApp: () => resetUpload()
};
