import { Request, Response } from 'express';
import Station from '../../database/models/platform/Station';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

/**
 * @desc    Get current station details
 * @route   GET /api/station
 */
export const getMyStation = async (req: Request, res: Response) => {
    try {
        const station = await Station.findById(req.stationId);
        if (!station) {
            return sendResponse(res, 404, false, null, 'station_not_found');
        }

        sendResponse(res, 200, true, station);
    } catch (error) {
        console.error('[getMyStation]', error);
        sendResponse(res, 500, false, null, 'server_error');
    }
};

/**
 * @desc    Update current station details
 * @route   PUT /api/station
 */
export const updateMyStation = async (req: Request, res: Response) => {
    try {
        const { name, nameAr, address, phone, logo } = req.body;

        // Fields allowed to be updated by station admin
        const updateData: any = {};
        if (name) updateData.name = name;
        if (nameAr) updateData.nameAr = nameAr;
        if (address) updateData.address = address;
        if (phone) updateData.phone = phone;
        if (logo) updateData.logo = logo;

        const station = await Station.findByIdAndUpdate(
            req.stationId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!station) {
            return sendResponse(res, 404, false, null, 'station_not_found');
        }

        await logActivity(
            req.admin,
            'UPDATE',
            'Station',
            `قام بتحديث بيانات المحطة: ${station.name}`,
            updateData
        );

        sendResponse(res, 200, true, station, 'station_updated_success');
    } catch (error) {
        console.error('[updateMyStation]', error);
        sendResponse(res, 500, false, null, 'server_error');
    }
};
