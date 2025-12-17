
import React from 'react';

const ScrollButtons: React.FC = () => {
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const scrollToBottom = () => {
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
        });
    };

    return (
        <div className="fixed bottom-6 left-6 flex flex-col gap-3 z-[100] no-print">
            {/* زر الصعود للأعلى */}
            <button
                onClick={scrollToTop}
                className="w-12 h-12 bg-primary text-white rounded-full shadow-lg hover:bg-primary-light transition-all duration-300 flex items-center justify-center transform hover:scale-110 active:scale-95 border-2 border-white/20"
                title="العودة للأعلى"
                aria-label="Scroll to top"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" />
                </svg>
            </button>

            {/* زر النزول للأسفل */}
            <button
                onClick={scrollToBottom}
                className="w-12 h-12 bg-warning text-white rounded-full shadow-lg hover:opacity-90 transition-all duration-300 flex items-center justify-center transform hover:scale-110 active:scale-95 border-2 border-white/20"
                title="الوصول للأسفل"
                aria-label="Scroll to bottom"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
        </div>
    );
};

export default ScrollButtons;
