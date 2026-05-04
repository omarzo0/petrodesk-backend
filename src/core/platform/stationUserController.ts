import { Request, Response } from 'express';
import Station from '../../database/models/platform/Station';
import StationUser from '../../database/models/station/StationUser';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

// @desc    Create a user for a specific station
// @route   POST /api/platform/station-users
export const createPlatformStationUser = async (req: Request, res: Response) => {
    try {
        const { stationId, email, password, firstName, lastName, phoneNumber, nationalId, role, language } = req.body;

        const station = await Station.findById(stationId);
        if (!station) return sendResponse(res, 404, false, null, 'station_not_found');

        const existing = await StationUser.findOne({ $or: [{ email }, { nationalId }] });
        if (existing) return sendResponse(res, 400, false, null, 'user_exists');

        const user = await StationUser.create({
            station: stationId,
            email,
            password,
            firstName,
            lastName,
            phoneNumber,
            nationalId,
            role,
            language
        });

        await logActivity(req.admin, 'CREATE', 'StationUser', `Created ${role} user for station ${station.name}`, { userId: user._id, stationId });

        sendResponse(res, 201, true, user, 'user_created');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Get users for a specific station
// @route   GET /api/platform/station-users?stationId=...
export const getPlatformStationUsers = async (req: Request, res: Response) => {
    try {
        const { stationId } = req.query;
        if (!stationId) return sendResponse(res, 400, false, null, 'station_id_required');

        const users = await StationUser.find({ station: stationId }).select('-password');
        sendResponse(res, 200, true, users);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update a station user
// @route   PUT /api/platform/station-users/:id
export const updatePlatformStationUser = async (req: Request, res: Response) => {
    try {
        const user = await StationUser.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
        if (!user) return sendResponse(res, 404, false, null, 'user_not_found');

        await logActivity(req.admin, 'UPDATE', 'StationUser', `Updated station user ${user.email}`, req.body);

        sendResponse(res, 200, true, user, 'update_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Delete a station user
// @route   DELETE /api/platform/station-users/:id
export const deletePlatformStationUser = async (req: Request, res: Response) => {
    try {
        const user = await StationUser.findByIdAndDelete(req.params.id);
        if (!user) return sendResponse(res, 404, false, null, 'user_not_found');

        await logActivity(req.admin, 'DELETE', 'StationUser', `Deleted station user ${user.email}`);

        sendResponse(res, 200, true, null, 'user_deleted');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Ban a station user
// @route   PUT /api/platform/station-users/:id/ban
export const banPlatformStationUser = async (req: Request, res: Response) => {
    try {
        const { reason } = req.body;
        const user = await StationUser.findByIdAndUpdate(
            req.params.id,
            { isBanned: true, banReason: reason, bannedAt: new Date() },
            { new: true }
        ).select('-password');
        if (!user) return sendResponse(res, 404, false, null, 'user_not_found');

        await logActivity(req.admin, 'UPDATE', 'StationUser', `Banned user ${user.email}: ${reason}`, { userId: user._id, reason });

        sendResponse(res, 200, true, user, 'user_banned');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Unban a station user
// @route   PUT /api/platform/station-users/:id/unban
export const unbanPlatformStationUser = async (req: Request, res: Response) => {
    try {
        const user = await StationUser.findByIdAndUpdate(
            req.params.id,
            { isBanned: false, banReason: null, bannedAt: null },
            { new: true }
        ).select('-password');
        if (!user) return sendResponse(res, 404, false, null, 'user_not_found');

        await logActivity(req.admin, 'UPDATE', 'StationUser', `Unbanned user ${user.email}`, { userId: user._id });

        sendResponse(res, 200, true, user, 'user_unbanned');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
