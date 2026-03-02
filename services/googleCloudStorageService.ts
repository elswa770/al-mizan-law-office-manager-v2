// Google Cloud Storage Service
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Storage } from '@google-cloud/storage';

export interface CloudDocument {
  id: string;
  name: string;
  type: 'pdf' | 'word' | 'excel' | 'image' | 'other';
  size: number;
  url: string;
  cloudPath: string;
  uploadedAt: string;
  uploadedBy: string;
  caseId?: string;
  clientId?: string;
  tags?: string[];
  bucketName: string;
}

// Initialize Google Cloud Storage
// Note: In production, you'll need to set up proper authentication
// This is a client-side implementation for demonstration
const initializeGoogleCloudStorage = (): Storage | null => {
  try {
    // For client-side usage, we'll use a proxy approach
    // In production, you should use a backend service
    return null; // We'll use a proxy API instead
  } catch (error) {
    console.error('Error initializing Google Cloud Storage:', error);
    return null;
  }
};

// Proxy API for Google Cloud Storage operations
const callCloudStorageAPI = async (endpoint: string, data: any): Promise<any> => {
  try {
    // In a real implementation, this would call your backend API
    // For now, we'll simulate the API call
    
    console.log(`Calling Cloud Storage API: ${endpoint}`, data);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock response
    switch (endpoint) {
      case '/upload':
        return {
          success: true,
          url: `https://storage.googleapis.com/mock-bucket/${data.fileName}`,
          cloudPath: data.fileName
        };
      case '/delete':
        return { success: true };
      default:
        throw new Error('Unknown endpoint');
    }
  } catch (error) {
    console.error('Cloud Storage API error:', error);
    throw new Error('فشل في الاتصال بخدمة التخزين السحابي');
  }
};

// Upload file to Google Cloud Storage
const uploadToGoogleCloudStorage = async (
  file: File,
  path: string,
  metadata?: any
): Promise<{ url: string; cloudPath: string }> => {
  try {
    // Convert file to base64 for API call
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await callCloudStorageAPI('/upload', {
      fileName: path,
      fileData: base64Data,
      contentType: file.type,
      metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        ...metadata
      }
    });

    return {
      url: response.url,
      cloudPath: response.cloudPath
    };
  } catch (error) {
    console.error('Error uploading to Google Cloud Storage:', error);
    throw new Error('فشل في رفع الملف إلى Google Cloud Storage');
  }
};

export const uploadDocument = async (
  file: File,
  userId: string,
  caseId?: string,
  clientId?: string,
  tags?: string[]
): Promise<CloudDocument> => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}_${randomId}.${fileExtension}`;
    
    // Determine file type
    let fileType: 'pdf' | 'word' | 'excel' | 'image' | 'other' = 'other';
    if (file.type === 'application/pdf') fileType = 'pdf';
    else if (file.type.includes('word') || file.type.includes('document')) fileType = 'word';
    else if (file.type.includes('excel') || file.type.includes('spreadsheet')) fileType = 'excel';
    else if (file.type.startsWith('image/')) fileType = 'image';

    // Create cloud path
    const cloudPath = `documents/${userId}/${fileName}`;

    // Upload to Google Cloud Storage
    const { url, cloudPath: uploadedPath } = await uploadToGoogleCloudStorage(file, cloudPath, {
      caseId: caseId || '',
      clientId: clientId || '',
      tags: tags?.join(',') || '',
      userId
    });

    // Save document info to Firestore
    const documentData: CloudDocument = {
      id: randomId,
      name: file.name,
      type: fileType,
      size: file.size,
      url,
      cloudPath: uploadedPath,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userId,
      caseId,
      clientId,
      tags,
      bucketName: 'al-mizan-law-documents' // Your Google Cloud bucket name
    };

    await setDoc(doc(db, 'cloudDocuments', documentData.id), documentData);

    return documentData;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

export const getDocuments = async (
  userId: string,
  caseId?: string,
  clientId?: string
): Promise<CloudDocument[]> => {
  try {
    let documentsQuery = query(collection(db, 'cloudDocuments'));

    // Apply filters
    if (caseId) {
      documentsQuery = query(documentsQuery, where('caseId', '==', caseId));
    }
    if (clientId) {
      documentsQuery = query(documentsQuery, where('clientId', '==', clientId));
    }

    const snapshot = await getDocs(documentsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CloudDocument[];
  } catch (error) {
    console.error('Error getting documents:', error);
    throw error;
  }
};

export const deleteDocument = async (documentId: string): Promise<void> => {
  try {
    // Get document info
    const docRef = doc(db, 'cloudDocuments', documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const document = docSnap.data() as CloudDocument;
      
      // Delete from Google Cloud Storage
      await callCloudStorageAPI('/delete', {
        bucketName: document.bucketName,
        fileName: document.cloudPath
      });
      
      // Delete from Firestore
      await deleteDoc(docRef);
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

export const updateDocument = async (
  documentId: string,
  updates: Partial<CloudDocument>
): Promise<void> => {
  try {
    const docRef = doc(db, 'cloudDocuments', documentId);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
};

// Utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileIcon = (type: string): string => {
  switch (type) {
    case 'pdf': return '📄';
    case 'word': return '📝';
    case 'excel': return '📊';
    case 'image': return '🖼️';
    default: return '📎';
  }
};

export const isImageFile = (type: string): boolean => {
  return type === 'image';
};

export const isPdfFile = (type: string): boolean => {
  return type === 'pdf';
};

// Google Cloud Storage Configuration
export const GC_CONFIG = {
  bucketName: 'al-mizan-law-documents',
  projectId: 'your-project-id',
  apiKey: 'your-api-key', // In production, use environment variables
  apiEndpoint: 'https://your-backend-api.com/cloud-storage' // Your backend API endpoint
};

// Backend API Functions (for reference)
export const createBackendAPI = () => {
  // This would be implemented in your backend service
  // Example using Node.js with Google Cloud Storage SDK
  
  /*
  const { Storage } = require('@google-cloud/storage');
  const storage = new Storage({
    projectId: GC_CONFIG.projectId,
    keyFilename: 'path/to/service-account-key.json'
  });
  
  const bucket = storage.bucket(GC_CONFIG.bucketName);
  
  // Upload endpoint
  app.post('/api/cloud-storage/upload', async (req, res) => {
    try {
      const { fileName, fileData, contentType } = req.body;
      const buffer = Buffer.from(fileData, 'base64');
      const file = bucket.file(fileName);
      
      await file.save(buffer, {
        metadata: { contentType },
        public: true // Make file publicly accessible
      });
      
      res.json({
        success: true,
        url: `https://storage.googleapis.com/${GC_CONFIG.bucketName}/${fileName}`,
        cloudPath: fileName
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Delete endpoint
  app.post('/api/cloud-storage/delete', async (req, res) => {
    try {
      const { fileName } = req.body;
      await bucket.file(fileName).delete();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  */
};
