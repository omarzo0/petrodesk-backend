import express from 'express';
import { createStation, getAllStations, getStation, updateStation, deactivateStation, banStation, unbanStation, deleteStation } from '../../../core/platform/stationsController';

import { platformCan } from '../../../server/middleware/rbac';

const router = express.Router();

router.get('/', platformCan('station', 'read'), getAllStations);
router.get('/:id', platformCan('station', 'read'), getStation);

router.post('/', platformCan('station', 'create'), createStation);
router.put('/:id', platformCan('station', 'update'), updateStation);
router.delete('/:id', platformCan('station', 'suspend'), deactivateStation);
router.put('/:id/ban', platformCan('station', 'suspend'), banStation);
router.put('/:id/unban', platformCan('station', 'suspend'), unbanStation);

router.delete('/:id/hard', platformCan('station', 'delete'), deleteStation);

export default router;
