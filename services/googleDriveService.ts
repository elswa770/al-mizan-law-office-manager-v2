// Google Drive Service for uploading documents

interface GoogleDriveConfig {
  clientId: string;
  apiKey: string;
  discoveryDocs: string[];
  scope: string;
}

interface UploadResponse {
  fileId: string;
  fileName: string;
  webViewLink: string;
  webContentLink: string;
}

class GoogleDriveService {
  private config: GoogleDriveConfig;
  private tokenClient: any;
  private gapiInited: boolean = false;
  private gisInited: boolean = false;

  constructor() {
    // هذه القيم يجب أن تأتي من Google Cloud Console
    this.config = {
      clientId: '287795275811-koblgfsvcc9dhrqqii0bu2equb2p9h4r.apps.googleusercontent.com', // استبدل بـ client_id الفعلي
      apiKey: 'AIzaSyCA2VDVmG7BFfJGH3Lh4Elwh-O4y4GSWlU', // استبدل بـ API key
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      scope: 'https://www.googleapis.com/auth/drive.file'
    };
  }

  // تهيئة Google APIs
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      // التحقق من وجود gapi مسبقاً
      if (window.gapi && window.gapi.client) {
        this.gapiInited = true;
        this.gisInited = true;
        this.restoreToken(); // استعادة الـ token
        this.checkReady(resolve, reject);
        return;
      }

