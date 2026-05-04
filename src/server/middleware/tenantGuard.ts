import { Request, Response, NextFunction } from 'express';
import { getLocalizedString } from '../utils/locale';
import Station from '../../database/models/platform/Station';

/**
 * Tenant Guard Middleware
 * 
 * Extracts stationId from the authenticated user's JWT and attaches it to req.stationId.
 * Platform Super Admins bypass this check to manage all data.
 * Station users are strictly scoped to their own station.
 */
export const tenantGuard = async (req: Request, res: Response, next: NextFunction) => {
    // Platform Super Admins can access all stations
    const admin = (req as any).admin;
    if (admin?.userType === 'platform' && admin?.isSuperAdmin) {
        return next();
    }

    const stationId = admin?.station;
    if (!stationId) {
        return res.status(403).json({
            success: false,
            message: getLocalizedString('no_station_assigned', (req as any).lang || 'ar')
        });
    }

    // Check if station is banned
    const station = await Station.findById(stationId);
    if (!station || station.isBanned) {
        return res.status(403).json({
            success: false,
            message: getLocalizedString(station?.isBanned ? 'station_banned' : 'station_not_found', (req as any).lang || 'ar')
        });
    }

    // Attach stationId to request for all downstream controllers
    (req as any).stationId = stationId;
    next();
};
