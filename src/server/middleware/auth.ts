import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { getLocalizedString } from '../utils/locale';
import { ENV } from '../../config';
import StationUser from '../../database/models/station/StationUser';
import PlatformUser from '../../database/models/platform/PlatformUser';

/**
 * Main authentication middleware.
 * Verifies JWT and attaches decoded user info to req.admin.
 */
export const auth = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.header('Authorization');
    const token = authHeader?.toLowerCase().startsWith('bearer ')
        ? authHeader.substring(7).trim()
        : authHeader?.trim();

    if (!token) {
        return res.status(401).json({
            success: false,
            message: getLocalizedString('unauthorized', req.lang || 'ar')
        });
    }

    try {
        const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;

        // Database check for ban status
        let user;
        if (decoded.userType === 'platform') {
            user = await PlatformUser.findById(decoded.id);
        } else {
            user = await StationUser.findById(decoded.id);
        }

        if (!user || (user as any).isBanned) {
            return res.status(401).json({
                success: false,
                message: getLocalizedString((user as any)?.isBanned ? 'account_banned' : 'unauthorized', req.lang || 'ar')
            });
        }

        req.admin = decoded;

        if (decoded.language && !(req as any).langExplicit) {
            req.lang = decoded.language;
        }

        next();
    } catch (error: any) {
        res.status(401).json({
            success: false,
            message: getLocalizedString('invalid_token', req.lang || 'ar')
        });
    }
};

/**
 * Middleware to restrict access to Admins (Platform or Station level).
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
    const role = req.admin?.role;
    // Station Admins or Platform Admins/SuperAdmins pass
    if (role !== 'admin' && role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: getLocalizedString('forbidden_admin', req.lang || 'ar')
        });
    }
    next();
};

/**
 * Middleware to restrict access to Platform Super Admins only.
 */
export const superAdminOnly = (req: Request, res: Response, next: NextFunction) => {
    if (req.admin?.userType !== 'platform' || req.admin?.role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: getLocalizedString('forbidden_super_admin', req.lang || 'ar')
        });
    }
    next();
};

/**
 * Middleware to restrict access to Platform Staff (SuperAdmin, Admin, Employee).
 */
export const platformStaffOnly = (req: Request, res: Response, next: NextFunction) => {
    if (req.admin?.userType !== 'platform') {
        return res.status(403).json({
            success: false,
            message: getLocalizedString('forbidden_platform_staff', req.lang || 'ar')
        });
    }
    next();
};
