import express from 'express';
import { auth, superAdminOnly, platformStaffOnly } from '../../../server/middleware/auth';
import { platformCan } from '../../../server/middleware/rbac';
import { getPlatformOverview } from '../../../core/platform/overviewController';

import stationRoutes from './stationRoutes';
import stationUserRoutes from './stationUserRoutes';
import staffRoutes from './staffRoutes';
import planRoutes from './planRoutes';
import subscriptionRoutes from './subscriptionRoutes';
import paymentRoutes from './paymentRoutes';
import ticketRoutes from './ticketRoutes';
import warningRoutes from './warningRoutes';
import dashboardRoutes from './dashboardRoutes';

const router = express.Router();

// All platform routes require super admin auth
router.use(auth, platformStaffOnly);

router.get('/overview', platformCan('overview', 'read'), getPlatformOverview);

router.use('/stations', stationRoutes);
router.use('/station-users', stationUserRoutes);
router.use('/staff', staffRoutes);
router.use('/plans', planRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/payments', paymentRoutes);
router.use('/tickets', ticketRoutes);
router.use('/warnings', warningRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
