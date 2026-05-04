import { Request, Response } from 'express';
import StationUser from '../../database/models/station/StationUser';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

// @desc    Get all users for the current station
// @route   GET /api/admins
export const getAll = async (req: Request, res: Response) => {
    try {
        const users = await StationUser.find({ station: req.stationId }).select('-password');
        sendResponse(res, 200, true, users);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Get user names (emails) for the current station
// @route   GET /api/admins/names
export const getNames = async (req: Request, res: Response) => {
    try {
        const users = await StationUser.find({ station: req.stationId }, 'email');
        sendResponse(res, 200, true, users.map((u: any) => u.email));
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Search user by email within the current station
// @route   GET /api/admins/search?email=...
export const search = async (req: Request, res: Response) => {
    try {
        const user = await StationUser.findOne({
            email: req.query.email as string,
            station: req.stationId
        }).select('-password');

        if (!user) {
            return sendResponse(res, 404, false, null, 'user_not_found');
        }
        sendResponse(res, 200, true, user);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update station user
// @route   PUT /api/admins/:id
export const update = async (req: Request, res: Response) => {
    try {
        const { email, password, role, firstName, lastName, phoneNumber, nationalId } = req.body;
        const user = await StationUser.findOne({ _id: req.params.id, station: req.stationId });

        if (!user) {
            return sendResponse(res, 404, false, null, 'user_not_found');
        }

        if (email) user.email = email;
        if (password) user.password = password;
        if (role) user.role = role;
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (nationalId) user.nationalId = nationalId;

        await user.save();

        await logActivity(
            req.admin,
            'UPDATE',
            'StationUser',
            `تعديل بيانات مستخدم: ${user.email}`,
            { id: req.params.id, email, role, firstName, lastName }
        );

        sendResponse(res, 200, true, user, 'update_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Delete station user
// @route   DELETE /api/admins/:id
export const deleteAdmin = async (req: Request, res: Response) => {
    try {
        const user = await StationUser.findOne({ _id: req.params.id, station: req.stationId });
        if (!user) {
            return sendResponse(res, 404, false, null, 'user_not_found');
        }

        await logActivity(
            req.admin,
            'DELETE',
            'StationUser',
            `حذف مستخدم: ${user.email}`,
            { id: req.params.id }
        );

        await StationUser.deleteOne({ _id: req.params.id, station: req.stationId });
        sendResponse(res, 200, true, null, 'delete_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Create station user
// @route   POST /api/admins
export const create = async (req: Request, res: Response) => {
    try {
        const { email, password, role, firstName, lastName, phoneNumber, nationalId } = req.body;

        const existingUser = await StationUser.findOne({ email });
        if (existingUser) {
            return sendResponse(res, 400, false, null, 'email_exists');
        }

        const user = await StationUser.create({
            station: req.stationId,
            email,
            password,
            role: role || 'manager',
            firstName,
            lastName,
            phoneNumber,
            nationalId
        });

        await logActivity(
            req.admin,
            'CREATE',
            'StationUser',
            `اضافة مستخدم جديد: ${email}`,
            { email, role, firstName, lastName }
        );

        sendResponse(res, 201, true, user, 'add_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
