/**
 * A simple Arabic NLP utility to convert a verb phrase to a noun phrase (masdar).
 * This is a rule-based approach and may not cover all grammatical cases,
 * but it's designed to work for the specific criteria in this application.
 */

// Mapping of common verb prefixes to their masdar patterns.
const masdarPatterns: { [key: string]: (root: string) => string } = {
    'يستخدم': (root) => `استخدام ${root}`,
    'يظهر': (root) => `إظهار ${root}`,
    'يتحدث': (root) => `التحدث ${root}`,
    'يسير': (root) => `السير ${root}`,
    'يقدم': (root) => `تقديم ${root}`,
    'يربط': (root) => `ربط ${root}`,
    'يحافظ': (root) => `المحافظة ${root}`,
    'يدير': (root) => `إدارة ${root}`,
    'يساهم': (root) => `المساهمة ${root}`,
    'يوزع': (root) => `توزيع ${root}`,
    'يهيئ': (root) => `تهيئة ${root}`,
    'يمهد': (root) => `التمهيد ${root}`,
    'يراعي': (root) => `مراعاة ${root}`,
    'ينمي': (root) => `تنمية ${root}`,
    'يفعل': (root) => `تفعيل ${root}`,
    'يطرح': (root) => `طرح ${root}`,
    'يتابع': (root) => `متابعة ${root}`,
    'يغلق': (root) => `إغلاق ${root}`,
    'يمارس': (root) => `ممارسة ${root}`,
    'يوظف': (root) => `توظيف ${root}`,
    'يقيس': (root) => `قياس ${root}`,
    'ينفذ': (root) => `تنفيذ ${root}`,
    'يهتم': (root) => `الاهتمام ${root}`,
    'يحترم': (root) => `احترام ${root}`,
    'يثق': (root) => `الثقة ${root}`,
    'يحدد': (root) => `تحديد ${root}`,
    'يكتب': (root) => `كتابة ${root}`,
    'يوضح': (root) => `توضيح ${root}`,
    'يتدرج': (root) => `التدرج ${root}`,
    'يكثر': (root) => `الإكثار ${root}`,
    'يصحح': (root) => `تصحيح ${root}`,
    'يعتمد': (root) => `الاعتماد ${root}`,
    'يضع': (root) => `وضع ${root}`,
    'ينوع': (root) => `تنويع ${root}`,
    'يشرك': (root) => `إشراك ${root}`,
    'يحسن': (root) => `إحسان ${root}`,
    'يتم': (root) => `توظيف ${root}`, // Special case
    'يشارك': (root) => `مشاركة ${root}`,
    'يتفاعل': (root) => `التفاعل ${root}`,
    'يعزز': (root) => `تعزيز ${root}`,
    'ينهي': (root) => `إنهاء ${root}`,
};


export const verbToMasdar = (verbPhrase: string): string => {
    const words = verbPhrase.split(' ');
    const firstWord = words[0];
    const restOfPhrase = words.slice(1).join(' ');

    if (masdarPatterns[firstWord]) {
        return masdarPatterns[firstWord](restOfPhrase);
    }
    
    // Fallback for simple verbs starting with 'ي'
    if (firstWord.startsWith('ي')) {
        const root = firstWord.substring(1);
        // This is a very basic fallback and might not be grammatically correct.
        // For example, يكتب -> كتابة. A simple rule cannot deduce this.
        // We rely on the pattern list above for accuracy.
        // If not found, returning the phrase as is might be safer.
        return verbPhrase; 
    }

    return verbPhrase; // Return original if no pattern matches
};