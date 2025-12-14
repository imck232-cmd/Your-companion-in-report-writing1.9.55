
import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Report } from '../types';

declare const XLSX: any;

interface ImportDataSectionProps {
    onDataParsed: (data: Partial<Report>) => void;
    formStructure: any; // Changed to any to allow descriptive values
    customButtonLabel?: string;
}

const ImportDataSection: React.FC<ImportDataSectionProps> = ({ onDataParsed, formStructure, customButtonLabel }) => {
    const { t } = useLanguage();
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        if (file.name.endsWith('.txt')) {
            reader.onload = (event) => {
                setText(event.target?.result as string);
            };
            reader.readAsText(file);
        } else if (file.name.endsWith('.xlsx')) {
            reader.onload = (event) => {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const csvText = XLSX.utils.sheet_to_csv(worksheet);
                setText(csvText);
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert('File type not supported. Please upload .txt or .xlsx');
        }
    };

    // Robust JSON Cleaner function
    const cleanJsonString = (str: string) => {
        // Remove markdown code blocks (```json ... ``` or just ``` ... ```)
        let cleaned = str.replace(/```json/g, '').replace(/```/g, '');
        
        // Find the first '{' and the last '}' to strip any conversational text before or after
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
        
        return cleaned.trim();
    };

    const handleFillFields = async () => {
        if (!text.trim()) return;
        setIsLoading(true);
        setError('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            // The prompt is now engineered specifically for the user's provided format (Rich Text / Emojis)
            const prompt = `
                You are a data extraction engine tailored for Arabic Educational Reports (Rich Text).
                
                **SOURCE TEXT TO ANALYZE:**
                ---
                ${text}
                ---

                **TARGET JSON STRUCTURE:**
                ${JSON.stringify(formStructure, null, 2)}

                **EXTRACTION RULES (Strictly Follow):**
                1. **Anchors:** Use emojis as strong anchors.
                   - *👨‍🏫 المعلم:* -> teacherId (Extract name only)
                   - *📖 المادة:* -> subject (Text before the hyphen)
                   - *🏫 المدرسة:* -> schoolName
                   - *📅 التاريخ:* -> date (Convert to YYYY-MM-DD)
                
                2. **Syllabus Coverage (*📘 السير في المنهج*):**
                   - Look for *📌 فرع:*. Create an object for each branch in 'branches' array.
                   - Status: Map "مطابق" -> "on_track", "متقدم" -> "ahead", "متأخر" -> "behind".
                   - Last Lesson: Text after *✍️ آخر درس:*.
                
                3. **Class Session Evaluation (*تقييم حصة دراسية*):**
                   - **Groups:** Headers starting with *📌* (e.g., *📌 الكفايات الشخصية...*) map to 'criterionGroups'.Match the 'title' fuzzily.
                   - **Criteria:** Inside a group, lines starting with "-" or "•" are criteria.
                   - **Scores:** Look for the pattern "Number / Number" (e.g., "4 / 4"). The FIRST number is the score. Ignore text like (⭐ 100%).
                
                4. **Lists Extraction (Qualitative Data):**
                   - For fields like 'strategiesImplemented', 'toolsUsed', 'positives', 'notesForImprovement':
                   - Find the header (e.g., *💡 الاستراتيجيات المستخدمة:* or *👍 الإيجابيات:*).
                   - Collect ALL lines starting with "-" or "•" immediately following it.
                   - Join them into a single string separated by newlines ("\n"). Do NOT return a JSON array for these fields.
                
                5. **Quantitative Stats:**
                   - Remove "%" signs from numbers (e.g., "100%" -> "100").

                **OUTPUT:**
                Return ONLY valid JSON. No markdown, no comments.
                **IMPORTANT:** Do NOT include 'id' in the output.
            `;
            
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                 config: {
                    temperature: 0.1, // Low temperature for high precision
                }
            });

            const rawText = response.text || '';
            if (!rawText) {
                throw new Error("Received an empty response from the AI.");
            }
            
            const cleanedJson = cleanJsonString(rawText);
            const parsedData = JSON.parse(cleanedJson);
            
            onDataParsed(parsedData);

        } catch (err) {
            console.error("Import Parsing Error:", err);
            setError(t('importError') + " (تأكد من صحة النص أو حاول مرة أخرى)");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-4 p-4 border-t-2 border-indigo-200 bg-indigo-50 rounded-b-lg space-y-3">
            <h4 className="font-semibold text-indigo-800">{t('pasteOrUpload')}</h4>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full p-2 border rounded-md h-32 focus:ring-2 focus:ring-indigo-400 text-base font-mono"
                placeholder="ألصق النص هنا (مثال: *📊 تقرير السير في المنهج* ...)"
            />
            <div className="flex items-center gap-4">
                <input
                    type="file"
                    accept=".txt,.xlsx"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                />
            </div>
            <button
                onClick={handleFillFields}
                disabled={isLoading}
                className="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors shadow-md flex justify-center items-center gap-2"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{t('processingImport')}</span>
                    </>
                ) : (
                    <span>{customButtonLabel || t('fillFields')}</span>
                )}
            </button>
            {error && <p className="text-red-600 text-center font-bold bg-red-100 p-2 rounded">{error}</p>}
        </div>
    );
};

export default ImportDataSection;
