import { Request, Response } from 'express';
import Oil, { OilStorage, OilShift } from '../../database/models/station/Oil';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

// ============ Oil Shift ============

// @desc    Get all oils
// @route   GET /api/oils
export const getAll = async (req: Request, res: Response) => {
    try {
        const oils = await Oil.find({ station: req.stationId });
        sendResponse(res, 200, true, oils);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Add new oil
// @route   POST /api/oils
export const create = async (req: Request, res: Response) => {
    try {
        const { oilName, price } = req.body;
        if (!oilName) {
            return sendResponse(res, 400, false, null, 'required_fields');
        }

        const existing = await Oil.findOne({ station: req.stationId, oilName });
        if (existing) {
            return sendResponse(res, 400, false, null, 'item_exists');
        }

        const oil = await Oil.create({ station: req.stationId, oilName, price: price || 0 });

        // Log activity
        await logActivity(
            (req as any).admin,
            'CREATE',
            'Oil',
            `اضافة زيت جديد: ${oilName}`,
            { oilName, price }
        );

        sendResponse(res, 201, true, oil, 'oil_added');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Search oil by name
// @route   GET /api/oils/search?name=...
export const search = async (req: Request, res: Response) => {
    try {
        const oil = await Oil.findOne({ station: req.stationId, oilName: req.query.name as string });
        if (!oil) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }
        sendResponse(res, 200, true, oil);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update oil
// @route   PUT /api/oils/:id
export const update = async (req: Request, res: Response) => {
    try {
        const { oilName, price } = req.body;
        const oil = await Oil.findOneAndUpdate({ _id: req.params.id, station: req.stationId }, { oilName, price }, { new: true });
        if (!oil) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            (req as any).admin,
            'UPDATE',
            'Oil',
            `تعديل بيانات زيت: ${oilName || (oil as any).oilName}`,
            { id: req.params.id, oilName, price }
        );

        sendResponse(res, 200, true, oil, 'update_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Delete oil
// @route   DELETE /api/oils/:id
export const deleteOil = async (req: Request, res: Response) => {
    try {
        const oil = await Oil.findOneAndDelete({ _id: req.params.id, station: req.stationId });
        if (!oil) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            req.admin,
            'DELETE',
            'Oil',
            `حذف زيت: ${(oil as any).oilName}`,
            { id: req.params.id }
        );


        sendResponse(res, 200, true, null, 'oil_deleted');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// ============ Oil Storage ============

// @desc    Get oil storage records for a date
// @route   GET /api/oil-storage/:date
export const getStorageByDate = async (req: Request, res: Response) => {
    try {
        const { date } = req.params;
        let records = await OilStorage.find({ station: req.stationId, date });

        if (records.length === 0) {
            // Find most recent storage record before this date
            const lastRecord = await OilStorage.findOne({ station: req.stationId, date: { $lt: date } }).sort({ date: -1 });
            if (lastRecord) {
                const prevDate = lastRecord.date;
                const prevRecords = await OilStorage.find({ station: req.stationId, date: prevDate });

                // Map previous end balances to today's start balances
                records = prevRecords.map(r => ({
                    date,
                    oilName: r.oilName,
                    startBalance: r.endBalance,
                    endBalance: r.endBalance,
                    storageIncoming: 0,
                    _id: `virtual-${r.oilName}`
                } as any));
            }
        }

        sendResponse(res, 200, true, records);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update oil storage record
// @route   PUT /api/oil-storage
export const updateStorage = async (req: Request, res: Response) => {
    try {
        const { date, oilName, startBalance, storageIncoming } = req.body;
        let { endBalance } = req.body;

        // Logic: endBalance = startBalance + storageIncoming
        if (endBalance === undefined || endBalance === null) {
            endBalance = (startBalance || 0) + (storageIncoming || 0);
        }

        const record = await OilStorage.findOneAndUpdate(
            { station: req.stationId, date, oilName },
            { station: req.stationId, startBalance, endBalance, storageIncoming },
            { new: true, upsert: true }
        );

        if (!record) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            req.admin,
            'UPDATE',
            'OilStorage',
            `تعديل وارد زيت (مخزن): ${oilName} - الكمية الجديدة ${storageIncoming} بتاريخ ${date}`,
            { date, oilName, startBalance, endBalance, storageIncoming }
        );


        sendResponse(res, 200, true, record, 'update_success');
    } catch (error: any) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// ============ Oil Shift ============

// @desc    Get oil shift records for a date
// @route   GET /api/oil-shift/:date
export const getShiftByDate = async (req: Request, res: Response) => {
    try {
        const { date } = req.params;
        let records = await OilShift.find({ station: req.stationId, date });

        if (records.length === 0) {
            // Find most recent shift record before this date
            const lastRecord = await OilShift.findOne({ station: req.stationId, date: { $lt: date } }).sort({ date: -1 });
            if (lastRecord) {
                const prevDate = lastRecord.date;
                const prevRecords = await OilShift.find({ station: req.stationId, date: prevDate });

                // Map previous end balances to today's first term balances
                records = prevRecords.map(r => ({
                    date,
                    oilName: r.oilName,
                    firstTermBalance: r.endTermBalance,
                    endTermBalance: r.endTermBalance,
                    incoming: 0,
                    sold: 0,
                    price: r.price,
                    total: 0,
                    _id: `virtual-${r.oilName}`
                } as any));
            }
        }

        sendResponse(res, 200, true, records);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update oil shift record
// @route   PUT /api/oil-shift
export const updateShift = async (req: Request, res: Response) => {
    try {
        const { date, oilName, firstTermBalance, endTermBalance, incoming } = req.body;
        let { sold } = req.body;

        // Get oil price
        const oil = await Oil.findOne({ station: req.stationId, oilName });
        if (!oil) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        // Logic: sold = firstTermBalance + incoming - endTermBalance
        // If sold is not provided, calculate it. If it is provided, we still recalculate for consistency.
        const calculatedSold = (firstTermBalance || 0) + (incoming || 0) - (endTermBalance || 0);
        sold = calculatedSold;

        const total = (oil as any).price * sold;
        const record = await OilShift.findOneAndUpdate(
            { station: req.stationId, date, oilName },
            {
                station: req.stationId,
                firstTermBalance,
                endTermBalance,
                incoming,
                sold: (sold < 0 ? 0 : sold), // Ensure sold is not negative
                price: (oil as any).price,
                total: (total < 0 ? 0 : total)
            },
            { new: true, upsert: true }
        );
        if (!record) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            req.admin,
            'UPDATE',
            'OilShift',
            `تعديل مبيعات زيت (ورديه): ${oilName} - الكمية المباعة ${sold} بتاريخ ${date}`,
            { date, oilName, firstTermBalance, endTermBalance, incoming, sold, total }
        );


        sendResponse(res, 200, true, record, 'update_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Delete oil storage record
// @route   DELETE /api/oils/storage/:id
export const deleteStorageById = async (req: Request, res: Response) => {
    try {
        const record = await OilStorage.findOneAndDelete({ _id: req.params.id, station: req.stationId });
        if (!record) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            req.admin,
            'DELETE',
            'OilStorage',
            `حذف وارد زيت (مخزن): ${(record as any).oilName} بتاريخ ${(record as any).date}`,
            { id: req.params.id }
        );


        sendResponse(res, 200, true, null, 'storage_deleted');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Delete oil shift record
// @route   DELETE /api/oils/shift/:id
export const deleteShiftById = async (req: Request, res: Response) => {
    try {
        const record = await OilShift.findOneAndDelete({ _id: req.params.id, station: req.stationId });
        if (!record) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            (req as any).admin,
            'DELETE',
            'OilShift',
            `حذف مبيعات زيت (ورديه): ${(record as any).oilName} بتاريخ ${(record as any).date}`,
            { id: req.params.id }
        );

        sendResponse(res, 200, true, null, 'shift_deleted');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
