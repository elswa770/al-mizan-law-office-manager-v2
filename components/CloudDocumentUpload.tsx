// Cloud Document Upload Component
import React, { useState, useRef } from 'react';
import { Upload, File, X, Eye, Download, Trash2, FolderOpen, Tag, Calendar, User } from 'lucide-react';
import { uploadDocument, getDocuments, deleteDocument, CloudDocument, formatFileSize, getFileIcon } from '../services/cloudStorageService';
import { getAuth } from 'firebase/auth';

interface CloudDocumentUploadProps {
  caseId?: string;
  clientId?: string;
  onDocumentUploaded?: (document: CloudDocument) => void;
}

const CloudDocumentUpload: React.FC<CloudDocumentUploadProps> = ({
  caseId,
  clientId,
  onDocumentUploaded
}) => {
  const [documents, setDocuments] = useState<CloudDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [previewDoc, setPreviewDoc] = useState<CloudDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUser = getAuth().currentUser;

  // Load documents on component mount
  React.useEffect(() => {
    loadDocuments();
  }, [caseId, clientId]);

  const loadDocuments = async () => {
    if (!currentUser) return;
    
    try {
      const docs = await getDocuments(currentUser.uid, caseId, clientId);
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !currentUser) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const document = await uploadDocument(
        selectedFile,
        currentUser.uid,
        caseId,
        clientId,
        tags
      );

      setDocuments(prev => [document, ...prev]);
      setSelectedFile(null);
      setTags([]);
      setTagInput('');
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onDocumentUploaded?.(document);
      
      // Simulate progress
      setUploadProgress(100);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Error uploading document:', error);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستند؟')) return;

    try {
      await deleteDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      if (previewDoc?.id === documentId) {
        setPreviewDoc(null);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleDownload = (doc: CloudDocument) => {
    const link = document.createElement('a') as HTMLAnchorElement;
    link.href = doc.url;
    link.download = doc.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (doc: CloudDocument) => {
    setPreviewDoc(doc);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Upload Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" />
          رفع المستندات للتخزين السحابي
        </h3>

        <div className="space-y-4">
          {/* File Selection */}
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <File className="w-4 h-4 inline ml-2" />
              اختر ملف
            </button>

            {selectedFile && (
              <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                <p>الملف المحدد: <strong>{selectedFile.name}</strong></p>
                <p>الحجم: {formatFileSize(selectedFile.size)}</p>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              الوسوم (اختياري)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="أضف وسماً ثم اضغط Enter"
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
              />
              <button
                onClick={handleAddTag}
                className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <Tag className="w-4 h-4" />
              </button>
            </div>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-blue-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                جاري الرفع... {uploadProgress}%
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" />
                رفع المستند
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-blue-600" />
          المستندات المرفوعة ({documents.length})
        </h3>

        {documents.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p>لا توجد مستندات مرفوعة بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">{getFileIcon(doc.type)}</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-800 dark:text-white">{doc.name}</h4>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(doc.uploadedAt).toLocaleDateString('ar-EG')}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {doc.uploadedBy}
                      </span>
                      <span>{formatFileSize(doc.size)}</span>
                    </div>
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {doc.tags.map(tag => (
                          <span
                            key={tag}
                            className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePreview(doc)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="معاينة"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                    title="تحميل"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-4xl max-h-[90vh] w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {previewDoc.name}
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              {previewDoc.type === 'image' ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-w-full h-auto rounded-lg"
                />
              ) : previewDoc.type === 'pdf' ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-[600px] rounded-lg"
                  title={previewDoc.name}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    لا يمكن معاينة هذا النوع من الملفات
                  </p>
                  <button
                    onClick={() => handleDownload(previewDoc)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4 inline ml-2" />
                    تحميل الملف
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CloudDocumentUpload;
