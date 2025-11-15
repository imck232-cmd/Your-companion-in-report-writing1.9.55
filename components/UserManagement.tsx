import React, { useState } from 'react';
import { User, Teacher, Permission } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import UserDetailsModal from './UserDetailsModal';

interface UserManagementProps {
    allTeachers: Teacher[];
}

const UserManagement: React.FC<UserManagementProps> = ({ allTeachers }) => {
    const { t } = useLanguage();
    const { users, setUsers, hasPermission } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    if (!hasPermission('manage_users')) {
        return <div className="text-center p-8 text-red-500">You do not have permission to access this page.</div>;
    }

    const generateUniqueCode = async (): Promise<string> => {
        setIsLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const existingCodes = users.map(u => u.code);
            const prompt = `Generate a unique 4-digit numeric code that is not sequential and not in this list: [${existingCodes.join(', ')}]. Respond ONLY with the 4-digit code.`;
            
            let attempts = 0;
            while(attempts < 5) {
                const response: GenerateContentResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });

                const text = response.text?.trim().match(/\d{4}/)?.[0]; // Extract first 4-digit number
                if (text && !existingCodes.includes(text)) {
                    setIsLoading(false);
                    return text;
                }
                attempts++;
            }
            throw new Error("AI failed to generate a unique code.");
        } catch (error) {
            console.error("Code generation failed:", error);
            // Fallback to a random generator
            let randomCode = '';
            do {
                randomCode = Math.floor(1000 + Math.random() * 9000).toString();
            } while (users.map(u => u.code).includes(randomCode));
            setIsLoading(false);
            return randomCode;
        }
    };

    const handleAddNewUser = () => {
        const newUser: User = {
            id: `user-new-${Date.now()}`,
            name: '',
            code: '',
            permissions: [],
            managedTeacherIds: []
        };
        setEditingUser(newUser);
    };
    
    const handleSaveUser = (userToSave: User) => {
        setUsers(prev => {
            const existing = prev.find(u => u.id === userToSave.id);
            if (existing) {
                return prev.map(u => u.id === userToSave.id ? userToSave : u);
            }
            // Fix for new user ID
            const finalNewUser = { ...userToSave, id: `user-${Date.now()}`};
            return [...prev, finalNewUser];
        });
        setEditingUser(null);
    };

    const handleDeleteUser = (userId: string) => {
        if (window.confirm(t('confirmDelete'))) {
            setUsers(prev => prev.filter(u => u.id !== userId));
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
            {editingUser && (
                <UserDetailsModal 
                    user={editingUser}
                    allTeachers={allTeachers}
                    onSave={handleSaveUser}
                    onCancel={() => setEditingUser(null)}
                    generateCode={generateUniqueCode}
                    isGeneratingCode={isLoading}
                />
            )}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-primary">{t('userManagement')}</h2>
                <button onClick={handleAddNewUser} className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors" disabled={isLoading}>
                    + {t('addNewUser')}
                </button>
            </div>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                {users.map(user => (
                    <div key={user.id} className="p-4 border rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-bold">{user.name}</p>
                            <p className="text-sm text-gray-600">Code: <code>{user.code}</code></p>
                            <p className="text-xs text-gray-500">{user.permissions.includes('all') ? t('permission_all') : `${user.permissions.length} permissions`}</p>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => setEditingUser(user)} className="text-sm bg-blue-500 text-white px-3 py-1 rounded-md">{t('edit')}</button>
                             {user.permissions[0] !== 'all' && <button onClick={() => handleDeleteUser(user.id)} className="text-sm bg-red-500 text-white px-3 py-1 rounded-md">{t('delete')}</button>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


export default UserManagement;