import express from 'express';
import ticketRoutes from './ticketRoutes';
import warningRoutes from './warningRoutes';

const router = express.Router();

router.use('/tickets', ticketRoutes);
router.use('/warnings', warningRoutes);

export default router;
