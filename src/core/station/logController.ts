import { Request, Response } from 'express';
import ActivityLog from '../../database/models/shared/ActivityLog';
import sendResponse from '../../server/utils/responseHandler';

// @desc    Get all activity logs for a date
// @route   GET /api/logs/:date
export const getByDate = async (req: Request, res: Response) => {
    try {
        const { date } = req.params;
        const { email, type, category } = req.query;

        const filter: any = { station: req.stationId, date };
        if (email) filter.email = email;
        if (type) filter.type = type;
        if (category) filter.category = category;

        const records = await ActivityLog.find(filter).sort({ time: -1 });
        sendResponse(res, 200, true, records);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Get logs by admin email
// @route   GET /api/logs/admin/:email
export const getByAdmin = async (req: Request, res: Response) => {
    try {
        const { email } = req.params;
        const records = await ActivityLog.find({ station: req.stationId, email }).sort({ date: -1, time: -1 });
        sendResponse(res, 200, true, records);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
