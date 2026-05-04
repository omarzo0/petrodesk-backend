import { Request, Response } from 'express';
import Statement from '../../database/models/station/Statement';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

// @desc    Get all statements
// @route   GET /api/statements
export const getAll = async (req: Request, res: Response) => {
    try {
        const statements = await Statement.find({ station: req.stationId });
        sendResponse(res, 200, true, statements);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Add statement
// @route   POST /api/statements
export const create = async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        if (!name) {
            return sendResponse(res, 400, false, null, 'required_fields');
        }

        const existing = await Statement.findOne({ station: req.stationId, name });
        if (existing) {
            return sendResponse(res, 400, false, null, 'item_exists');
        }

        const statement = await Statement.create({ station: req.stationId, name });

        await logActivity(
            req.admin,
            'CREATE',
            'Statement',
            `اضافة بيان جديد: ${name}`,
            { name }
        );

        sendResponse(res, 201, true, statement, 'add_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Delete statement by name
// @route   DELETE /api/statements/:name
export const deleteStatement = async (req: Request, res: Response) => {
    try {
        const statement = await Statement.findOneAndDelete({ station: req.stationId, name: req.params.name });
        if (!statement) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            req.admin,
            'DELETE',
            'Statement',
            `حذف بيان: ${req.params.name}`,
            { name: req.params.name }
        );

        sendResponse(res, 200, true, null, 'delete_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update statement name
// @route   PUT /api/statements/:name
export const update = async (req: Request, res: Response) => {
    try {
        const { newName } = req.body;
        if (!newName) {
            return sendResponse(res, 400, false, null, 'required_fields');
        }

        const statement = await Statement.findOne({ station: req.stationId, name: req.params.name });
        if (!statement) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        const oldName = statement.name;
        statement.name = newName;
        await statement.save();

        await logActivity(
            req.admin,
            'UPDATE',
            'Statement',
            `تعديل بيان من: ${oldName} الى: ${newName}`,
            { oldName, newName }
        );

        sendResponse(res, 200, true, statement, 'update_success');
    } catch (error) {
        if ((error as any).code === 11000) {
            return sendResponse(res, 400, false, null, 'item_exists');
        }
        sendResponse(res, 500, false, null, 'server_error');
    }
};

