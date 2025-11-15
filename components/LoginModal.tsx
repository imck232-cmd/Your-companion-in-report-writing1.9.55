import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { School } from '../types';

interface LoginModalProps {
    schools: School[];
    addSchool: (name: string) => void;
}

const EyeIcon: React.FC<{ visible: boolean }> = ({ visible }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {visible ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 3.029m0 0l-2.14 2.14" />
        )}
    </svg>
);

const LoginModal: React.FC<LoginModalProps> = ({ schools, addSchool }) => {
    const { t } = useLanguage();
    const { login, selectedSchool, academicYear: initialYear } = useAuth();
    const [school, setSchool] = useState(selectedSchool || (schools.length > 0 ? schools[0].name : ''));
    const [academicYear, setAcademicYear] = useState(initialYear || '');
    const [username, setUsername] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [showCode, setShowCode] = useState(false);
    const [newSchoolName, setNewSchoolName] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!school || !academicYear || !username || !code) {
            setError('يرجى ملء جميع الحقول.');
            return;
        }
        const success = login(username, code, school, academicYear);
        if (!success) {
            setError(t('loginError'));
        }
    };

    const handleAddSchool = () => {
        if (newSchoolName.trim()) {
            addSchool(newSchoolName.trim());
            setSchool(newSchoolName.trim());
            setNewSchoolName('');
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-100 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                <h1 className="text-3xl font-bold text-primary mb-2 text-center">{t('appTitle')}</h1>
                <p className="text-gray-500 text-center mb-6">{t('preparedBy')}</p>
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-center">{error}</p>}
                
                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label htmlFor="school" className="block font-semibold text-gray-700 mb-1">{t('schoolName')}</label>
                        <select id="school" value={school} onChange={e => setSchool(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-primary focus:border-primary">
                            {schools.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                        <div className="flex gap-2 mt-2">
                             <input type="text" placeholder={t('addSchool')} value={newSchoolName} onChange={e => setNewSchoolName(e.target.value)} className="flex-grow p-2 border rounded-lg" />
                             <button type="button" onClick={handleAddSchool} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">{t('add')}</button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="academicYear" className="block font-semibold text-gray-700 mb-1">{t('academicYear')}</label>
                        <input type="text" id="academicYear" placeholder={t('academicYearPlaceholder')} value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-primary focus:border-primary" />
                    </div>

                    <div>
                        <label htmlFor="username" className="block font-semibold text-gray-700 mb-1">{t('username')}</label>
                        <input type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-primary focus:border-primary" />
                    </div>

                    <div>
                        <label htmlFor="code" className="block font-semibold text-gray-700 mb-1">{t('userCode')}</label>
                        <div className="relative">
                            <input type={showCode ? 'text' : 'password'} id="code" value={code} onChange={e => setCode(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-primary focus:border-primary" />
                            <button type="button" onClick={() => setShowCode(!showCode)} className="absolute inset-y-0 end-0 flex items-center px-3">
                                <EyeIcon visible={showCode} />
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="w-full p-4 bg-primary text-white font-bold rounded-lg text-lg hover:bg-opacity-90 transition-all transform hover:scale-105">
                        {t('login')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginModal;