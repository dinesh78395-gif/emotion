import { Router } from 'express';
import * as logsController from '../controllers/logsController';

const router = Router();

router.post('/log', logsController.create);
router.get('/logs', logsController.list);

export default router;
