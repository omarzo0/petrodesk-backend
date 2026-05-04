import express from 'express';
import { getPlatformOverview } from '../../../core/platform/overviewController';

import { platformCan } from '../../../server/middleware/rbac';

const router = express.Router();

router.get('/', platformCan('overview', 'read'), getPlatformOverview);

export default router;
