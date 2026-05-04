import { Request, Response } from 'express';
import Subscription from '../../database/models/platform/Subscription';
import Plan from '../../database/models/platform/Plan';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

// @desc    Assign a plan to a station (activate subscription)
// @route   POST /api/platform/subscriptions
export const assignPlan = async (req: Request, res: Response) => {
    try {
        const { stationId, planId, durationMonths } = req.body;

        const plan = await Plan.findById(planId);
        if (!plan) return sendResponse(res, 404, false, null, 'plan_not_found');

        let subscription = await Subscription.findOne({ station: stationId });
        if (!subscription) {
            return sendResponse(res, 404, false, null, 'no_subscription_found');
        }

        const now = new Date();
        const months = durationMonths || (plan.billingCycle === 'yearly' ? 12 : 1);
        const periodEnd = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);

        subscription.plan = planId;
        subscription.status = 'active';
        subscription.currentPeriodStart = now;
        subscription.currentPeriodEnd = periodEnd;
        await subscription.save();

        await logActivity(req.admin, 'UPDATE', 'Subscription', `Assigned plan "${plan.name}" to station ${stationId}`, {
            stationId, planId, periodEnd
        });

        sendResponse(res, 200, true, subscription, 'plan_assigned');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Get all subscriptions
// @route   GET /api/platform/subscriptions
export const getAllSubscriptions = async (req: Request, res: Response) => {
    try {
        const subscriptions = await Subscription.find()
            .populate('station', 'name code')
            .populate('plan', 'name price billingCycle')
            .sort({ updatedAt: -1 });

        sendResponse(res, 200, true, subscriptions);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Extend or modify subscription
// @route   PUT /api/platform/subscriptions/:id
export const updateSubscription = async (req: Request, res: Response) => {
    try {
        const { status, currentPeriodEnd, planId } = req.body;

        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) return sendResponse(res, 404, false, null, 'subscription_not_found');

        if (status) subscription.status = status;
        if (currentPeriodEnd) subscription.currentPeriodEnd = new Date(currentPeriodEnd);
        if (planId) subscription.plan = planId;

        await subscription.save();

        await logActivity(req.admin, 'UPDATE', 'Subscription', `Modified subscription ${req.params.id}`, req.body);

        sendResponse(res, 200, true, subscription, 'update_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
