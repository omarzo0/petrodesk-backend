import express from 'express';
import { createTicket, getAllTickets, addTicketResponse, resolveTicket, getMyPlatformTickets, deleteTicket } from '../../../core/platform/ticketController';
import { platformCan } from '../../../server/middleware/rbac';

const router = express.Router();

router.get('/', platformCan('ticket', 'read'), getAllTickets);
router.get('/my', platformCan('ticket', 'read'), getMyPlatformTickets);
router.post('/', platformCan('ticket', 'create'), createTicket);
router.post('/:id/responses', platformCan('ticket', 'respond'), addTicketResponse);
router.put('/:id/resolve', platformCan('ticket', 'close'), resolveTicket);
router.delete('/:id', platformCan('ticket', 'delete'), deleteTicket);

export default router;
