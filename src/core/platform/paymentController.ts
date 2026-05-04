import { Request, Response } from 'express';
import Payment from '../../database/models/platform/Payment';
import Subscription from '../../database/models/platform/Subscription';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

// @desc    Record a payment
// @route   POST /api/platform/payments
export const createPayment = async (req: Request, res: Response) => {
    try {
        const { stationId, subscriptionId, amount, method, reference, notes } = req.body;

        const payment = await Payment.create({
            station: stationId,
            subscription: subscriptionId,
            amount,
            method: method || 'manual',
            status: 'pending',
            reference,
            notes,
        });

        await logActivity(req.admin, 'CREATE', 'Payment', `Recorded payment of ${amount} EGP for station ${stationId}`, {
            paymentId: payment._id, amount, method
        });

        sendResponse(res, 201, true, payment, 'payment_recorded');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Get all payments (filterable by station, status, and date range)
// @route   GET /api/platform/payments
export const getAllPayments = async (req: Request, res: Response) => {
    try {
        const { stationId, status, startDate, endDate } = req.query;
        const filter: any = {};

        if (stationId) filter.station = stationId;
        if (status) filter.status = status;

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate as string);
            if (endDate) filter.createdAt.$lte = new Date(endDate as string);
        }

        const payments = await Payment.find(filter)
            .populate('station', 'name code')
            .populate('processedBy', 'email firstName lastName')
            .sort({ createdAt: -1 });

        sendResponse(res, 200, true, payments);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Get global transaction statistics
// @route   GET /api/platform/payments/stats
export const getTransactionStats = async (req: Request, res: Response) => {
    try {
        const stats = await Payment.aggregate([
            {
                $group: {
                    _id: '$status',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const monthlyRevenue = await Payment.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                    revenue: { $sum: '$amount' }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 12 }
        ]);

        sendResponse(res, 200, true, {
            summary: stats.reduce((acc: any, curr: any) => {
                acc[curr._id] = { total: curr.totalAmount, count: curr.count };
                return acc;
            }, {}),
            monthlyRevenue
        });
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update payment status (confirm/reject)
// @route   PUT /api/platform/payments/:id
export const updatePayment = async (req: Request, res: Response) => {
    try {
        const { status } = req.body;
        const payment = await Payment.findById(req.params.id);
        if (!payment) return sendResponse(res, 404, false, null, 'payment_not_found');

        payment.status = status;
        if (req.admin) {
            payment.processedBy = req.admin.id as any;
        }
        payment.processedAt = new Date();
        await payment.save();

        // If payment is confirmed, activate the subscription
        if (status === 'completed') {
            const subscription = await Subscription.findById(payment.subscription);
            if (subscription && subscription.status !== 'active') {
                subscription.status = 'active';
                if (!subscription.currentPeriodStart) {
                    subscription.currentPeriodStart = new Date();
                }
                await subscription.save();
            }
        }

        await logActivity(req.admin, 'UPDATE', 'Payment', `Updated payment ${req.params.id} to ${status}`, { paymentId: req.params.id, status });

        sendResponse(res, 200, true, payment, 'update_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
