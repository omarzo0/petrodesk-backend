import { Request, Response } from 'express';
import TreasuryMovement from '../../database/models/station/TreasuryMovement';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

// @desc    Get treasury movements for a date (filter by type and statement)
// @route   GET /api/treasury-movement/:date?type=...&statement=...
export const getByDate = async (req: Request, res: Response) => {
    try {
        const filter: any = { station: req.stationId, date: req.params.date };
        if (req.query.type) filter.type = req.query.type;
        if (req.query.statement) filter.statement = req.query.statement;

        const records = await TreasuryMovement.find(filter).sort({ createdAt: -1 });
        sendResponse(res, 200, true, records); // Flattened for frontend
    } catch (error) {
        console.error('[TreasuryMovement Controller] getByDate Error:', error);
        sendResponse(res, 500, false, null, 'server_error');
    }

};

// @desc    Add treasury movement (mkbodat or mdfo3at)
// @route   POST /api/treasury-movement
export const create = async (req: Request, res: Response) => {
    try {
        const { date, type, statement, receiptName, money, description } = req.body;

        if (!date || !type || !statement || money === undefined) {
            return sendResponse(res, 400, false, null, 'required_fields');
        }

        const record = await TreasuryMovement.create({ station: req.stationId, date, type, statement, receiptName, money, description });

        await logActivity(
            req.admin,
            'CREATE',
            'TreasuryMovement',
            `اضافة حركة خزينة (${type}): ${statement} - ${receiptName} بمبلغ ${money} بتاريخ ${date}`,
            { date, type, statement, receiptName, money, description }
        );

        sendResponse(res, 201, true, record, 'add_success');
    } catch (error) {
        console.error('[TreasuryMovement Controller] create Error:', error);
        sendResponse(res, 500, false, null, 'server_error');
    }

};

// @desc    Update treasury movement
// @route   PUT /api/treasury-movement/:id
export const updateMovement = async (req: Request, res: Response) => {
    try {
        const { date, type, statement, receiptName, money, description } = req.body;
        const record = await TreasuryMovement.findOneAndUpdate(
            { _id: req.params.id, station: req.stationId },
            { date, type, statement, receiptName, money, description },
            { new: true }
        );

        if (!record) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            req.admin,
            'UPDATE',
            'TreasuryMovement',
            `تعديل حركة خزينة (${type || (record as any).type}): ${statement || (record as any).statement} - ${receiptName || (record as any).receiptName} بمبلغ ${money || (record as any).money} بتاريخ ${date || (record as any).date}`,
            { id: req.params.id, date, type, statement, receiptName, money, description }
        );

        sendResponse(res, 200, true, record, 'update_success');
    } catch (error) {
        console.error('[TreasuryMovement Controller] update Error:', error);
        sendResponse(res, 500, false, null, 'server_error');
    }

};

// @desc    Delete treasury movement
// @route   DELETE /api/treasury-movement/:id
export const deleteMovement = async (req: Request, res: Response) => {
    try {
        const record = await TreasuryMovement.findOneAndDelete({ _id: req.params.id, station: req.stationId });
        if (!record) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            req.admin,
            'DELETE',
            'TreasuryMovement',
            `حذف حركة خزينة (${(record as any).type}): ${(record as any).statement} - ${(record as any).receiptName} بمبلغ ${(record as any).money} بتاريخ ${(record as any).date}`,
            { id: req.params.id }
        );

        sendResponse(res, 200, true, null, 'delete_success');
    } catch (error) {
        console.error('[TreasuryMovement Controller] delete Error:', error);
        sendResponse(res, 500, false, null, 'server_error');
    }

};

