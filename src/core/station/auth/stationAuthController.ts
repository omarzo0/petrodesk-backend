import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import StationUser from '../../../database/models/station/StationUser';
import Subscription from '../../../database/models/platform/Subscription';
import sendResponse from '../../../server/utils/responseHandler';
import { logActivity } from '../../../server/utils/logger';
import { ENV } from '../../../config';
import { sendEmail } from '../../../server/utils/mailer';

// @desc    Login Station user
// @route   POST /api/auth/login
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await StationUser.findOne({ email });
        if (!user) {
            return sendResponse(res, 401, false, null, 'invalid_credentials');
        }

        if (user.lockUntil && user.lockUntil > new Date()) {
            const minutesLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / (1000 * 60));
            return sendResponse(res, 401, false, null, `account_locked_try_in_${minutesLeft}_mins`);
        }

        const isMatch = await (user as any).matchPassword(password);
        if (!isMatch) {
            user.loginAttempts += 1;
            if (user.loginAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 1 * 60 * 60 * 1000);
            }
            await user.save();
            return sendResponse(res, 401, false, null, 'invalid_credentials');
        }

        user.loginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();

        await logActivity(
            { email: user.email, name: `${user.firstName} ${user.lastName}`, role: user.role },
            'LOGIN',
            'Auth',
            'تسجيل دخول',
            null,
            user.station
        );

        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                role: user.role,
                language: user.language,
                userType: 'station',
                station: user.station,
                isSuperAdmin: false
            },
            ENV.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Subscription info
        let subscriptionInfo = null;
        const subscription = await Subscription.findOne({ station: user.station }).populate('plan');
        if (subscription) {
            const now = new Date();
            let daysRemaining = 0;

            if (subscription.status === 'trial') {
                daysRemaining = Math.max(0, Math.ceil((subscription.trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            } else if (subscription.status === 'active' && subscription.currentPeriodEnd) {
                daysRemaining = Math.max(0, Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            }

            subscriptionInfo = {
                status: subscription.status,
                plan: subscription.plan ? { name: (subscription.plan as any).name, features: (subscription.plan as any).features } : null,
                daysRemaining,
                trialEnd: subscription.trialEnd,
                currentPeriodEnd: subscription.currentPeriodEnd,
            };
        }

        sendResponse(res, 200, true, {
            token,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                language: user.language,
                userType: 'station',
                station: user.station,
                isSuperAdmin: false,
            },
            subscription: subscriptionInfo
        });

    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

export const getMe = async (req: Request, res: Response) => {
    try {
        if (!req.admin) return sendResponse(res, 401, false, null, 'unauthorized');
        const user = await StationUser.findById(req.admin.id).select('-password');
        if (!user) return sendResponse(res, 404, false, null, 'user_not_found');
        sendResponse(res, 200, true, user);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const user = await StationUser.findOne({ email });
        if (!user) return sendResponse(res, 404, false, null, 'user_not_found');

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordOtp = crypto.createHash('sha256').update(otp).digest('hex');
        user.resetPasswordOtpExpire = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        console.log(`[DEV MODE] Station OTP for ${email}: ${otp}`);
        sendResponse(res, 200, true, null, 'otp_sent_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

export const verifyOtp = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;
        const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
        const user = await StationUser.findOne({ email, resetPasswordOtp: hashedOtp, resetPasswordOtpExpire: { $gt: Date.now() } });
        if (!user) return sendResponse(res, 400, false, null, 'invalid_otp');
        sendResponse(res, 200, true, null, 'otp_verified_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, password, otp } = req.body;
        const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
        const user = await StationUser.findOne({ email, resetPasswordOtp: hashedOtp, resetPasswordOtpExpire: { $gt: Date.now() } });
        if (!user) return sendResponse(res, 400, false, null, 'otp_verification_required');

        user.password = password;
        user.resetPasswordOtp = undefined;
        user.resetPasswordOtpExpire = undefined;
        await user.save();
        sendResponse(res, 200, true, null, 'reset_password_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        if (!req.admin) return sendResponse(res, 401, false, null, 'unauthorized');
        const { email, firstName, lastName, phoneNumber, language } = req.body;
        const user = await StationUser.findById(req.admin.id);
        if (!user) return sendResponse(res, 404, false, null, 'user_not_found');

        if (email) user.email = email;
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (language) user.language = language;

        await user.save();
        sendResponse(res, 200, true, user, 'profile_updated');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

export const changePassword = async (req: Request, res: Response) => {
    try {
        if (!req.admin) return sendResponse(res, 401, false, null, 'unauthorized');
        const user = await StationUser.findById(req.admin.id);
        if (!user) return sendResponse(res, 404, false, null, 'user_not_found');

        const isMatch = await (user as any).matchPassword(req.body.currentPassword);
        if (!isMatch) return sendResponse(res, 401, false, null, 'current_password_wrong');

        user.password = req.body.newPassword;
        await user.save();
        sendResponse(res, 200, true, null, 'password_changed');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
