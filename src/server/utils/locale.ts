import fs from 'fs';
import path from 'path';

interface LocaleMessages {
    [key: string]: string;
}

const loadLocale = (lang: string): LocaleMessages => {
    try {
        const filePath = path.join(process.cwd(), 'locales', lang, 'translation.json');
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error loading locale ${lang}:`, error);
        return {};
    }
};

const locales: { [key: string]: LocaleMessages } = {
    en: loadLocale('en'),
    ar: loadLocale('ar'),
};

export const getLocalizedString = (key: string, lang: string = 'ar'): string => {
    const messages = locales[lang] || locales['en'] || {};
    return messages[key] || key;
};

export default { getLocalizedString };
