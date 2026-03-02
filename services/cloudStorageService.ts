// Google Cloud Storage Service
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { storage, db } from './firebaseConfig';

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
}

// Initialize Google Cloud Storage (using Firebase Storage as backend)
const uploadToCloudStorage = async (
  file: File,
  path: string,
  metadata?: any
): Promise<{ url: string; cloudPath: string }> => {
  try {
    const storageRef = ref(storage, path);
    const uploadMetadata = {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        ...metadata
      }
    };

    await uploadBytes(storageRef, file, uploadMetadata);
    const downloadURL = await getDownloadURL(storageRef);

    return {
      url: downloadURL,
      cloudPath: path
    };
  } catch (error) {
    console.error('Error uploading to cloud storage:', error);
    throw new Error('فشل في رفع الملف إلى التخزين السحابي');
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

    // Upload to cloud storage
    const { url, cloudPath: uploadedPath } = await uploadToCloudStorage(file, cloudPath, {
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
      tags
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
      
      // Delete from cloud storage
      const storageRef = ref(storage, document.cloudPath);
      await deleteObject(storageRef);
      
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
