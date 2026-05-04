import { Request, Response, NextFunction } from 'express';
import Subscription from '../../database/models/platform/Subscription';
import { getLocalizedString } from '../utils/locale';

/**
 * Subscription Check Middleware
 * 
 * Validates that the station has an active subscription (trial or paid).
 * Auto-expires trials that have passed 14 days.
 * Super Admins bypass this check.
 */
export const subscriptionCheck = async (req: Request, res: Response, next: NextFunction) => {
    // Super admins bypass subscription checks
    if (req.admin?.isSuperAdmin) {
        return next();
    }

    try {
        const stationId = req.stationId;
        if (!stationId) {
            return res.status(403).json({
                success: false,
                message: getLocalizedString('no_station_assigned', req.lang || 'ar')
            });
        }

        const subscription = await Subscription.findOne({ station: stationId });

        if (!subscription) {
            return res.status(403).json({
                success: false,
                message: 'no_subscription'
            });
        }

        const now = new Date();

        // Auto-expire trials that have passed
        if (subscription.status === 'trial' && now > subscription.trialEnd) {
            subscription.status = 'expired';
            await subscription.save();
            return res.status(403).json({
                success: false,
                message: 'trial_expired'
            });
        }

        // Check active subscription period
        if (subscription.status === 'active' && subscription.currentPeriodEnd && now > subscription.currentPeriodEnd) {
            subscription.status = 'expired';
            await subscription.save();
            return res.status(403).json({
                success: false,
                message: 'subscription_expired'
            });
        }

        // Block expired or cancelled subscriptions
        if (subscription.status === 'expired' || subscription.status === 'cancelled') {
            return res.status(403).json({
                success: false,
                message: 'subscription_inactive'
            });
        }

        // Attach subscription to request for downstream use
        req.subscription = subscription;
        next();

    } catch (error) {
        console.error('[SubscriptionCheck] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'server_error'
        });
    }
};
