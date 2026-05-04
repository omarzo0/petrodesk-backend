import express from 'express';
import { createPlatformStationUser, getPlatformStationUsers, updatePlatformStationUser, deletePlatformStationUser, banPlatformStationUser, unbanPlatformStationUser } from '../../../core/platform/stationUserController';

import { platformCan } from '../../../server/middleware/rbac';

const router = express.Router();

router.get('/', platformCan('stationUser', 'read'), getPlatformStationUsers);

router.post('/', platformCan('stationUser', 'create'), createPlatformStationUser);
router.put('/:id', platformCan('stationUser', 'update'), updatePlatformStationUser);
router.put('/:id/ban', platformCan('stationUser', 'update'), banPlatformStationUser);
router.put('/:id/unban', platformCan('stationUser', 'update'), unbanPlatformStationUser);

router.delete('/:id', platformCan('stationUser', 'delete'), deletePlatformStationUser);

export default router;
