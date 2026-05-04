import { Request, Response } from 'express';
import Employee from '../../database/models/station/Employee';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

// @desc    Get all employees
// @route   GET /api/employees
export const getAll = async (req: Request, res: Response) => {
    try {
        const employees = await Employee.find({ station: req.stationId });
        sendResponse(res, 200, true, employees);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};





// @desc    Add employee
// @route   POST /api/employees
export const create = async (req: Request, res: Response) => {
    try {
        const { name, nationalId, mobileNum, job, salary } = req.body;
        if (!name || !nationalId || !mobileNum || !job) {
            return sendResponse(res, 400, false, null, 'required_fields');
        }

        const existing = await Employee.findOne({ station: req.stationId, nationalId });
        if (existing) {
            return sendResponse(res, 400, false, null, 'item_exists');
        }

        const employee = await Employee.create({ station: req.stationId, name, nationalId, mobileNum, job, salary: salary || 0 });

        await logActivity(
            req.admin,
            'CREATE',
            'Employee',
            `اضافة موظف جديد: ${name}`,
            { name, nationalId, job, salary }
        );

        sendResponse(res, 201, true, employee, 'add_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
export const update = async (req: Request, res: Response) => {
    try {
        const { name, nationalId, mobileNum, job, salary } = req.body;
        const employee = await Employee.findOneAndUpdate(
            { _id: req.params.id, station: req.stationId },
            { name, nationalId, mobileNum, job, salary },
            { new: true }
        );
        if (!employee) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            req.admin,
            'UPDATE',
            'Employee',
            `تعديل بيانات موظف: ${name || (employee as any).name}`,
            { id: req.params.id, name, nationalId, job, salary }
        );

        sendResponse(res, 200, true, employee, 'update_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
export const deleteEmployee = async (req: Request, res: Response) => {
    try {
        const employee = await Employee.findOneAndDelete({ _id: req.params.id, station: req.stationId });
        if (!employee) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            req.admin,
            'DELETE',
            'Employee',
            `حذف موظف: ${(employee as any).name}`,
            { id: req.params.id }
        );

        sendResponse(res, 200, true, null, 'delete_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
