import { Request, Response } from 'express';
import Station from '../../database/models/platform/Station';
import Subscription from '../../database/models/platform/Subscription';
import Payment from '../../database/models/platform/Payment';
import Ticket from '../../database/models/platform/Ticket';
import Warning from '../../database/models/platform/Warning';
import sendResponse from '../../server/utils/responseHandler';

// @desc    Get global overview (everything in platform)
// @route   GET /api/platform/overview
export const getPlatformOverview = async (req: Request, res: Response) => {
    try {
        const userRole = req.admin?.role;
        const isEmployee = userRole === 'employee';

        const totalStations = await Station.countDocuments();
        const activeStations = await Station.countDocuments({ isActive: true });

        const subscriptions = await Subscription.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const tickets = await Ticket.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const warnings = await Warning.countDocuments({ isResolved: false });

        // Financial data (Super Admin & Admin Only)
        let finances = { totalRevenue: 0, paymentCount: 0 };
        let recentActivity: any[] = [];

        if (!isEmployee) {
            const payments = await Payment.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]);

            finances = {
                totalRevenue: payments[0]?.total || 0,
                paymentCount: payments[0]?.count || 0
            };

            recentActivity = await Payment.find()
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('station', 'name code');
        }

        sendResponse(res, 200, true, {
            stations: {
                total: totalStations,
                active: activeStations,
                inactive: totalStations - activeStations
            },
            subscriptions: subscriptions.reduce((acc: any, curr: any) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {}),
            finances: isEmployee ? null : finances,
            support: {
                tickets: tickets.reduce((acc: any, curr: any) => {
                    acc[curr._id] = curr.count;
                    return acc;
                }, {}),
                openWarnings: warnings
            },
            recentActivity: isEmployee ? [] : recentActivity
        });
    } catch (error) {
        console.error('[getPlatformOverview]', error);
        sendResponse(res, 500, false, null, 'server_error');
    }
};
