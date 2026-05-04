import { Response } from 'express';
import { getLocalizedString } from './locale';

const sendResponse = (res: Response, statusCode: number, success: boolean, data: any, messageKey?: string): void => {
    const lang = (res.req as any).lang || 'en';
    const message = messageKey ? getLocalizedString(messageKey, lang) : '';

    res.status(statusCode).json({
        success,
        data: Array.isArray(data) ? data : (data ? [data] : []),
        message,
        timestamp: new Date().toISOString()
    });
};


export default sendResponse;
