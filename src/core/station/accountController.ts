import { Request, Response } from 'express';
import Account from '../../database/models/station/Account';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

// @desc    Get accounts for a date (optionally filter by name)
// @route   GET /api/accounts/:date?name=...
export const getByDate = async (req: Request, res: Response) => {
    try {
        const filter: any = { station: req.stationId, date: req.params.date };
        if (req.query.name) filter.name = req.query.name;

        const records = await Account.find(filter).sort({ createdAt: -1 });
        sendResponse(res, 200, true, records);
    } catch (error) {
        console.error('[Account Controller] getByDate Error:', error);
        sendResponse(res, 500, false, null, 'server_error');
    }

};

// @desc    Add account entry
// @route   POST /api/accounts
export const create = async (req: Request, res: Response) => {
    try {
        const { date, name, receiptName, money } = req.body;

        if (!date || !name || money === undefined) {
            return sendResponse(res, 400, false, null, 'required_fields');
        }

        const record = await Account.create({ station: req.stationId, date, name, receiptName, money });

        await logActivity(
            req.admin,
            'CREATE',
            'Account',
            `اضافة قيد حساب: ${name} - ${receiptName} بمبلغ ${money} بتاريخ ${date}`,
            { date, name, receiptName, money }
        );

        sendResponse(res, 201, true, record, 'add_success');
    } catch (error) {
        console.error('[Account Controller] create Error:', error);
        sendResponse(res, 500, false, null, 'server_error');
    }

};

// @desc    Update account entry
// @route   PUT /api/accounts/:id
export const updateAccount = async (req: Request, res: Response) => {
    try {
        const { date, name, receiptName, money } = req.body;
        const record = await Account.findOneAndUpdate(
            { _id: req.params.id, station: req.stationId },
            { date, name, receiptName, money },
            { new: true }
        );

        if (!record) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            req.admin,
            'UPDATE',
            'Account',
            `تعديل قيد حساب: ${name || (record as any).name} - ${receiptName || (record as any).receiptName} بمبلغ ${money || (record as any).money} بتاريخ ${date || (record as any).date}`,
            { id: req.params.id, date, name, receiptName, money }
        );

        sendResponse(res, 200, true, record, 'update_success');
    } catch (error) {
        console.error('[Account Controller] update Error:', error);
        sendResponse(res, 500, false, null, 'server_error');
    }

};

// @desc    Delete account entry
// @route   DELETE /api/accounts/:id
export const deleteAccount = async (req: Request, res: Response) => {
    try {
        const record = await Account.findOneAndDelete({ _id: req.params.id, station: req.stationId });
        if (!record) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            req.admin,
            'DELETE',
            'Account',
            `حذف قيد حساب: ${(record as any).name} - ${(record as any).receiptName} بمبلغ ${(record as any).money} بتاريخ ${(record as any).date}`,
            { id: req.params.id }
        );

        sendResponse(res, 200, true, null, 'delete_success');
    } catch (error) {
        console.error('[Account Controller] delete Error:', error);
        sendResponse(res, 500, false, null, 'server_error');
    }

};

