import { Request, Response } from 'express';
import Ticket from '../../database/models/platform/Ticket';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

// @desc    Create a new ticket (Staff side)
// @route   POST /api/platform/tickets
export const createTicket = async (req: Request, res: Response) => {
    try {
        const { subject, description, category, priority, stationId, ticketType = 'station' } = req.body;

        const isAdmin = req.admin?.isSuperAdmin;
        const isPlatformStaff = req.admin?.userType === 'platform';

        // Non-superAdmin platform staff send 'internal' tickets to Super Admin
        const finalTicketType = (!isAdmin && isPlatformStaff) ? 'internal' : ticketType;

        const ticketData: any = {
            ticketType: finalTicketType,
            createdBy: req.admin?.id,
            creatorType: 'PlatformUser',
            subject,
            description,
            category,
            priority,
            status: 'open'
        };

        if (finalTicketType === 'station') {
            if (!stationId) return sendResponse(res, 400, false, null, 'station_id_required');
            ticketData.station = stationId;
        }

        const ticket = await Ticket.create(ticketData);

        await logActivity(req.admin, 'CREATE', 'Ticket', `Opened ${finalTicketType} ticket: ${subject}`, { ticketId: ticket._id });

        sendResponse(res, 201, true, ticket, 'ticket_created');
    } catch (error) {
        console.error('[createTicket]', error);
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Get all tickets (Platform Staff only)
// @route   GET /api/platform/tickets
export const getAllTickets = async (req: Request, res: Response) => {
    try {
        const filter: any = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.priority) filter.priority = req.query.priority;
        if (req.query.stationId) filter.station = req.query.stationId;
        if (req.query.ticketType) filter.ticketType = req.query.ticketType;

        // Visibility Logic:
        // 1. Super Admin sees EVERYTHING.
        // 2. Platform Staff sees ALL 'station' tickets + their 'own' internal tickets.
        if (!req.admin?.isSuperAdmin) {
            filter.$or = [
                { ticketType: 'station' },
                { createdBy: req.admin?.id, ticketType: 'internal' }
            ];
        }

        const tickets = await Ticket.find(filter)
            .populate('station', 'name code')
            .sort({ createdAt: -1 });

        sendResponse(res, 200, true, tickets);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Get tickets created by the current platform staff
// @route   GET /api/platform/tickets/my
export const getMyPlatformTickets = async (req: Request, res: Response) => {
    try {
        const tickets = await Ticket.find({
            createdBy: req.admin?.id,
            creatorType: 'PlatformUser'
        }).sort({ createdAt: -1 });

        sendResponse(res, 200, true, tickets);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Add response to a ticket
// @route   POST /api/platform/tickets/:id/responses
export const addTicketResponse = async (req: Request, res: Response) => {
    try {
        const { message } = req.body;
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return sendResponse(res, 404, false, null, 'ticket_not_found');

        // Security: Non-SuperAdmin platform staff can only respond to their own tickets or tickets assigned to them (if we add assignment)
        if (!req.admin?.isSuperAdmin && ticket.createdBy.toString() !== req.admin?.id.toString()) {
            return sendResponse(res, 403, false, null, 'forbidden');
        }

        const response = {
            user: req.admin?.id as any,
            userType: 'platform' as const,
            message,
            createdAt: new Date()
        };

        ticket.responses.push(response);

        // Auto-set status to in_progress if superAdmin responds to a staff ticket
        if (req.admin?.isSuperAdmin && ticket.status === 'open') {
            ticket.status = 'in_progress';
        }

        await ticket.save();
        sendResponse(res, 200, true, ticket, 'response_added');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Resolve a ticket
// @route   PUT /api/platform/tickets/:id/resolve
export const resolveTicket = async (req: Request, res: Response) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return sendResponse(res, 404, false, null, 'ticket_not_found');

        const isAdmin = req.admin?.isSuperAdmin;

        // Permission Logic:
        // 1. Super Admin can resolve ANYTHING.
        // 2. Platform Staff can resolve any STATION ticket.
        // 3. Platform Staff CANNOT resolve internal tickets (unless they are Super Admin).
        if (!isAdmin && ticket.ticketType === 'internal') {
            return sendResponse(res, 403, false, null, 'only_superadmin_can_resolve_internal_tickets');
        }

        ticket.status = 'resolved';
        ticket.resolvedBy = req.admin?.id as any;
        ticket.resolvedAt = new Date();

        await ticket.save();
        await logActivity(req.admin, 'UPDATE', 'Ticket', `Resolved ticket: ${ticket.subject}`, { ticketId: ticket._id });

        sendResponse(res, 200, true, ticket, 'ticket_resolved');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Delete a ticket (Super Admin only)
// @route   DELETE /api/platform/tickets/:id
export const deleteTicket = async (req: Request, res: Response) => {
    try {
        const ticket = await Ticket.findByIdAndDelete(req.params.id);
        if (!ticket) return sendResponse(res, 404, false, null, 'ticket_not_found');

        await logActivity(req.admin, 'DELETE', 'Ticket', `Deleted ticket: ${ticket.subject}`, { ticketId: ticket._id });

        sendResponse(res, 200, true, null, 'ticket_deleted');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
