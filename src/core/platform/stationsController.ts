import { Request, Response } from 'express';
import Station from '../../database/models/platform/Station';
import StationUser from '../../database/models/station/StationUser';
import Subscription from '../../database/models/platform/Subscription';
import Payment from '../../database/models/platform/Payment';
import Ticket from '../../database/models/platform/Ticket';
import Warning from '../../database/models/platform/Warning';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

// @desc    Create a new station + owner user + auto-trial subscription
// @route   POST /api/platform/stations
export const createStation = async (req: Request, res: Response) => {
    try {
        const { name, nameAr, code, address, phone, logo, owner } = req.body;

        const existing = await Station.findOne({ code });
        if (existing) {
            return sendResponse(res, 400, false, null, 'station_code_exists');
        }

        const station = await Station.create({ name, nameAr, code, address, phone, logo });

        if (owner) {
            const user = await StationUser.create({
                ...owner,
                station: station._id,
                role: owner.role || 'admin',
            });
            station.owner = user._id as any;
            await station.save();
        }

        const now = new Date();
        const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        const subscription = await Subscription.create({
            station: station._id,
            status: 'trial',
            trialStart: now,
            trialEnd,
        });

        await logActivity(
            req.admin,
            'CREATE',
            'Station',
            `Created station "${name}" with code ${code}`,
            { stationId: station._id, code, trialEnd }
        );

        sendResponse(res, 201, true, { station, subscription }, 'station_created');
    } catch (error: any) {
        console.error('[createStation] Error:', error);

        if (error.code === 11000) {
            return sendResponse(res, 400, false, null, 'station_code_exists');
        }
        if (error.name === 'ValidationError') {
            return sendResponse(res, 400, false, null, error.message);
        }

        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Get all stations with subscription status
// @route   GET /api/platform/stations
export const getAllStations = async (req: Request, res: Response) => {
    try {
        const stations = await Station.find().populate('owner', 'email firstName lastName role').lean();

        const enriched = await Promise.all(stations.map(async (station: any) => {
            const subscription = await Subscription.findOne({ station: station._id }).populate('plan', 'name price').lean();
            return { ...station, subscription };
        }));

        sendResponse(res, 200, true, enriched);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Get station details
// @route   GET /api/platform/stations/:id
export const getStation = async (req: Request, res: Response) => {
    try {
        const station = await Station.findById(req.params.id).populate('owner', '-password');
        if (!station) return sendResponse(res, 404, false, null, 'station_not_found');

        const subscription = await Subscription.findOne({ station: station._id }).populate('plan');
        const users = await StationUser.find({ station: station._id }).select('-password');

        sendResponse(res, 200, true, { station, subscription, users });
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update station
// @route   PUT /api/platform/stations/:id
export const updateStation = async (req: Request, res: Response) => {
    try {
        const { owner, ...updateData } = req.body;

        // 1. Update station basic fields
        const station = await Station.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        if (!station) return sendResponse(res, 404, false, null, 'station_not_found');

        // 2. Update owner details if provided
        if (owner && station.owner) {
            await StationUser.findByIdAndUpdate(station.owner, {
                firstName: owner.firstName,
                lastName: owner.lastName,
                email: owner.email,
                phoneNumber: owner.phoneNumber,
                nationalId: owner.nationalId,
            }, { runValidators: true });
        }

        // 3. Re-populate and log activity
        const updatedStation = await Station.findById(station._id).populate('owner', 'email firstName lastName role').lean();
        await logActivity(req.admin, 'UPDATE', 'Station', `Updated station "${station.name}"`, req.body);

        sendResponse(res, 200, true, updatedStation, 'update_success');
    } catch (error: any) {
        console.error('[updateStation] Error:', error);

        if (error.code === 11000) {
            return sendResponse(res, 400, false, null, 'station_code_exists');
        }
        if (error.name === 'ValidationError') {
            return sendResponse(res, 400, false, null, error.message);
        }
        if (error.name === 'CastError') {
            return sendResponse(res, 400, false, null, `invalid_id_${error.path}`);
        }

        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Deactivate station
// @route   DELETE /api/platform/stations/:id
export const deactivateStation = async (req: Request, res: Response) => {
    try {
        const station = await Station.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!station) return sendResponse(res, 404, false, null, 'station_not_found');

        await logActivity(req.admin, 'DELETE', 'Station', `Deactivated station "${station.name}"`);

        sendResponse(res, 200, true, station, 'station_deactivated');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
// @desc    Ban a station
// @route   PUT /api/platform/stations/:id/ban
export const banStation = async (req: Request, res: Response) => {
    try {
        const { reason } = req.body;
        const station = await Station.findByIdAndUpdate(
            req.params.id,
            { isBanned: true, banReason: reason, bannedAt: new Date() },
            { new: true }
        );
        if (!station) return sendResponse(res, 404, false, null, 'station_not_found');

        await logActivity(req.admin, 'UPDATE', 'Station', `Banned station ${station.name}: ${reason}`, { stationId: station._id, reason });

        sendResponse(res, 200, true, station, 'station_banned');
    } catch (error: any) {
        console.error('[banStation] Error:', error);
        if (error.name === 'CastError') {
            return sendResponse(res, 400, false, null, `invalid_id_${error.path}`);
        }
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Unban a station
// @route   PUT /api/platform/stations/:id/unban
export const unbanStation = async (req: Request, res: Response) => {
    try {
        const station = await Station.findByIdAndUpdate(
            req.params.id,
            { isBanned: false, banReason: null, bannedAt: null },
            { new: true }
        );
        if (!station) return sendResponse(res, 404, false, null, 'station_not_found');

        await logActivity(req.admin, 'UPDATE', 'Station', `Unbanned station ${station.name}`, { stationId: station._id });

        sendResponse(res, 200, true, station, 'station_unbanned');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Hard delete a station
// @route   DELETE /api/platform/stations/:id/hard
export const deleteStation = async (req: Request, res: Response) => {
    try {
        const station = await Station.findByIdAndDelete(req.params.id);
        if (!station) return sendResponse(res, 404, false, null, 'station_not_found');

        await logActivity(req.admin, 'DELETE', 'Station', `Hard deleted station ${station.name} (${station.code})`);

        sendResponse(res, 200, true, null, 'station_deleted');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
