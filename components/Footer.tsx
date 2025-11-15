
import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const WhatsAppIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.267.651 4.383 1.905 6.25l-.275 1.002 1.03 1.018zM8.718 7.243c.133-.336.434-.543.818-.576.43-.034.636.101.804.312.189.231.631 1.52.663 1.623.032.102.05.213-.016.344-.065.131-.229.213-.401.325-.202.129-.41.26-.552.404-.16.161-.318.35-.165.608.175.292.747 1.229 1.624 2.016.994.881 1.866 1.158 2.149 1.24.31.09.462.046.63-.122.19-.184.82-1.022.952-1.229.132-.206.264-.238.44-.152.195.094 1.306.685 1.518.79.212.105.356.161.404.248.048.088.028.471-.124.922-.152.452-.947.881-1.306.922-.32.034-1.127.02-1.748-.227-.753-.3-1.859-1.158-3.041-2.451-1.37-1.52-2.316-3.213-2.316-3.213s-.165-.286-.318-.553c-.152-.267-.32-.287-.462-.287-.132 0-.304.01-.462.01z"/>
    </svg>
);

const RefreshIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm1 14a1 1 0 011-1h5a1 1 0 110 2H6a1 1 0 01-1-1zm10.001-3.666a5.002 5.002 0 00-9.713-1.566 1 1 0 01-1.885-.666A7.002 7.002 0 0115 6.401V4a1 1 0 112 0v5a1 1 0 01-1 1h-5a1 1 0 110-2h2.001z" clipRule="evenodd" />
    </svg>
);


const Footer: React.FC = () => {
    const { t } = useLanguage();

    const handleUpdate = () => {
        window.location.reload();
    };

  return (
    <footer className="mt-8 py-6 text-center text-gray-600" style={{ backgroundColor: 'var(--color-card-bg)', color: 'var(--color-text)', borderTop: '1px solid var(--color-card-border)'}}>
      <div className="container mx-auto">
        <div className="flex justify-center items-center flex-col gap-4 mb-3">
             <a 
                href="https://wa.me/967780804012" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-4 w-full max-w-xs mx-auto p-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors text-lg transform hover:scale-105"
                aria-label={t('contactWhatsApp')}
            >
                <WhatsAppIcon />
                <span>+967 780 804 012</span>
            </a>
            <button
                onClick={handleUpdate}
                className="flex items-center space-x-2 rtl:space-x-reverse text-sky-600 hover:text-sky-700 transition-colors"
                aria-label={t('updateApp')}
            >
                <RefreshIcon />
                <span>{t('updateApp')}</span>
            </button>
        </div>
        <p className="text-sm">{t('allRightsReserved')}</p>
      </div>
    </footer>
  );
};

export default Footer;