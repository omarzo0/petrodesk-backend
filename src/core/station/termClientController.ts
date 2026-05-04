import { Request, Response } from 'express';
import TermClient from '../../database/models/station/TermClient';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

// @desc    Get term client payments for a date
// @route   GET /api/term-clients/:date
export const getByDate = async (req: Request, res: Response) => {
    try {
        const records = await TermClient.find({ station: req.stationId, date: req.params.date });
        const total = records.reduce((sum, r: any) => sum + (r.money || 0), 0);
        sendResponse(res, 200, true, { data: records, total });

    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Add term client payment
// @route   POST /api/term-clients
export const create = async (req: Request, res: Response) => {
    try {
        const { date, clientName, receiptName, money, receiptNumber } = req.body;

        const record = await TermClient.create({
            station: req.stationId,
            date,
            clientName,
            receiptName,
            money: money || 0,
            receiptNumber
        });


        await logActivity(
            req.admin,
            'CREATE',
            'TermClient',
            `اضافة دفعة عميل آجل: ${clientName} - ${receiptName} بمبلغ ${money || 0} برقم إيصال ${receiptNumber || 'N/A'} بتاريخ ${date}`,
            { date, clientName, receiptName, money: money || 0, receiptNumber }

        );


        sendResponse(res, 201, true, record, 'add_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Delete term client payment
// @route   DELETE /api/term-clients/:id
export const deleteTermClient = async (req: Request, res: Response) => {
    try {
        const record = await TermClient.findOneAndDelete({ _id: req.params.id, station: req.stationId });
        if (!record) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            req.admin,
            'DELETE',
            'TermClient',
            `حذف دفعة عميل آجل: ${(record as any).clientName} - ${(record as any).receiptName} بمبلغ ${(record as any).money} بتاريخ ${(record as any).date}`,
            { id: req.params.id }
        );

        sendResponse(res, 200, true, null, 'delete_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update term client payment
// @route   PUT /api/term-clients/:id
export const updateRecord = async (req: Request, res: Response) => {
    try {
        const { date, clientName, receiptName, money, receiptNumber } = req.body;

        const updateData: any = { date, clientName, receiptName, receiptNumber };
        if (money !== undefined) {
            updateData.money = money;
        }


        const record = await TermClient.findOneAndUpdate(
            { _id: req.params.id, station: req.stationId },
            updateData,
            { new: true }
        );

        if (!record) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            (req as any).admin,
            'UPDATE',
            'TermClient',
            `تعديل دفعة عميل آجل: ${clientName || (record as any).clientName} - ${receiptName || (record as any).receiptName} بمبلغ ${money || (record as any).money} بتاريخ ${date || (record as any).date}`,
            { id: req.params.id, ...updateData }

        );

        sendResponse(res, 200, true, record, 'update_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
