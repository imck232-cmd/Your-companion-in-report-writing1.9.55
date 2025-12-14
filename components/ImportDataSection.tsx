
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
                You are a highly accurate data extraction engine specifically for Arabic educational reports.
                
                **Task:**
                Extract data from the provided "Report Text" and map it to the fields in the "Target Structure".
                
                **Rules:**
                1. **Exact Extraction:** Look for values corresponding to the descriptions provided in the "Target Structure" values.
                2. **Numbers Only:** For fields asking for percentages or counts (like correction, preparation, meetings), extract ONLY the number. Remove '%' signs or words like 'lessons'.
                3. **Text Fields:** For lists (strategies, tools), extract them as a single string. If multiple items, separate them with newlines or commas.
                4. **Teacher Name:** Identify the teacher's name accurately.
                5. **JSON Output:** Return ONLY a valid, parseable JSON object. NO Markdown formatting, NO comments, NO extra text.

                **Target Structure (Keys are field names, Values are descriptions of what to find):**
                ---
                ${JSON.stringify(formStructure, null, 2)}
                ---

                **Report Text to Analyze:**
                ---
                ${text}
                ---
            `;
            
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                 config: {
                    // We remove responseMimeType: "application/json" to avoid strict schema constraints 
                    // that might conflict with the 'any' structure, relying on prompt engineering instead.
                    temperature: 0.1, // Lower temperature for more deterministic results
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
