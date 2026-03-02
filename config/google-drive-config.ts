// Google Drive Configuration
// قم بتحديث هذه القيم من Google Cloud Console

export const GOOGLE_DRIVE_CONFIG = {
  // استبدل هذه القيم بالقيم الفعلية من Google Cloud Console
  CLIENT_ID: '287795275811-koblgfsvcc9dhrqqii0bu2equb2p9h4r.apps.googleusercontent.com',
  API_KEY: 'AIzaSyCA2VDVmG7BFfJGH3Lh4Elwh-O4y4GSWlU',
  
  // لا تقم بتغيير هذه القيم
  DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
  SCOPE: 'https://www.googleapis.com/auth/drive.file',
  
  // إعدادات المجلدات
  FOLDER_STRUCTURE: {
    BASE_FOLDER: 'Al-Mizan-Law-Office',
    CASES_FOLDER: 'Cases',
    DOCUMENTS_FOLDER: 'Documents'
  }
};

// تعليمات الإعداد:
/*
1. اذهب إلى https://console.cloud.google.com/
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. فعل Google Drive API من APIs & Services > Library
4. أنشئ OAuth 2.0 Client ID من APIs & Services > Credentials
5. اختر Web application
6. أضف URIs المسموح بها:
   - http://localhost:3000
   - http://localhost:5173
   - https://your-domain.com
7. انسخ Client ID و API key هنا
8. حمّل ملف client_secret.json واحفظه في مكان آمن
*/
