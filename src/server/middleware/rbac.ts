import { Request, Response, NextFunction } from 'express';
import { getLocalizedString } from '../utils/locale';
import { platformPermissions, PlatformModule, PlatformAction, PlatformRole } from '../../config/platformPermissions';
import { stationPermissions, StationModule, StationAction, StationRole } from '../../config/stationPermissions';

/**
 * RBAC middleware for platform roles using centralized permissions.
 * Usage: platformCan('station', 'create')
 */
export const platformCan = (module: PlatformModule, action: PlatformAction) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.admin?.userType !== 'platform') {
            return res.status(403).json({
                success: false,
                message: getLocalizedString('forbidden_platform_staff', req.lang || 'ar')
            });
        }

        const userRole = req.admin.role as PlatformRole;
        const allowedActions = platformPermissions[userRole]?.[module] || [];

        if (!allowedActions.includes(action)) {
            return res.status(403).json({
                success: false,
                message: getLocalizedString('forbidden_role_access', req.lang || 'ar')
            });
        }

        next();
    };
};

/**
 * RBAC middleware for station roles using centralized permissions.
 * Usage: stationCan('benzene', 'create')
 */
export const stationCan = (module: StationModule, action: StationAction) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.admin) return res.status(401).json({ success: false, message: 'unauthorized' });

        const userRole = req.admin.role as string;

        // 1. Platform Super Admin bypasses station module checks
        if (req.admin.userType === 'platform' && userRole === 'super_admin') {
            return next();
        }

        // 2. All other roles must be Station users
        if (req.admin.userType !== 'station') {
            return res.status(403).json({
                success: false,
                message: getLocalizedString('forbidden_access', req.lang || 'ar')
            });
        }

        // 3. Matrix-based check for station roles
        const normalizedRole = userRole.toLowerCase() as StationRole;
        const allowedActions = stationPermissions[normalizedRole]?.[module] || [];

        if (!allowedActions.includes(action)) {
            return res.status(403).json({
                success: false,
                message: getLocalizedString('forbidden_role_access', req.lang || 'ar')
            });
        }

        next();
    };
};
