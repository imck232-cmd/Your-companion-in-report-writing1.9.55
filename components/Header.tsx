import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { THEMES } from '../constants';

interface HeaderProps {
    currentTheme: string;
    setTheme: (theme: string) => void;
    selectedSchool: string | null;
    onChangeSchool: () => void;
}

const ThemeIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
);


const Header: React.FC<HeaderProps> = ({ currentTheme, setTheme, selectedSchool, onChangeSchool }) => {
  const { t, language, toggleLanguage } = useLanguage();
  const { academicYear, logout, hasPermission } = useAuth();
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  return (
    <header className="bg-header-bg text-header-text shadow-lg" style={{ backgroundColor: 'var(--color-header-bg)', color: 'var(--color-header-text)' }}>
      <div className="container mx-auto px-6 py-4 flex flex-col items-center gap-4">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold">{t('appTitle')}</h1>
          {selectedSchool && <p className="mt-2 text-gray-200" style={{ opacity: 0.9 }}>{t('currentSchool')}: <span className="font-bold">{selectedSchool}</span></p>}
          {academicYear && <p className="mt-1 text-sm text-gray-200" style={{ opacity: 0.9 }}>{t('academicYear')}: <span className="font-bold">{academicYear}</span></p>}
          <p className="mt-1 text-sm text-gray-300" style={{ opacity: 0.8 }}>{t('preparedBy')}</p>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-2 relative">
            {hasPermission('change_school') && (
                 <button
                    onClick={onChangeSchool}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm transform hover:scale-105"
                >
                    {t('changeSchool')}
                </button>
            )}
            <button
                onClick={toggleLanguage}
                className="bg-primary-light hover:bg-opacity-80 text-white font-bold py-2 px-5 rounded-lg transition-all duration-300 transform hover:scale-105"
                 style={{ backgroundColor: 'var(--color-primary-light)' }}
            >
                {t('toggleLanguage')}
            </button>
            <div className="relative">
                <button
                    onClick={() => setShowThemeMenu(!showThemeMenu)}
                    className="p-2 rounded-full bg-primary-light hover:bg-opacity-80 text-white transition-all duration-300 transform hover:scale-110"
                    title={t('changeTheme')}
                    style={{ backgroundColor: 'var(--color-primary-light)' }}
                >
                    <ThemeIcon />
                </button>
                {showThemeMenu && (
                    <div className={`absolute ${language === 'ar' ? 'left-0' : 'right-0'} mt-2 w-48 bg-white rounded-md shadow-lg z-20`}>
                        <ul className="py-1">
                            {Object.entries(THEMES).map(([key, theme]) => (
                                <li key={key}>
                                    <a
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setTheme(key);
                                            setShowThemeMenu(false);
                                        }}
                                        className={`block px-4 py-2 text-sm ${currentTheme === key ? 'font-bold text-primary' : 'text-gray-700'} hover:bg-gray-100`}
                                    >
                                        {theme.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
             <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
            >
                {t('logout')}
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
