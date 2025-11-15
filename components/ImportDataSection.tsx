import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Report } from '../types';

declare const XLSX: any;

interface ImportDataSectionProps {
    onDataParsed: (data: Partial<Report>) => void;
    formStructure: Partial<Report>;
}

const ImportDataSection: React.FC<ImportDataSectionProps> = ({ onDataParsed, formStructure }) => {
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

    const handleFillFields = async () => {
        if (!text.trim()) return;
        setIsLoading(true);
        setError('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `
                You are an expert data extraction assistant for teacher evaluations. Analyze the following report text and populate the provided JSON structure with the extracted information.

                **Instructions:**
                1.  **Read the Report Text:** Carefully read the entire text provided.
                2.  **Match Criteria:** For each item in the JSON "criteria" or "criterionGroups" array, find the most relevant part of the report text. Based on the text's sentiment (e.g., "excellent", "needs improvement", "good performance") or any explicit rating, assign a numerical score from 0 (very poor) to 4 (excellent). Use the exact "label" from the provided JSON structure.
                3.  **Extract Text Fields:** For fields like "positives", "recommendations", "strategies", etc., extract and summarize the corresponding information from the report text.
                4.  **Extract Header Data:** Find and fill in the "date", "subject", "grades", etc.
                5.  **Return JSON Only:** Your entire response must be ONLY the populated JSON object. Do not include any extra text, explanations, or markdown formatting like \`\`\`json.

                **JSON Structure to Populate:**
                ---
                ${JSON.stringify(formStructure, null, 2)}
                ---

                **Report Text:**
                ---
                ${text}
                ---
            `;
            
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                 config: {
                    responseMimeType: "application/json",
                }
            });

            const responseText = response.text?.trim();
            if (!responseText) {
                throw new Error("Received an empty response from the AI.");
            }
            
            const parsedData = JSON.parse(responseText);
            onDataParsed(parsedData);

        } catch (err) {
            console.error(err);
            setError(t('importError'));
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
                className="w-full p-2 border rounded-md h-32"
                placeholder="ألصق النص هنا..."
            />
            <input
                type="file"
                accept=".txt,.xlsx"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
            />
            <button
                onClick={handleFillFields}
                disabled={isLoading}
                className="w-full px-6 py-3 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 disabled:bg-indigo-300 transition-colors"
            >
                {isLoading ? t('processingImport') : t('fillFields')}
            </button>
            {error && <p className="text-red-600 text-center">{error}</p>}
        </div>
    );
};

export default ImportDataSection;