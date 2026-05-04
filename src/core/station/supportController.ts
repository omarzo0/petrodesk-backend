import { Request, Response } from 'express';
import Ticket from '../../database/models/platform/Ticket';
import Warning from '../../database/models/platform/Warning';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

/**
 * Station Support Controller
 * 
 * Handles support tickets and warnings for the current station session.
 */

// @desc    Get tickets for the authenticated station
// @route   GET /api/support/tickets
export const getStationTickets = async (req: Request, res: Response) => {
    try {
        const stationId = (req as any).stationId;
        if (!stationId) return sendResponse(res, 403, false, null, 'no_station_assigned');

        const tickets = await Ticket.find({ station: stationId, ticketType: 'station' }).sort({ createdAt: -1 });
        sendResponse(res, 200, true, tickets);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Raise a new support ticket from the station
// @route   POST /api/support/tickets
export const createStationTicket = async (req: Request, res: Response) => {
    try {
        const { subject, description, category, priority } = req.body;
        const stationId = (req as any).stationId;

        if (!stationId) return sendResponse(res, 403, false, null, 'no_station_assigned');

        const ticket = await Ticket.create({
            station: stationId,
            ticketType: 'station',
            createdBy: req.admin?.id,
            creatorType: 'StationUser',
            subject,
            description,
            category,
            priority,
            status: 'open'
        });

        await logActivity(req.admin, 'CREATE', 'Ticket', `Station opened ticket: ${subject}`, { ticketId: ticket._id });

        sendResponse(res, 201, true, ticket, 'ticket_created');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Add a response to a ticket (Station side)
// @route   POST /api/support/tickets/:id/responses
export const addStationTicketResponse = async (req: Request, res: Response) => {
    try {
        const { message } = req.body;
        const stationId = (req as any).stationId;

        const ticket = await Ticket.findOne({ _id: req.params.id, station: stationId });
        if (!ticket) return sendResponse(res, 404, false, null, 'ticket_not_found');

        ticket.responses.push({
            user: req.admin?.id as any,
            userType: 'station',
            message,
            createdAt: new Date()
        });

        await ticket.save();
        sendResponse(res, 200, true, ticket, 'response_added');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Delete a ticket (only if still open)
// @route   DELETE /api/support/tickets/:id
export const deleteStationTicket = async (req: Request, res: Response) => {
    try {
        const stationId = (req as any).stationId;
        const ticket = await Ticket.findOne({ _id: req.params.id, station: stationId });

        if (!ticket) return sendResponse(res, 404, false, null, 'ticket_not_found');
        if (ticket.status !== 'open') return sendResponse(res, 400, false, null, 'cannot_delete_active_ticket');

        await Ticket.findByIdAndDelete(req.params.id);
        await logActivity(req.admin, 'DELETE', 'Ticket', `Station deleted open ticket: ${ticket.subject}`);

        sendResponse(res, 200, true, null, 'ticket_deleted');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Get warnings issued to the station (Specific + Global/Role-based)
// @route   GET /api/support/warnings
export const getStationWarnings = async (req: Request, res: Response) => {
    try {
        const stationId = (req as any).stationId;
        const userRole = (req as any).admin?.role;
        if (!stationId) return sendResponse(res, 403, false, null, 'no_station_assigned');

        // Fetch warnings that are:
        // 1. Specifically for this station
        // 2. OR Global and target this user's role (or target all roles)
        const warnings = await Warning.find({
            $or: [
                { station: stationId },
                {
                    isGlobal: true,
                    $or: [
                        { targetRoles: { $size: 0 } }, // Targets all roles
                        { targetRoles: userRole }      // Targets specific role
                    ]
                }
            ]
        }).sort({ createdAt: -1 });

        sendResponse(res, 200, true, warnings);
    } catch (error) {
        console.error('[getStationWarnings]', error);
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Acknowledge/Respond to a warning
// @route   POST /api/support/warnings/:id/responses
export const addStationWarningResponse = async (req: Request, res: Response) => {
    try {
        const { message } = req.body;
        const stationId = (req as any).stationId;

        const warning = await Warning.findOne({ _id: req.params.id, station: stationId });
        if (!warning) return sendResponse(res, 404, false, null, 'warning_not_found');

        warning.responses.push({
            user: req.admin?.id as any,
            userType: 'station',
            message,
            createdAt: new Date()
        });

        await warning.save();
        sendResponse(res, 200, true, warning, 'response_added');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
