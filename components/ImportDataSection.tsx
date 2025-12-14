
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
            const prompt = `
                You are a precise data extraction engine. Your job is to parse the "Report Text" and map it to the "Target Structure".
                
                **CRITICAL EXTRACTION RULES:**
                1. **Exact Matches:** Use the emojis and labels in the text as anchors. For example, if looking for "School", find the text after "*🏫 المدرسة:*".
                2. **Branches Array:** The text contains repeated blocks for branches (e.g., *📌 فرع: إيمان*, *📌 فرع: حديث*). You MUST extract ALL of them into the 'branches' array. Do not miss any branch.
                3. **Bullet Point Lists:** For fields like 'strategiesImplemented', 'toolsUsed', 'sourcesUsed', 'testsDelivered':
                   - Look for the header (e.g., *💡 الاستراتيجيات المستخدمة:*).
                   - Collect ALL lines immediately following it that start with a dash (-) or dot.
                   - Join them into a single string separated by newlines.
                4. **Status Mapping:** 
                   - If text says "مطابق لخطة الوزارة" -> set 'status' to "on_track".
                   - If text says "متقدم" -> set 'status' to "ahead".
                   - If text says "متأخر" -> set 'status' to "behind".
                5. **Numbers:** Remove '%' signs for percentage fields (e.g., convert "90%" to "90").
                6. **Dates:** Format dates as YYYY-MM-DD.
                
                **Target Structure (JSON):**
                ${JSON.stringify(formStructure, null, 2)}

                **Report Text to Analyze:**
                ${text}
                
                **Output:**
                Return ONLY valid JSON. No markdown, no explanations.
            `;
            
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                 config: {
                    temperature: 0.1, 
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
                className="w-full p-2 border rounded-md h-32 focus:ring-2 focus:ring-indigo-400"
                placeholder="ألصق النص هنا..."
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
