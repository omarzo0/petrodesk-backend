import express from 'express';
import * as ctrl from '../../../core/station/statementController';
import { stationCan } from '../../middleware/rbac';

const router = express.Router();

router.get('/', stationCan('statement', 'read'), ctrl.getAll);
router.post('/', stationCan('statement', 'create'), ctrl.create);
router.put('/:name', stationCan('statement', 'update'), ctrl.update);
router.delete('/:name', stationCan('statement', 'delete'), ctrl.deleteStatement);


export default router;
