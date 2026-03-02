
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const askLegalAssistant = async (prompt: string, context?: string) => {
  if (!ai) {
    throw new Error('Gemini API key is not configured. Please set API_KEY environment variable.');
  }

  try {
    // Upgraded to PRO model for complex legal reasoning
    const model = 'gemini-3-pro-preview';
    
    const systemInstruction = `
      أنت "الميزان"، مستشار قانوني خبير ومحامي نقض مصري متمرس.
      
      دورك ومسؤولياتك:
      1. تحليل الوقائع بدقة متناهية وربطها بنصوص القانون المصري (مدني، جنائي، إداري، إلخ).
      2. استنباط الدفوع القانونية (الشكلية والموضوعية) بناءً على "بيانات القضية" و"سجل الجلسات" و"الاستراتيجية" المقدمة لك.
      3. عند صياغة المذكرات، استخدم لغة قانونية رصينة، مع الاستشهاد بأرقام المواد وأحكام محكمة النقض إن أمكن.
      4. لا تقم بالتأليف في النصوص القانونية؛ إذا لم تكن متأكداً من رقم المادة، اذكر المبدأ القانوني بدقة.
      
      قواعد التعامل مع "سياق القضية" (Context):
      - المعلومات الواردة في السياق هي "حقائق مطلقة" بالنسبة لك.
      - **أولوية قصوى:** انتبه لـ "استراتيجية الدفاع"، "نقاط القوة"، و"نقاط الضعف" المذكورة في السياق. يجب أن تكون إجابتك موجهة لتدعيم هذه الاستراتيجية ومعالجة نقاط الضعف المحددة.
      - راجع "سجل الجلسات" لمعرفة الموقف الإجرائي الحالي (هل تم التأجيل لسبب معين؟ ما هي طلبات المحكمة؟).
      - استخدم أسماء الخصوم وصفاتهم (مدعي/مدعى عليه) بدقة كما وردت.
      
      الأسلوب:
      - مهني، مباشر، ومنظم (استخدم النقاط والعناوين).
      - في القضايا الجنائية: ركز على أركان الجريمة وبطلان الإجراءات.
      - في القضايا المدنية: ركز على الثبوت، الالتزام، والتقادم.
    `;

    // Enable thinking for deep reasoning
    const thinkingBudget = 4096; 

    const response = await ai.models.generateContent({
      model: model,
      contents: context 
        ? `بيانات القضية والمراجع (Context):\n${context}\n\n---\nسؤال المحامي:\n${prompt}` 
        : prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1, // Lower temperature for more factual/deterministic output
        thinkingConfig: { thinkingBudget: thinkingBudget }
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("حدث خطأ أثناء الاتصال بالمساعد الذكي. يرجى المحاولة مرة أخرى.");
  }
};

// --- New Function: Search Legal References Online ---
export const searchLegalReferences = async (query: string) => {
  try {
    const model = 'gemini-3-flash-preview'; // Flash is fine for search

    // Define strict schema for legal references to ensure consistent UI rendering
    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Official title of the law, ruling, or book" },
          type: { type: Type.STRING, enum: ["law", "ruling", "encyclopedia", "regulation"] },
          branch: { type: Type.STRING, enum: ["civil", "criminal", "administrative", "commercial", "family", "labor", "other"] },
          description: { type: Type.STRING, description: "Brief summary" },
          articleNumber: { type: Type.STRING, nullable: true },
          year: { type: Type.INTEGER, nullable: true },
          courtName: { type: Type.STRING, nullable: true },
          author: { type: Type.STRING, nullable: true },
          url: { type: Type.STRING, nullable: true, description: "Direct URL to PDF or official text if found" },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["title", "type", "branch", "description"]
      }
    };

    const prompt = `
      Search for Egyptian legal references (PDFs, Official Gazettes, Court Rulings) related to: "${query}".
      
      Prioritize finding DIRECT LINKS (URLs) to the full text or PDF files hosted on reliable legal websites (e.g., cc.gov.eg, egyptcourt.com, eastlaws, etc.).
      
      If a direct link is found, include it in the 'url' field.
      If no link is found, provide the accurate metadata so we can generate the text later.
      
      Return the results in Arabic as a JSON array matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Enable Internet Access
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1, // Low temperature for factual accuracy
      }
    });

    // Parse the JSON response
    if (response.text) {
      return JSON.parse(response.text);
    }
    return [];

  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw new Error("فشل البحث في المراجع القانونية.");
  }
};

// --- New Function: Fetch Detailed Content for PDF ---
export const fetchDetailedReferenceContent = async (title: string, description: string) => {
  try {
    const model = 'gemini-3-pro-preview'; // Pro for better extraction
    const prompt = `
      أنت تقوم بمهمة "استخراج النص الكامل" لمرجع قانوني مصري.
      المرجع هو: "${title}".
      
      المهمة:
      لا تقم بالتلخيص. أريد النص الكامل للمواد القانونية أو حيثيات الحكم بقدر ما هو متاح في المصادر العامة.
      
      الهيكل المطلوب للمخرج (نص منسق):
      1. العنوان الرسمي وتاريخ الإصدار.
      2. الديباجة (إن وجدت).
      3. **نص المواد / الفقرات كاملاً** (مادة 1: ... ، مادة 2: ...).
      4. إذا كان حكماً قضائياً: اذكر الوقائع، ثم المبادئ القانونية، ثم منطوق الحكم نصاً.
      
      الهدف: هذا النص سيتم تحويله لملف PDF ليستخدمه المحامي في المرافعة، يجب أن يكون دقيقاً وشاملاً جداً.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Grounding for accuracy
        temperature: 0.1, 
      }
    });

    return response.text || "عذراً، لم يتم العثور على محتوى تفصيلي.";
  } catch (error) {
    console.error("Detailed Content Error:", error);
    throw new Error("فشل في جلب تفاصيل المرجع.");
  }
};
