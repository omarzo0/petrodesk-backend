import { Request, Response } from 'express';
import PlatformUser from '../../database/models/platform/PlatformUser';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

// @desc    Get all platform staff
// @route   GET /api/platform/staff
export const getStaff = async (req: Request, res: Response) => {
    try {
        const staff = await PlatformUser.find().select('-password');
        sendResponse(res, 200, true, staff);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Create a new platform staff member
// @route   POST /api/platform/staff
export const createStaff = async (req: Request, res: Response) => {
    try {
        const { email, password, firstName, lastName, role, language } = req.body;

        const existing = await PlatformUser.findOne({ email });
        if (existing) {
            return sendResponse(res, 400, false, null, 'email_exists');
        }

        const user = await PlatformUser.create({
            email,
            password,
            firstName,
            lastName,
            role: role || 'employee',
            language: language || 'ar'
        });

        await logActivity(
            req.admin as any,
            'CREATE',
            'PlatformStaff',
            `Added platform staff member: ${user.email} (${user.role})`,
            { userId: user._id, role: user.role }
        );

        sendResponse(res, 201, true, {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
        }, 'staff_created');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update a platform staff member
// @route   PUT /api/platform/staff/:id
export const updateStaff = async (req: Request, res: Response) => {
    try {
        const user = await PlatformUser.findById(req.params.id);
        if (!user) {
            return sendResponse(res, 404, false, null, 'user_not_found');
        }

        const { firstName, lastName, role, language, email } = req.body;
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (role) user.role = role;
        if (language) user.language = language;
        if (email) user.email = email;

        await user.save();

        await logActivity(
            req.admin as any,
            'UPDATE',
            'PlatformStaff',
            `Updated platform staff member: ${user.email}`,
            { userId: req.params.id, updates: req.body }
        );

        sendResponse(res, 200, true, user, 'staff_updated');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Delete a platform staff member
// @route   DELETE /api/platform/staff/:id
export const deleteStaff = async (req: Request, res: Response) => {
    try {
        const user = await PlatformUser.findById(req.params.id);
        if (!user) {
            return sendResponse(res, 404, false, null, 'user_not_found');
        }

        // Prevent self-deletion
        if (req.admin && user._id.toString() === req.admin.id) {
            return sendResponse(res, 400, false, null, 'cannot_delete_self');
        }

        await logActivity(
            req.admin as any,
            'DELETE',
            'PlatformStaff',
            `Deleted platform staff member: ${user.email}`
        );

        await PlatformUser.findByIdAndDelete(req.params.id);
        sendResponse(res, 200, true, null, 'staff_deleted');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
