import { Request, Response } from 'express';
import Plan from '../../database/models/platform/Plan';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

// @desc    Create a new plan
// @route   POST /api/platform/plans
export const createPlan = async (req: Request, res: Response) => {
    try {
        const plan = await Plan.create(req.body);
        await logActivity(req.admin, 'CREATE', 'Plan', `Created plan "${plan.name}"`, req.body);
        sendResponse(res, 201, true, plan, 'plan_created');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Get all plans
// @route   GET /api/platform/plans
export const getAllPlans = async (req: Request, res: Response) => {
    try {
        const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 });
        sendResponse(res, 200, true, plans);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update plan
// @route   PUT /api/platform/plans/:id
export const updatePlan = async (req: Request, res: Response) => {
    try {
        const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!plan) return sendResponse(res, 404, false, null, 'plan_not_found');

        await logActivity(req.admin, 'UPDATE', 'Plan', `Updated plan "${plan.name}"`, req.body);
        sendResponse(res, 200, true, plan, 'update_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Deactivate plan
// @route   DELETE /api/platform/plans/:id
export const deactivatePlan = async (req: Request, res: Response) => {
    try {
        const plan = await Plan.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!plan) return sendResponse(res, 404, false, null, 'plan_not_found');

        await logActivity(req.admin, 'DELETE', 'Plan', `Deactivated plan "${plan.name}"`);
        sendResponse(res, 200, true, plan, 'plan_deactivated');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
