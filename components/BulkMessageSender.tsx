import React, { useState } from 'react';
import { BulkMessage, Teacher } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface BulkMessageSenderProps {
    messages: BulkMessage[];
    setMessages: React.Dispatch<React.SetStateAction<BulkMessage[]>>;
    teachers: Teacher[];
}

const BulkMessageSender: React.FC<BulkMessageSenderProps> = ({ messages, setMessages, teachers }) => {
    const { t } = useLanguage();
    const [text, setText] = useState('');
    const [recipientType, setRecipientType] = useState<'all' | 'specific'>('all');
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
    const [showTeacherSelector, setShowTeacherSelector] = useState(false);

    const handleSaveAndSend = () => {
        if (!text.trim()) {
            alert('لا يمكن إرسال رسالة فارغة.');
            return;
        }

        const recipients: string[] = recipientType === 'all' 
            ? teachers.map(t => t.name)
            : teachers.filter(t => selectedTeacherIds.includes(t.id)).map(t => t.name);

        if (recipientType === 'specific' && recipients.length === 0) {
            alert('يرجى اختيار معلم واحد على الأقل.');
            return;
        }

        const newMessage: BulkMessage = {
            id: `msg-${Date.now()}`,
            text,
            date: new Date().toISOString(),
            recipientType,
            recipients
        };
        
        setMessages(prev => [newMessage, ...prev]);

        // Trigger WhatsApp
        const phoneNumbers = recipientType === 'all'
            ? teachers.map(t => t.phoneNumber).filter(Boolean)
            : teachers.filter(t => selectedTeacherIds.includes(t.id)).map(t => t.phoneNumber).filter(Boolean);
        
        // This will open one window. Sending to multiple users programmatically is restricted by WhatsApp.
        // The most reliable way is to open a link with pre-filled text, and the user can then select contacts.
        // We will open a generic link if multiple recipients are chosen.
        const encodedText = encodeURIComponent(text);
        let whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
        if (phoneNumbers.length === 1 && phoneNumbers[0]) {
            whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumbers[0]}&text=${encodedText}`;
        }
        
        window.open(whatsappUrl, '_blank');
        
        // Reset form
        setText('');
        setSelectedTeacherIds([]);
        setRecipientType('all');
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
            <h2 className="text-2xl font-bold text-center text-primary">{t('bulkMessage')}</h2>

            <div className="space-y-4 p-4 border rounded-lg">
                <div>
                    <label htmlFor="messageText" className="block font-semibold mb-2">{t('messageText')}</label>
                    <textarea 
                        id="messageText"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full p-2 border rounded h-32"
                    />
                </div>
                <div>
                    <label className="block font-semibold mb-2">{t('messageRecipient')}</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                            <input type="radio" value="all" checked={recipientType === 'all'} onChange={() => setRecipientType('all')} />
                            {t('sendToAll')}
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="radio" value="specific" checked={recipientType === 'specific'} onChange={() => setRecipientType('specific')} />
                            {t('sendToSpecific')}
                        </label>
                    </div>
                </div>

                {recipientType === 'specific' && (
                     <div className="max-h-48 overflow-y-auto border p-2 rounded">
                        {teachers.map(teacher => (
                            <div key={teacher.id}>
                                <label className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedTeacherIds.includes(teacher.id)} 
                                        onChange={() => {
                                            setSelectedTeacherIds(prev => prev.includes(teacher.id) ? prev.filter(id => id !== teacher.id) : [...prev, teacher.id])
                                        }}
                                    />
                                    {teacher.name}
                                </label>
                            </div>
                        ))}
                    </div>
                )}
                <button onClick={handleSaveAndSend} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">
                    {t('send')}
                </button>
            </div>

            <div className="border-t pt-4">
                <h3 className="text-xl font-semibold text-primary">{t('sentMessagesHistory')}</h3>
                <div className="space-y-3 mt-4 max-h-64 overflow-y-auto">
                    {messages.length > 0 ? messages.map(msg => (
                        <div key={msg.id} className="p-3 bg-gray-50 border rounded">
                            <p className="text-sm text-gray-500">{new Date(msg.date).toLocaleString()}</p>
                            <p className="whitespace-pre-wrap my-2">{msg.text}</p>
                            <p className="text-xs text-gray-600">
                                <strong>{t('messageRecipient')}:</strong> {msg.recipientType === 'all' ? t('sendToAll') : msg.recipients.join(', ')}
                            </p>
                        </div>
                    )) : <p className="text-gray-500">{t('noMessagesYet')}</p>}
                </div>
            </div>
        </div>
    );
};

export default BulkMessageSender;