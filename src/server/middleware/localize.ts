import { Request, Response, NextFunction } from 'express';

const localize = (req: Request, res: Response, next: NextFunction) => {
    let lang = 'ar'; // Default

    // 1. Check Query Param
    if (req.query.lang && (req.query.lang === 'ar' || req.query.lang === 'en')) {
        lang = req.query.lang as string;
        (req as any).langExplicit = true;
    }
    // 2. Check Custom Header
    else if (req.headers['x-lang'] && (req.headers['x-lang'] === 'ar' || req.headers['x-lang'] === 'en')) {
        lang = req.headers['x-lang'] as string;
        (req as any).langExplicit = true;
    }
    // 3. Check Browser Accept-Language
    else {
        const acceptLang = req.headers['accept-language'];
        if (acceptLang && acceptLang.startsWith('en')) {
            lang = 'en';
        }
    }

    req.lang = lang;
    next();
};

export default localize;
