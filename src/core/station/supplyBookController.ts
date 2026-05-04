import { Request, Response } from 'express';
import SupplyBook from '../../database/models/station/SupplyBook';
import Benzene from '../../database/models/station/Benzene';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

// Helper for flexible fuel type matching
const getFuelTypeFilter = (benzType: string) => {
    let searchTerms = [benzType, benzType.toLowerCase()];
    if (benzType === 'solar') searchTerms.push('سولار', 'Diesel', 'Solar', 'Benzene solar');
    if (benzType === 'ben80') searchTerms.push('80', 'بنزين 80', 'Benzene 80');
    if (benzType === 'ben92') searchTerms.push('92', 'بنزين 92', 'Benzene 92');
    if (benzType === 'ben95') searchTerms.push('95', 'بنزين 95', 'Benzene 95');

    return { $in: searchTerms };
};

// @desc    Get supply book records for a date (or by month)
// @route   GET /api/supply-book/:date?benzType=...&month=...
export const getByDate = async (req: Request, res: Response) => {
    try {
        const { date } = req.params;
        const { benzType, month } = req.query;

        const filter: any = { station: req.stationId };
        if (month) {
            // Get all records for a given month (date format: YYYY-MM-DD)
            filter.date = { $regex: `^\\d{4}-${String(month).padStart(2, '0')}-` };
        } else {
            filter.date = (date as string).trim();
        }

        if (benzType) filter.benzType = benzType;

        const records = await SupplyBook.find(filter).sort({ date: -1 });
        sendResponse(res, 200, true, records);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update start and incoming for supply book
// @route   PUT /api/supply-book/start-incoming
export const updateStartIncoming = async (req: Request, res: Response) => {
    try {
        const { date, benzType, start, incoming } = req.body;

        // Calculate dispensed and aggregate pump numbers from benzene totals
        const benzeneRecords = await Benzene.find({ station: req.stationId, date: date.trim(), pumpType: getFuelTypeFilter(benzType) });

        const dispensed = benzeneRecords.reduce((sum, p: any) => sum + (p.liters || 0), 0);
        const pumpNumbers = benzeneRecords
            .map((p: any) => p.pumpNumber)
            .sort((a, b) => a - b)
            .join(', ');


        const finalStart = Number(start) || 0;
        const finalIncoming = Number(incoming) || 0;
        const end = (finalStart + finalIncoming) - dispensed;

        const record = await SupplyBook.findOneAndUpdate(
            { station: req.stationId, date: date.trim(), benzType },
            { station: req.stationId, start: finalStart, incoming: finalIncoming, dispensed, end, pumps: pumpNumbers },
            { new: true, upsert: true }
        );
        if (!record) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }
        await logActivity(
            req.admin,
            'UPDATE',
            'SupplyBook',
            `تعديل رصيد أول والوارد لدفتر التموين: ${benzType} بتاريخ ${date}`,
            { date, benzType, start, incoming, dispensed, end }
        );

        sendResponse(res, 200, true, record, 'update_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update standard (gauge) for all fuel types
// @route   PUT /api/supply-book/standard
export const updateStandard = async (req: Request, res: Response) => {
    try {
        const { date, standardSolar, standardB80, standardB92, standardB95 } = req.body;

        const updates = [
            { benzType: 'solar', standard: standardSolar },
            { benzType: 'ben80', standard: standardB80 },
            { benzType: 'ben92', standard: standardB92 },
            { benzType: 'ben95', standard: standardB95 },
        ];


        for (const u of updates) {
            await SupplyBook.findOneAndUpdate(
                { station: req.stationId, date: (date as string).trim(), benzType: u.benzType },
                { station: req.stationId, standard: Number(u.standard) || 0 },
                { upsert: true, new: true }
            );
        }

        await logActivity(
            req.admin,
            'UPDATE',
            'SupplyBook',
            `تعديل المعاير (العيار) لجميع أنواع البنزين بتاريخ ${date}`,
            { date, standardSolar, standardB80, standardB92, standardB95 }
        );

        sendResponse(res, 200, true, null, 'update_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update any supply book field
// @route   PUT /api/supply-book/:id
export const updateRecord = async (req: Request, res: Response) => {
    try {
        const { start, incoming, pumps, standard } = req.body;
        const record = await SupplyBook.findOne({ _id: req.params.id, station: req.stationId });
        if (!record) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        const { date, benzType } = record as any;

        // Re-calculate dispensed and aggregate pump numbers from benzene totals to ensure parity
        const benzeneRecords = await Benzene.find({ station: req.stationId, date: date.trim(), pumpType: getFuelTypeFilter(benzType) });

        const dispensed = benzeneRecords.reduce((sum, p: any) => sum + (p.liters || 0), 0);

        // Auto-calculate pump numbers string
        const autoPumpNumbers = benzeneRecords
            .map((p: any) => p.pumpNumber)
            .sort((a, b) => a - b)
            .join(', ');

        const finalStart = start !== undefined ? Number(start) : (record as any).start;
        const finalIncoming = incoming !== undefined ? Number(incoming) : (record as any).incoming;
        const finalStandard = standard !== undefined ? Number(standard) : (record as any).standard;

        // Only use provided pumps if they are NOT an empty string, otherwise use auto-calculated ones
        const finalPumps = (pumps && pumps.trim() !== "") ? pumps : autoPumpNumbers;

        const end = (finalStart + finalIncoming) - dispensed;

        const updatedRecord = await SupplyBook.findOneAndUpdate(
            { _id: req.params.id, station: req.stationId },
            {
                station: req.stationId,
                start: finalStart,
                incoming: finalIncoming,
                dispensed,
                end,
                pumps: finalPumps,
                standard: finalStandard
            },
            { new: true }
        );


        await logActivity(
            req.admin,
            'UPDATE',
            'SupplyBook',
            `تعديل سجل دفتر التموين: ${benzType} بتاريخ ${date}`,
            { date, benzType, start: finalStart, incoming: finalIncoming, dispensed, end, standard: finalStandard }
        );

        sendResponse(res, 200, true, updatedRecord, 'update_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};


// @desc    Get supply book balance matching (motbkt arsda) for a month
// @route   GET /api/supply-book/balance/:month
export const getBalance = async (req: Request, res: Response) => {
    try {
        const { month } = req.params;
        const dateRegex = `^\\d{4}-${String(month).padStart(2, '0')}-`;
        const benzTypes = ['solar', 'ben80', 'ben92', 'ben95'];
        const result: any = {};


        for (const type of benzTypes) {
            const records = await SupplyBook.find({
                station: req.stationId,
                date: { $regex: dateRegex },
                benzType: type,
            });

            const totalStart = records.reduce((sum, r: any) => sum + r.start, 0);
            const totalIncoming = records.reduce((sum, r: any) => sum + r.incoming, 0);
            const totalDispensed = records.reduce((sum, r: any) => sum + r.dispensed, 0);
            const total = totalStart + totalIncoming;
            const balance = total - totalDispensed;

            result[type] = { start: totalStart, incoming: totalIncoming, total, dispensed: totalDispensed, balance };
        }

        sendResponse(res, 200, true, result);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Get standard (gauge) values for a date
// @route   GET /api/supply-book/standard/:date
export const getStandard = async (req: Request, res: Response) => {
    try {
        const { date } = req.params;
        const benzTypes = ['solar', 'ben80', 'ben92', 'ben95'];
        const result: any = {};


        for (const type of benzTypes) {
            const record = await SupplyBook.findOne({ station: req.stationId, date, benzType: type });
            result[type] = record ? (record as any).standard : 0;
        }

        sendResponse(res, 200, true, result);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Create a new supply book record
// @route   POST /api/supply-book
export const createRecord = async (req: Request, res: Response) => {
    try {
        const { date, benzType, start = 0, incoming = 0, pumps = '', standard = 0 } = req.body;

        // Check if record already exists for this date + benzType
        const existing = await SupplyBook.findOne({ station: req.stationId, date: date.trim(), benzType });
        if (existing) {
            return sendResponse(res, 400, false, null, 'item_already_exists');
        }

        // Calculate dispensed and aggregate pump numbers from benzene totals
        const benzeneRecords = await Benzene.find({ station: req.stationId, date: date.trim(), pumpType: getFuelTypeFilter(benzType) });

        const dispensed = benzeneRecords.reduce((sum, p: any) => sum + (p.liters || 0), 0);
        const autoPumpNumbers = benzeneRecords
            .map((p: any) => p.pumpNumber)
            .sort((a, b) => a - b)
            .join(', ');

        const finalPumps = (pumps && pumps.trim() !== "") ? pumps : autoPumpNumbers;
        const end = (start + incoming) - dispensed;



        const record = await SupplyBook.create({
            station: req.stationId,
            date: date.trim(), benzType, start, incoming, dispensed, pumps: finalPumps, end, standard
        });


        await logActivity(
            req.admin,
            'CREATE',
            'SupplyBook',
            `إنشاء سجل دفتر التموين: ${benzType} بتاريخ ${date}`,
            { date, benzType, start, incoming, dispensed, pumps, end, standard }
        );

        sendResponse(res, 201, true, record, 'supply_book_created');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Delete a supply book record by ID
// @route   DELETE /api/supply-book/:id
export const deleteRecord = async (req: Request, res: Response) => {
    try {
        const record = await SupplyBook.findOne({ _id: req.params.id, station: req.stationId });
        if (!record) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        const { date, benzType } = record as any;
        await SupplyBook.findOneAndDelete({ _id: req.params.id, station: req.stationId });

        await logActivity(
            req.admin,
            'DELETE',
            'SupplyBook',
            `حذف سجل دفتر التموين: ${benzType} بتاريخ ${date}`,
            { id: req.params.id, date, benzType }
        );

        sendResponse(res, 200, true, null, 'supply_book_deleted');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Delete all supply book records for a month (balance reset)
// @route   DELETE /api/supply-book/balance/:month
export const deleteBalance = async (req: Request, res: Response) => {
    try {
        const { month } = req.params;
        const { benzType } = req.query;
        const dateRegex = `^\\d{4}-${String(month).padStart(2, '0')}-`;

        let filter: any = { station: req.stationId, date: { $regex: dateRegex } };
        if (benzType) filter.benzType = benzType;

        const result = await SupplyBook.deleteMany(filter);

        await logActivity(
            req.admin,
            'DELETE',
            'SupplyBook',
            `حذف أرصدة دفتر التموين للشهر ${month}${benzType ? ` - ${benzType}` : ''}`,
            { month, benzType, deletedCount: result.deletedCount }
        );

        sendResponse(res, 200, true, { deletedCount: result.deletedCount }, 'balance_deleted');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Reset standard (gauge) values for a date
// @route   DELETE /api/supply-book/standard/:date
export const deleteStandard = async (req: Request, res: Response) => {
    try {
        const { date } = req.params;
        const benzTypes = ['solar', 'ben80', 'ben92', 'ben95'];


        for (const type of benzTypes) {
            await SupplyBook.findOneAndUpdate(
                { station: req.stationId, date: (date as string).trim(), benzType: type },
                { standard: 0 },
                { upsert: true, new: true }
            );
        }

        await logActivity(
            req.admin,
            'DELETE',
            'SupplyBook',
            `إعادة تعيين المعاير (العيار) لجميع أنواع البنزين بتاريخ ${date}`,
            { date }
        );

        sendResponse(res, 200, true, null, 'standard_reset');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
