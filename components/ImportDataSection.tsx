
import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Report } from '../types';

declare const XLSX: any;

interface ImportDataSectionProps {
    onDataParsed: (data: Partial<Report>) => void;
    formStructure: any; 
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
            reader.onload = (event) => setText(event.target?.result as string);
            reader.readAsText(file);
        } else if (file.name.endsWith('.xlsx')) {
            reader.onload = (event) => {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                setText(XLSX.utils.sheet_to_csv(worksheet));
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const handleFillFields = async () => {
        if (!text.trim()) return;
        setIsLoading(true);
        setError('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `
                Extract structured data from this Arabic educational report text.
                Format the output as valid JSON matching this schema: ${JSON.stringify(formStructure)}.
                
                Rules:
                1. Date: Convert "14‏/12‏/2025" to "2025-12-14".
                2. Status Mapping: 
                   - "مطابق لخطة الوزارة" -> "on_track"
                   - "متقدم عن خطة الوزارة" -> "ahead"
                   - "متأخر عن خطة الوزارة" -> "behind"
                3. Lesson Difference: Extract numbers (e.g., "بعدد 3 دروس" -> "3").
                4. For quantitative stats (e.g. 95%), extract only the number (95).
                5. For qualitative fields (Strategies, Programs, etc), extract text as a newline-separated string.
                6. Branches: Identify sections starting with "📌 فرع:".

                Text:
                ${text}
            `;
            
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            const parsedData = JSON.parse(response.text || '{}');
            onDataParsed(parsedData);
            setText('');
        } catch (err) {
            console.error(err);
            setError("فشل استخراج البيانات. تأكد من جودة النص المحمل.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-4 p-4 border-2 border-indigo-200 bg-indigo-50/30 rounded-xl space-y-3">
            <h4 className="font-bold text-indigo-800 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                تعبئة ذكية من نص أو ملف
            </h4>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full p-3 border rounded-lg h-32 focus:ring-2 focus:ring-indigo-400 text-sm"
                placeholder="ألصق نص التقرير هنا..."
            />
            <div className="flex flex-col sm:flex-row gap-3">
                <input type="file" accept=".txt,.xlsx" onChange={handleFileChange} className="text-xs file:bg-indigo-100 file:border-0 file:rounded-lg file:px-3 file:py-2" />
                <button
                    onClick={handleFillFields}
                    disabled={isLoading}
                    className="flex-grow py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 shadow-md transition-all"
                >
                    {isLoading ? "جاري المعالجة..." : (customButtonLabel || "بدء الاستخراج الذكي")}
                </button>
            </div>
            {error && <p className="text-red-600 text-center text-xs font-bold">{error}</p>}
        </div>
    );
};

export default ImportDataSection;
