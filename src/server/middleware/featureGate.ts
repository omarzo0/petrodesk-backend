import { Request, Response, NextFunction } from 'express';
import Subscription from '../../database/models/platform/Subscription';
import Plan from '../../database/models/platform/Plan';

/**
 * Feature Gate Middleware Factory
 * 
 * Returns a middleware that checks if the station's active plan
 * includes the requested feature. During trial, all features are unlocked.
 * 
 * Usage: router.get('/benzene', auth, tenantGuard, subscriptionCheck, requireFeature('benzene'), handler)
 */
export const requireFeature = (featureKey: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Super admins bypass feature checks
        if (req.admin?.isSuperAdmin) {
            return next();
        }

        try {
            const subscription = req.subscription;

            if (!subscription) {
                return res.status(403).json({
                    success: false,
                    message: 'subscription_required'
                });
            }

            // During trial period, all features are unlocked
            if (subscription.status === 'trial') {
                return next();
            }

            // For active subscriptions, check if the plan includes this feature
            if (subscription.plan) {
                const plan = await Plan.findById(subscription.plan);
                if (plan && plan.features.includes(featureKey)) {
                    return next();
                }
            }

            return res.status(403).json({
                success: false,
                message: 'feature_not_available',
                data: { feature: featureKey }
            });

        } catch (error) {
            console.error('[FeatureGate] Error:', error);
            return res.status(500).json({
                success: false,
                message: 'server_error'
            });
        }
    };
};
