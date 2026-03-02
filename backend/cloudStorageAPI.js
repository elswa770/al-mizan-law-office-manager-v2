// Backend API for Google Cloud Storage (Node.js)
// This file should be placed in your backend service

const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: 'your-project-id',
  keyFilename: 'path/to/service-account-key.json'
});

const bucket = storage.bucket('al-mizan-law-documents');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Upload endpoint
app.post('/api/cloud-storage/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId, caseId, clientId, tags } = req.body;
    const file = req.file;
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `documents/${userId}/${timestamp}_${randomId}.${fileExtension}`;

    // Create file in bucket
    const blob = bucket.file(fileName);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          userId,
          caseId: caseId || '',
          clientId: clientId || '',
          tags: tags || ''
        }
      }
    });

    blobStream.on('error', (err) => {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Failed to upload file' });
    });

    blobStream.on('finish', async () => {
      try {
        // Make file publicly accessible
        await blob.makePublic();
        
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        
        res.json({
          success: true,
          url: publicUrl,
          cloudPath: fileName,
          fileName: file.originalname,
          size: file.size,
          contentType: file.mimetype
        });
      } catch (error) {
        console.error('Error making file public:', error);
        res.status(500).json({ error: 'Failed to process uploaded file' });
      }
    });

    blobStream.end(file.buffer);
  } catch (error) {
    console.error('Upload endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete endpoint
app.post('/api/cloud-storage/delete', async (req, res) => {
  try {
    const { fileName } = req.body;
    
    if (!fileName) {
      return res.status(400).json({ error: 'File name is required' });
    }

    await bucket.file(fileName).delete();
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete endpoint error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// List files endpoint
app.get('/api/cloud-storage/list', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const [files] = await bucket.getFiles({
      prefix: `documents/${userId}/`
    });

    const fileList = files.map(file => ({
      name: file.name,
      size: file.metadata.size,
      contentType: file.metadata.contentType,
      timeCreated: file.metadata.timeCreated,
      updated: file.metadata.updated,
      publicUrl: `https://storage.googleapis.com/${bucket.name}/${file.name}`
    }));

    res.json({
      success: true,
      files: fileList
    });
  } catch (error) {
    console.error('List endpoint error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Get file info endpoint
app.get('/api/cloud-storage/info/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    const [file] = await bucket.file(fileName).get();
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const [metadata] = await file.getMetadata();
    
    res.json({
      success: true,
      file: {
        name: file.name,
        size: metadata.size,
        contentType: metadata.contentType,
        timeCreated: metadata.timeCreated,
        updated: metadata.updated,
        metadata: metadata.metadata || {},
        publicUrl: `https://storage.googleapis.com/${bucket.name}/${file.name}`
      }
    });
  } catch (error) {
    console.error('Info endpoint error:', error);
    res.status(500).json({ error: 'Failed to get file info' });
  }
});

// Health check endpoint
app.get('/api/cloud-storage/health', (req, res) => {
  res.json({
    success: true,
    message: 'Google Cloud Storage API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`Google Cloud Storage API server running on port ${port}`);
});

module.exports = app;