      // تحميل Google APIs
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client', async () => {
          try {
            
            // التحقق من وجود gapi.client قبل التهيئة
            if (!window.gapi.client) {
              throw new Error('Google API client not available');
            }
            
            await window.gapi.client.init({
              apiKey: this.config.apiKey,
              discoveryDocs: this.config.discoveryDocs,
            });
            
            this.gapiInited = true;
            this.restoreToken(); // استعادة الـ token بعد التهيئة
            this.checkReady(resolve, reject);
          } catch (error) {
            console.error('Error initializing Google API client:', error);
            // لا نمنع التشغيل حتى لو فشلت التهيئة
            this.gapiInited = true;
            this.checkReady(resolve, reject);
          }
        });
      };
      script.onerror = () => {
        console.error('Failed to load Google APIs script');
        reject(new Error('Failed to load Google APIs'));
      };
      document.body.appendChild(script);

      // تحميل Google Identity Services
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.onload = () => {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: this.config.clientId,
          scope: this.config.scope,
          callback: (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              window.gapi.client.setToken(tokenResponse);
              this.saveToken(tokenResponse);
              this.checkReady(resolve, reject);
            }
          },
          error_callback: (error: any) => {
            console.error('Google Identity Services error:', error);
            reject(error);
          }
        });
        this.gisInited = true;
        this.checkReady(resolve, reject);
      };
      gisScript.onerror = () => {
        console.error('Failed to load Google Identity Services');
        reject(new Error('Failed to load Google Identity Services'));
      };
      document.body.appendChild(gisScript);
    });
  }

  private checkReady(resolve: Function, reject: Function): void {
    if (this.gapiInited && this.gisInited) {
      resolve();
    }
  }

  // حفظ الـ token في localStorage
  private saveToken(token: any): void {
    try {
      // إضافة وقت انتهاء الصلاحية
      const tokenWithExpiry = {
        ...token,
        expires_at: Date.now(),
        expires_in: token.expires_in || 3600 // ساعة واحدة افتراضياً
      };
      
      localStorage.setItem('google_drive_token', JSON.stringify(tokenWithExpiry));
    } catch (error) {
      console.error('❌ Failed to save token to localStorage:', error);
    }
  }

  // استعادة الـ token من localStorage
  private restoreToken(): void {
    try {
      const savedToken = localStorage.getItem('google_drive_token');
      if (savedToken) {
        const token = JSON.parse(savedToken);
        window.gapi.client.setToken(token);
      }
    } catch (error) {
      console.error('❌ Failed to restore token from localStorage:', error);
    }
  }

  // مسح الـ token من localStorage
  private clearToken(): void {
    try {
      localStorage.removeItem('google_drive_token');
    } catch (error) {
      console.error('❌ Failed to clear token from localStorage:', error);
    }
  }

  // تسجيل الدخول والحصول على رمز الوصول
  async signIn(): Promise<void> {
    if (!this.tokenClient) {
      throw new Error('Google Drive service not initialized');
    }

    return new Promise((resolve, reject) => {
      this.tokenClient.callback = (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
          window.gapi.client.setToken(tokenResponse);
          this.saveToken(tokenResponse); // ✅ حفظ الـ token
          resolve();
        } else {
          reject(new Error('Failed to get access token'));
        }
      };
      this.tokenClient.requestAccessToken({
        prompt: 'consent',
        redirect_uri: window.location.origin
      });
    });
  }

  // إعادة المصادقة تلقائياً عند فشل الـ token
  async reauthenticate(): Promise<void> {
    // مسح الـ token القديم
    this.clearToken();
    
    // محاولة تسجيل الدخول مرة أخرى
    try {
      await this.signIn();
    } catch (error) {
      console.error('❌ Re-authentication failed:', error);
      throw error;
    }
  }

  // رفع ملف إلى Google Drive
  async uploadFile(file: File, folderName?: string): Promise<UploadResponse> {
    try {
      // التحقق من حجم الملف (100MB كحد أقصى)
      const token = window.gapi.client.getToken();
      if (!token || !token.access_token) {
        throw new Error('لم يتم تسجيل الدخول. يرجى تسجيل الدخول إلى Google.');
      }

      // إنشاء مجلدات منظمة
      let folderId = '';
      if (folderName) {
        // إنشاء أو الحصول على مجلد المكتب الرئيسي
        const mainFolderId = await this.getOrCreateFolder('المكتب - الميزان');
        
        // التحقق إذا كان اسم المجلد يبدأ بـ "القضية" أو "الموكل" أو "المحامين"
        if (folderName.startsWith('القضية')) {
          // إنشاء أو الحصول على مجلد القضايا
          const casesFolderId = await this.getOrCreateFolderInParent('القضايا', mainFolderId);
          
          // إنشاء مجلد القضية المحددة
          folderId = await this.getOrCreateFolderInParent(folderName, casesFolderId);
        } else if (folderName.startsWith('الموكل')) {
          // إنشاء أو الحصول على مجلد الموكلين
          const clientsFolderId = await this.getOrCreateFolderInParent('الموكلون', mainFolderId);
          
          // إنشاء مجلد الموكل المحدد
          folderId = await this.getOrCreateFolderInParent(folderName, clientsFolderId);
        } else if (folderName.startsWith('المحامين')) {
          // إنشاء أو الحصول على مجلد المحامين
          const lawyersFolderId = await this.getOrCreateFolderInParent('المحامين', mainFolderId);
          
          // إنشاء مجلد المحامي المحدد
          // استخراج اسم المحامي من المسار
          const lawyerName = folderName.replace('المحامين/', '');
          folderId = await this.getOrCreateFolderInParent(lawyerName, lawyersFolderId);
        } else {
          // افتراضي: ضع في مجلد عام
          folderId = await this.getOrCreateFolderInParent('مستندات عامة', mainFolderId);
        }
        
      }

      const metadata = {
        name: file.name,
        parents: folderId ? [folderId] : undefined,
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      console.log('Sending request to Google Drive API...');
      
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', {
        method: 'POST',
        headers: new Headers({
          'Authorization': `Bearer ${token.access_token}`,
        }),
        body: form,
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        if (response.status === 401) {
          throw new Error('غير مصرح بالوصول. يرجى تسجيل الدخول مرة أخرى.');
        } else if (response.status === 403) {
          throw new Error('ممنوع الوصول. يرجى التحقق من صلاحيات Google Drive.');
        } else if (response.status === 429) {
          throw new Error('تم تجاوز حد الطلبات. يرجى المحاولة بعد قليل.');
        } else if (response.status === 503) {
          throw new Error('خدمة Google Drive غير متاحة حالياً. يرجى المحاولة لاحقاً.');
        } else {
          throw new Error(`فشل الرفع: ${response.status} - ${errorText}`);
        }
      }

      const result = await response.json();
      
      // جعل الملف متاحاً للعامة (معطل مؤقتاً بسبب خطأ API)
      // await this.makeFilePublic(result.id); // معطل مؤقتاً

      return {
        fileId: result.id,
        fileName: result.name,
        webViewLink: result.webViewLink,
        webContentLink: result.webContentLink,
      };
    } catch (error) {
      console.error('Error in uploadFile:', error);
      throw error;
    }
  }

  // البحث عن مجلد أو إنشاؤه
  private async getOrCreateFolder(folderName: string): Promise<string> {
    try {
      
      const token = window.gapi.client.getToken();
      if (!token || !token.access_token) {
        throw new Error('لم يتم تسجيل الدخول. يرجى تسجيل الدخول إلى Google.');
      }

      // البحث عن المجلد باستخدام REST API بدلاً من gapi.client
      console.log('Searching for folder using REST API...');
      try {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(folderName)}'+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)`, {
          method: 'GET',
          headers: new Headers({
            'Authorization': `Bearer ${token.access_token}`,
          }),
        });

        console.log('Search response status:', response.status);
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('فشل البحث عن المجلد: 401 - غير مصرح. يرجى تسجيل الدخول مرة أخرى.');
          } else if (response.status === 403) {
            throw new Error('فشل البحث عن المجلد: 403 - ممنوع. قد تكون هناك مشكلة في API Key أو الصلاحيات.');
          } else {
            const errorText = await response.text();
            throw new Error(`فشل البحث عن المجلد: ${response.status} - ${errorText}`);
          }
        }

        const searchResult = await response.json();
        console.log('Search result:', searchResult);

        if (searchResult.files && searchResult.files.length > 0) {
          console.log('Folder found:', searchResult.files[0]);
          return searchResult.files[0].id;
        }
      } catch (searchError) {
        console.error('Search error:', searchError);
        
        // إذا كان الخطأ 401، حاول إعادة المصادقة
        if (searchError.message.includes('401') || searchError.message.includes('غير مصرح')) {
          console.log('🔄 Token expired, attempting re-authentication...');
          try {
            await this.reauthenticate();
            // إعادة المحاولة بعد إعادة المصادقة
            return await this.getOrCreateFolder(folderName);
          } catch (reauthError) {
            console.error('❌ Re-authentication failed:', reauthError);
            throw searchError;
          }
        }
        
        throw searchError;
      }

      console.log('Creating new folder...');

      // إنشاء مجلد جديد باستخدام REST API
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`فشل إنشاء المجلد: ${createResponse.status}`);
      }

      const createResult = await createResponse.json();
      console.log('Folder created:', createResult);
      return createResult.id;
    } catch (error) {
      console.error('Error getting/creating folder:', error);
      throw error;
    }
  }

  // البحث عن مجلد فرعي أو إنشاؤه داخل مجلد أب
  private async getOrCreateFolderInParent(folderName: string, parentFolderId: string): Promise<string> {
    try {
      console.log(`Searching for subfolder: ${folderName} in parent: ${parentFolderId}`);
      
      const token = window.gapi.client.getToken();
      if (!token || !token.access_token) {
        throw new Error('لم يتم تسجيل الدخول. يرجى تسجيل الدخول إلى Google.');
      }

      // البحث عن المجلد الفرعي داخل المجلد الأب
      const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(folderName)}'+and+mimeType='application/vnd.google-apps.folder'+and+'${parentFolderId}'+in+parents+and+trashed=false&fields=files(id,name)`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
        },
      });

      if (!searchResponse.ok) {
        throw new Error(`فشل البحث عن المجلد الفرعي: ${searchResponse.status}`);
      }

      const searchResult = await searchResponse.json();
      console.log('Subfolder search result:', searchResult);

      if (searchResult.files && searchResult.files.length > 0) {
        console.log('Subfolder found:', searchResult.files[0]);
        return searchResult.files[0].id;
      }

      console.log('Creating new subfolder...');

      // إنشاء مجلد فرعي جديد داخل المجلد الأب
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId],
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`فشل إنشاء المجلد الفرعي: ${createResponse.status}`);
      }

      const createResult = await createResponse.json();
      console.log('Subfolder created:', createResult);
      return createResult.id;
    } catch (error) {
      console.error('Error getting/creating subfolder:', error);
      throw error;
    }
  }

  // جعل الملف متاحاً للعامة
  private async makeFilePublic(fileId: string): Promise<void> {
    try {
      await window.gapi.client.drive.permissions.create({
        fileId: fileId,
        resource: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (error) {
      console.error('Error making file public:', error);
    }
  }

  // حذف ملف
  async deleteFile(fileId: string): Promise<void> {
    try {
      await window.gapi.client.drive.files.delete({
        fileId: fileId,
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // التحقق من تسجيل الدخول
  isSignedIn(): boolean {
    try {
      // التحقق من وجود gapi و client أولاً
      if (!window.gapi || !window.gapi.client) {
        console.log('🔍 isSignedIn: gapi or gapi.client not available');
        return false;
      }
      
      // التحقق من الـ token في الذاكرة أولاً
      const currentToken = window.gapi.client.getToken();
      if (currentToken && currentToken.access_token) {
        // التحقق إذا كان الـ token صالحاً (ليس منتهي الصلاحية)
        const tokenAge = Date.now() - (currentToken.expires_at || 0);
        const tokenExpiresIn = currentToken.expires_in || 3600; // ساعة واحدة افتراضيا
        
        if (tokenAge < tokenExpiresIn * 1000) {
          console.log('🔍 isSignedIn: Valid token found in memory');
          return true;
        } else {
          console.log('🔍 isSignedIn: Token expired, clearing...');
          window.gapi.client.setToken(null);
          this.clearToken();
        }
      }
      
      // إذا لم يوجد في الذاكرة، حاول استعادته من localStorage
      try {
        const savedToken = localStorage.getItem('google_drive_token');
        if (savedToken) {
          const token = JSON.parse(savedToken);
          if (token.access_token) {
            // التحقق من صلاحية الـ token المحفوظ
            const tokenAge = Date.now() - (token.expires_at || 0);
            const tokenExpiresIn = token.expires_in || 3600;
            
            if (tokenAge < tokenExpiresIn * 1000) {
              window.gapi.client.setToken(token);
              console.log('🔍 isSignedIn: Valid token restored from localStorage');
              return true;
            } else {
              console.log('🔍 isSignedIn: Saved token expired, clearing...');
              this.clearToken();
            }
          }
        }
      } catch (error) {
        console.error('❌ Failed to check saved token:', error);
      }
      
      console.log('🔍 isSignedIn: No valid token found');
      return false;
    } catch (error) {
      console.error('❌ Error in isSignedIn:', error);
      return false;
    }
  }

  // تسجيل الخروج
  signOut(): void {
    if (window.gapi?.client?.getToken()) {
      window.gapi.client.setToken(null);
      this.clearToken(); // ✅ مسح الـ token من localStorage
      console.log('✅ Sign-out successful, token cleared');
    }
  }
}

// تصدير الخدمة
export const googleDriveService = new GoogleDriveService();

export type { UploadResponse };

// تعريفات TypeScript للـ Google APIs
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}
