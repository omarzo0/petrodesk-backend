import { Request, Response } from 'express';
import Warning from '../../database/models/platform/Warning';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

// @desc    Issue a new warning to a station or global roles
// @route   POST /api/platform/warnings
export const createWarning = async (req: Request, res: Response) => {
    try {
        const { stationId, type, severity, message, details, isGlobal, targetRoles } = req.body;

        // Ensure stationId is null if empty or global
        const finalStationId = (isGlobal || !stationId || stationId === '') ? null : stationId;

        const warning = await Warning.create({
            station: finalStationId,
            isGlobal: !!isGlobal,
            targetRoles: targetRoles || [],
            type,
            severity,
            message,
            details,
            issuedBy: req.admin?.id as any
        });

        const logMsg = isGlobal
            ? `Issued global ${severity} warning: ${message}`
            : `Issued ${severity} warning to station ${stationId}: ${message}`;

        await logActivity(req.admin, 'CREATE', 'Warning', logMsg, { warningId: warning._id });

        sendResponse(res, 201, true, warning, 'warning_issued');
    } catch (error: any) {
        console.error('[createWarning] Error:', error);

        // Handle Mongoose validation errors specifically if needed
        if (error.name === 'ValidationError') {
            return sendResponse(res, 400, false, null, error.message);
        }
        if (error.name === 'CastError') {
            return sendResponse(res, 400, false, null, `invalid_id_${error.path}`);
        }

        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Get all warnings (Platform Staff only)
// @route   GET /api/platform/warnings
export const getAllWarnings = async (req: Request, res: Response) => {
    try {
        const filter: any = {};
        if (req.query.severity) filter.severity = req.query.severity;
        if (req.query.type) filter.type = req.query.type;
        if (req.query.isResolved !== undefined) filter.isResolved = req.query.isResolved === 'true';

        const warnings = await Warning.find(filter)
            .populate('station', 'name code')
            .sort({ createdAt: -1 });

        sendResponse(res, 200, true, warnings);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Get warnings for the current station
// @route   GET /api/warnings
export const getMyStationWarnings = async (req: Request, res: Response) => {
    try {
        if (!req.stationId) return sendResponse(res, 403, false, null, 'no_station_assigned');

        const warnings = await Warning.find({ station: req.stationId }).sort({ createdAt: -1 });
        sendResponse(res, 200, true, warnings);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Add response to a warning
// @route   POST /api/platform/warnings/:id/responses or /api/warnings/:id/responses
export const addWarningResponse = async (req: Request, res: Response) => {
    try {
        const { message } = req.body;
        const warning = await Warning.findById(req.params.id);
        if (!warning) return sendResponse(res, 404, false, null, 'warning_not_found');

        // Security: Station user can only respond to their own warnings
        if (req.admin?.userType === 'station') {
            if (!warning.station || warning.station.toString() !== req.stationId?.toString()) {
                return sendResponse(res, 403, false, null, 'forbidden');
            }
        }

        const response = {
            user: req.admin?.id as any,
            userType: req.admin?.userType as 'platform' | 'station',
            message,
            createdAt: new Date()
        };

        warning.responses.push(response);
        await warning.save();

        sendResponse(res, 200, true, warning, 'response_added');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Resolve a warning
// @route   PUT /api/platform/warnings/:id/resolve
export const resolveWarning = async (req: Request, res: Response) => {
    try {
        const warning = await Warning.findById(req.params.id);
        if (!warning) return sendResponse(res, 404, false, null, 'warning_not_found');

        warning.isResolved = true;
        warning.resolvedBy = req.admin?.id as any;
        warning.resolvedAt = new Date();

        await warning.save();
        await logActivity(req.admin, 'UPDATE', 'Warning', `Resolved warning: ${warning.message}`, { warningId: warning._id });

        sendResponse(res, 200, true, warning, 'warning_resolved');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
