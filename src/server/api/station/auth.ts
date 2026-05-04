import express from 'express';
import {
    login,
    forgotPassword,
    verifyOtp,
    resetPassword,
    getMe,
    updateProfile,
    changePassword
} from '../../../core/station/auth/stationAuthController';
import { auth } from '../../middleware/auth';

const router = express.Router();

router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.put('/resetpassword', resetPassword);

router.get('/me', auth, getMe);
router.put('/updateprofile', auth, updateProfile);
router.put('/changepassword', auth, changePassword);

export default router;
