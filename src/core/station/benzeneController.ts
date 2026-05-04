import { Request, Response } from 'express';
import Benzene, { BenzenePrice } from '../../database/models/station/Benzene';
import SupplyBook from '../../database/models/station/SupplyBook';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

/**
 * Helper to find the most recent price record on or before a given date.
 */
const findLatestPriceRecord = async (date: string, stationId: any) => {
    return await BenzenePrice.findOne({ station: stationId, date: { $lte: date } }).sort({ date: -1 });
};

// Helper for fuel type normalization
const normalizeFuelType = (type: string): string => {
    const t = type.toLowerCase();
    if (t.includes('solar') || t.includes('سولار')) return 'solar';
    if (t.includes('80')) return 'ben80';
    if (t.includes('92')) return 'ben92';
    if (t.includes('95')) return 'ben95';
    return t;
};


// @desc    Get all benzene pump records for a date
// @route   GET /api/benzene/:date
export const getPumpByDate = async (req: Request, res: Response) => {
    try {
        const records = await Benzene.find({ station: req.stationId, date: req.params.date });
        sendResponse(res, 200, true, records);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Get benzene pump records by date and type
// @route   GET /api/benzene/:date/:type
export const getPumpByDateAndType = async (req: Request, res: Response) => {
    try {
        const records = await Benzene.find({ station: req.stationId, date: req.params.date, pumpType: req.params.type });
        sendResponse(res, 200, true, records);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Create a new benzene pump record
// @route   POST /api/benzene
export const createPumpRecord = async (req: Request, res: Response) => {
    try {
        const { date, pumpNumber, pumpType, start, end } = req.body;

        const finalStart = Number(start) || 0;
        const finalEnd = Number(end) || 0;

        if (finalEnd < finalStart) {
            return sendResponse(res, 400, false, null, 'end_must_be_greater');
        }

        const liters = finalEnd - finalStart;
        const normalizedType = normalizeFuelType(pumpType);

        // Fetch current price (or most recent) for this date and type
        let price = 0;
        const priceRecord = await findLatestPriceRecord(date, req.stationId);
        if (priceRecord) {
            if (normalizedType === 'solar') price = priceRecord.solarPrice;
            else if (normalizedType === 'ben80') price = priceRecord.ben80Price;
            else if (normalizedType === 'ben92') price = priceRecord.ben92Price;
            else if (normalizedType === 'ben95') price = priceRecord.ben95Price;
        }

        const totalAmount = liters * price;

        const record = await Benzene.create({
            station: req.stationId,
            date,
            pumpNumber: Number(pumpNumber) || 0,
            pumpType: normalizedType,
            start: finalStart,
            end: finalEnd,
            liters,
            price,
            totalAmount
        });


        // Update supply book
        const allPumps = await Benzene.find({ station: req.stationId, date, pumpType: normalizedType });
        const totalDispensed = allPumps.reduce((sum, p: any) => sum + p.liters, 0);
        const pumpNumbers = allPumps
            .map((p: any) => p.pumpNumber)
            .sort((a, b) => a - b)
            .join(', ');

        const supplyBook = await SupplyBook.findOne({ station: req.stationId, date, benzType: normalizedType });
        if (supplyBook) {
            const finalStart = Number((supplyBook as any).start) || 0;
            const finalIncoming = Number((supplyBook as any).incoming) || 0;

            (supplyBook as any).dispensed = totalDispensed;
            (supplyBook as any).pumps = pumpNumbers;
            (supplyBook as any).end = (finalStart + finalIncoming) - totalDispensed;
            await supplyBook.save();
        }


        await logActivity(
            req.admin,
            'CREATE',
            'Benzene',
            `إضافة قراءة طلمبة: ${pumpType} - رقم ${pumpNumber} بتاريخ ${date}`,
            { id: record._id, date, pumpNumber, pumpType, start, end, liters, price, totalAmount }
        );

        sendResponse(res, 201, true, record, 'benzene_added');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update a benzene pump record
// @route   PUT /api/benzene/:id
export const updatePumpById = async (req: Request, res: Response) => {
    try {
        const { start, end, pumpNumber, pumpType } = req.body;

        const existingRecord = await Benzene.findOne({ _id: req.params.id, station: req.stationId });
        if (!existingRecord) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        const finalStart = start !== undefined ? Number(start) : existingRecord.start;
        const finalEnd = end !== undefined ? Number(end) : existingRecord.end;

        if (finalEnd < finalStart) {
            return sendResponse(res, 400, false, null, 'end_must_be_greater');
        }

        const liters = finalEnd - finalStart;
        const finalType = pumpType || existingRecord.pumpType;
        const normalizedType = normalizeFuelType(finalType);
        const finalPumpNumber = pumpNumber !== undefined ? Number(pumpNumber) : existingRecord.pumpNumber;

        // Fetch current price (or most recent) for this date and type (in case it changed)
        let price = 0;
        const priceRecord = await findLatestPriceRecord(existingRecord.date, req.stationId);
        if (priceRecord) {
            if (normalizedType === 'solar') price = priceRecord.solarPrice;
            else if (normalizedType === 'ben80') price = priceRecord.ben80Price;
            else if (normalizedType === 'ben92') price = priceRecord.ben92Price;
            else if (normalizedType === 'ben95') price = priceRecord.ben95Price;
        }

        const totalAmount = liters * price;

        const record = await Benzene.findOneAndUpdate(
            { _id: req.params.id, station: req.stationId },
            {
                start: finalStart,
                end: finalEnd,
                liters,
                price,
                totalAmount,
                pumpNumber: finalPumpNumber,
                pumpType: normalizedType
            },
            { new: true }
        );

        if (!record) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        // Update supply book (monsrf and end) for this fuel type and date
        // Use the new type/date from the record
        const allPumps = await Benzene.find({ station: req.stationId, date: record.date, pumpType: record.pumpType });
        const totalDispensed = allPumps.reduce((sum, p: any) => sum + p.liters, 0);
        const pumpNumbers = allPumps
            .map((p: any) => p.pumpNumber)
            .sort((a, b) => a - b)
            .join(', ');

        const supplyBook = await SupplyBook.findOne({ station: req.stationId, date: record.date, benzType: normalizeFuelType(record.pumpType) });

        if (supplyBook) {
            const currentStart = Number((supplyBook as any).start) || 0;
            const currentIncoming = Number((supplyBook as any).incoming) || 0;

            (supplyBook as any).dispensed = totalDispensed;
            (supplyBook as any).pumps = pumpNumbers;
            (supplyBook as any).end = (currentStart + currentIncoming) - totalDispensed;
            await supplyBook.save();
        }

        await logActivity(
            req.admin,
            'UPDATE',
            'Benzene',
            `تعديل قراءة طلمبة: ${record.pumpType} - رقم ${record.pumpNumber} بتاريخ ${record.date}`,
            { id: req.params.id, start: finalStart, end: finalEnd, liters, totalAmount, pumpNumber: finalPumpNumber, pumpType: normalizedType }
        );

        sendResponse(res, 200, true, record, 'update_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Delete a benzene pump record
// @route   DELETE /api/benzene/:id
export const deletePumpById = async (req: Request, res: Response) => {
    try {
        const record = await Benzene.findOne({ _id: req.params.id, station: req.stationId });
        if (!record) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        const { date, pumpType, pumpNumber } = record as any;
        await Benzene.findOneAndDelete({ _id: req.params.id, station: req.stationId });

        // Update supply book after deletion
        const allRemainingPumps = await Benzene.find({ station: req.stationId, date, pumpType });
        const totalDispensed = allRemainingPumps.reduce((sum, p: any) => sum + p.liters, 0);
        const pumpNumbers = allRemainingPumps
            .map((p: any) => p.pumpNumber)
            .sort((a, b) => a - b)
            .join(', ');

        const supplyBook = await SupplyBook.findOne({ station: req.stationId, date, benzType: normalizeFuelType(pumpType) });

        if (supplyBook) {
            const finalStart = Number((supplyBook as any).start) || 0;
            const finalIncoming = Number((supplyBook as any).incoming) || 0;

            (supplyBook as any).dispensed = totalDispensed;
            (supplyBook as any).pumps = pumpNumbers;
            (supplyBook as any).end = (finalStart + finalIncoming) - totalDispensed;
            await supplyBook.save();
        }

        await logActivity(
            req.admin,
            'DELETE',
            'Benzene',
            `حذف قراءة طلمبة: ${pumpType} - رقم ${pumpNumber} بتاريخ ${date}`,
            { id: req.params.id, date, pumpType, pumpNumber }
        );

        sendResponse(res, 200, true, null, 'benzene_deleted');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Get total benzene consumption for a date
// @route   GET /api/benzene/totals/:date
export const getPumpTotals = async (req: Request, res: Response) => {
    try {
        const { date } = req.params;
        const types = ['solar', 'ben80', 'ben92', 'ben95'];
        const totals: { [key: string]: number } = {};


        for (const type of types) {
            const records = await Benzene.find({ station: req.stationId, date, pumpType: type });
            totals[type] = records.reduce((sum, r: any) => sum + r.liters, 0);
        }

        sendResponse(res, 200, true, totals);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Get benzene prices for a date
// @route   GET /api/benzene/prices/:date
export const getPricingByDate = async (req: Request, res: Response) => {
    try {
        const price = await findLatestPriceRecord(req.params.date as string, req.stationId);
        if (!price) {
            return sendResponse(res, 404, false, null, 'no_data_date');
        }
        sendResponse(res, 200, true, price);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update benzene prices for a date
// @route   PUT /api/benzene/prices/:date
export const updatePricingByDate = async (req: Request, res: Response) => {
    try {
        const { solarPrice, ben80Price, ben92Price, ben95Price } = req.body;
        const price = await BenzenePrice.findOneAndUpdate(
            { station: req.stationId, date: req.params.date },
            { station: req.stationId, solarPrice, ben80Price, ben92Price, ben95Price },
            { new: true, upsert: true }
        );
        if (!price) {
            return sendResponse(res, 404, false, null, 'no_data_date');
        }
        await logActivity(
            req.admin,
            'UPDATE',
            'BenzenePrice',
            `تعديل أسعار البنزين بتاريخ ${req.params.date}`,
            { date: req.params.date, solarPrice, ben80Price, ben92Price, ben95Price }
        );

        sendResponse(res, 200, true, price, 'update_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Delete benzene prices for a date
// @route   DELETE /api/benzene/prices/:date
export const deletePricingByDate = async (req: Request, res: Response) => {
    try {
        const price = await BenzenePrice.findOneAndDelete({ station: req.stationId, date: req.params.date });
        if (!price) {
            return sendResponse(res, 404, false, null, 'no_data_date');
        }

        await logActivity(
            req.admin,
            'DELETE',
            'BenzenePrice',
            `حذف أسعار البنزين بتاريخ ${req.params.date}`,
            { date: req.params.date }
        );

        sendResponse(res, 200, true, null, 'pricing_deleted');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
