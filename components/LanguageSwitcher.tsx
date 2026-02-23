import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../i18n/translations';

export const LanguageSwitcher: React.FC = () => {
    const { language, setLanguage, t } = useLanguage();
    const [isOpen, setIsOpen] = React.useState(false);

    const languages: { code: Language; name: string; flag: string }[] = [
        { code: 'ar', name: 'العربية', flag: '🇸🇦' },
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    ];

    const currentLang = languages.find(l => l.code === language);

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                }}
            >
                <Languages size={18} />
                <span>{currentLang?.flag} {currentLang?.name}</span>
            </button>

            {isOpen && (
                <>
                    <div
                        onClick={() => setIsOpen(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999,
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            right: 0,
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            minWidth: '160px',
                            zIndex: 1000,
                            overflow: 'hidden',
                        }}
                    >
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    setLanguage(lang.code);
                                    setIsOpen(false);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: language === lang.code ? '#f3f4f6' : 'white',
                                    border: 'none',
                                    color: '#1f2937',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: language === lang.code ? '600' : '400',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    if (language !== lang.code) {
                                        e.currentTarget.style.background = '#f9fafb';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (language !== lang.code) {
                                        e.currentTarget.style.background = 'white';
                                    }
                                }}
                            >
                                <span style={{ fontSize: '20px' }}>{lang.flag}</span>
                                <span>{lang.name}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
