import { Request, Response } from 'express';
import Expense from '../../database/models/station/Expense';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

// @desc    Get expenses for a date
// @route   GET /api/expenses/:date
export const getByDate = async (req: Request, res: Response) => {
    try {
        const expenses = await Expense.find({ station: req.stationId, date: req.params.date });
        sendResponse(res, 200, true, expenses);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Add expense
// @route   POST /api/expenses
export const create = async (req: Request, res: Response) => {
    try {
        const { date, receiptName, money } = req.body;
        const expense = await Expense.create({ station: req.stationId, date, receiptName, money });

        await logActivity(
            req.admin,
            'CREATE',
            'Expense',
            `اضافة مصروف: ${receiptName} بمبلغ ${money} بتاريخ ${date}`,
            { date, receiptName, money }
        );


        sendResponse(res, 201, true, expense, 'add_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
export const deleteExpense = async (req: Request, res: Response) => {
    try {
        const expense = await Expense.findOneAndDelete({ _id: req.params.id, station: req.stationId });
        if (!expense) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            req.admin,
            'DELETE',
            'Expense',
            `حذف مصروف: ${(expense as any).receiptName} بمبلغ ${(expense as any).money} بتاريخ ${(expense as any).date}`,
            { id: req.params.id }
        );

        sendResponse(res, 200, true, null, 'delete_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
export const updateExpense = async (req: Request, res: Response) => {
    try {
        const { date, receiptName, money } = req.body;
        const expense = await Expense.findOneAndUpdate(
            { _id: req.params.id, station: req.stationId },
            { date, receiptName, money },
            { new: true }
        );

        if (!expense) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            (req as any).admin,
            'UPDATE',
            'Expense',
            `تعديل مصروف: ${receiptName || (expense as any).receiptName} بمبلغ ${money || (expense as any).money} بتاريخ ${date || (expense as any).date}`,
            { id: req.params.id, date, receiptName, money }
        );

        sendResponse(res, 200, true, expense, 'update_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
