import { Request, Response } from 'express';
import { BenzenePrice } from '../../database/models/station/Benzene';
import Benzene from '../../database/models/station/Benzene';
import { OilShift } from '../../database/models/station/Oil';
import Voucher from '../../database/models/station/Voucher';
import Expense from '../../database/models/station/Expense';
import TermClient from '../../database/models/station/TermClient';
import DailyTreasury from '../../database/models/station/DailyTreasury';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

/**
 * Internal helper to calculate full summary for a date
 */
const fetchSummary = async (date: string, stationId: string) => {
    // Get benzene prices
    const priceRecord: any = await BenzenePrice.findOne({ station: stationId, date });
    if (!priceRecord) return null;

    // Get fuel totals from Benzene pump records
    const types = ['solar', 'ben80', 'ben92', 'ben95'];
    const fuelTotals: { [key: string]: { quantity: number; money: number } } = {};

    for (const type of types) {
        const records = await Benzene.find({ station: stationId, date, pumpType: type });
        fuelTotals[type] = {
            quantity: records.reduce((sum, r: any) => sum + (r.liters || 0), 0),
            money: records.reduce((sum, r: any) => sum + (r.totalAmount || 0), 0)
        };
    }

    // Get oil totals
    const oilShifts = await OilShift.find({ station: stationId, date });
    const totalOilsSold = oilShifts.reduce((sum, o: any) => sum + o.sold, 0);
    const totalOilsMoney = oilShifts.reduce((sum, o: any) => sum + o.total, 0);

    // Calculate total income
    const totalFuelMoney = Object.values(fuelTotals).reduce((sum, f) => sum + f.money, 0);
    const totalIncome = totalFuelMoney + totalOilsMoney;

    // Get deductions
    const vouchers = await Voucher.find({ station: stationId, date });
    const totalVouchers = vouchers.reduce((sum, b: any) => sum + (b.total || 0), 0);
    const vouchersCount = vouchers.length;

    const expenses = await Expense.find({ station: stationId, date });
    const totalExpenses = expenses.reduce((sum, e: any) => sum + e.money, 0);
    const expensesCount = expenses.length;

    const termClients = await TermClient.find({ station: stationId, date });
    const totalTermClients = termClients.reduce((sum, t: any) => sum + (t.money || 0), 0);
    const termClientsCount = termClients.length;

    const totalDeductions = totalVouchers + totalExpenses + totalTermClients;
    const safe = totalIncome - totalDeductions;

    // Get island and fromShift
    const island: any = await DailyTreasury.findOne({ station: stationId, date, statement: 'island' });
    const fromShift: any = await DailyTreasury.findOne({ station: stationId, date, statement: 'fromShift' });

    const islandMoney = island ? island.money : 0;
    const fromShiftMoney = fromShift ? fromShift.money : 0;

    // Get manual entries (everything that isn't island or fromShift)
    const manualEntries = await DailyTreasury.find({
        station: stationId,
        date,
        statement: { $nin: ['island', 'fromShift'] }
    });

    const totalManual = manualEntries.reduce((sum, e: any) => sum + (e.money || 0), 0);
    const lastSafe = (safe + islandMoney + totalManual) - fromShiftMoney;

    return {
        fuel: {
            solar: { quantity: fuelTotals['solar'].quantity, price: priceRecord.solarPrice, money: fuelTotals['solar'].money },
            ben80: { quantity: fuelTotals['ben80'].quantity, price: priceRecord.ben80Price, money: fuelTotals['ben80'].money },
            ben92: { quantity: fuelTotals['ben92'].quantity, price: priceRecord.ben92Price, money: fuelTotals['ben92'].money },
            ben95: { quantity: fuelTotals['ben95'].quantity, price: priceRecord.ben95Price, money: fuelTotals['ben95'].money },
        },
        oils: { quantity: totalOilsSold, money: totalOilsMoney },
        totalIncome,
        deductions: {
            vouchers: { count: vouchersCount, total: totalVouchers },
            expenses: { count: expensesCount, total: totalExpenses },
            termClients: { count: termClientsCount, total: totalTermClients },
        },
        totalDeductions,
        safe,
        island: island || { quantity: 0, price: 0, money: 0 },
        fromShift: fromShift || { quantity: 0, price: 0, money: 0 },
        lastSafe,
        manualEntries: manualEntries.map((e: any) => ({
            id: e._id,
            statement: e.statement,
            quantity: e.quantity,
            price: e.price,
            money: e.money,
            date: e.date
        }))
    };


};

// @desc    Get daily treasury summary for a date
// @route   GET /api/daily-treasury/:date
export const getByDate = async (req: Request, res: Response) => {
    try {
        const date = req.params.date as string;
        const summary = await fetchSummary(date, req.stationId);

        if (!summary) return sendResponse(res, 404, false, null, 'no_data_date');
        sendResponse(res, 200, true, summary);
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};


// @desc    Update island in daily treasury
// @route   PUT /api/daily-treasury/island
export const updateIsland = async (req: Request, res: Response) => {
    try {
        const { date, quantity, price } = req.body;
        const money = (quantity || 0) * (price || 0);
        const record = await DailyTreasury.findOneAndUpdate(
            { station: req.stationId, date, statement: 'island' },
            { station: req.stationId, quantity, price, money },
            { new: true, upsert: true }
        );
        if (!record) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            req.admin,
            'UPDATE',
            'DailyTreasury',
            `تعديل بند (Island) في ملخص اليومية بتاريخ ${date}`,
            { date, quantity, price, money }
        );

        const summary = await fetchSummary(date, req.stationId);
        sendResponse(res, 200, true, summary, 'update_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update fromShift in daily treasury
// @route   PUT /api/daily-treasury/from-shift
export const updateFromShift = async (req: Request, res: Response) => {
    try {
        const { date, quantity, price } = req.body;
        const money = (quantity || 0) * (price || 0);
        const record = await DailyTreasury.findOneAndUpdate(
            { station: req.stationId, date, statement: 'fromShift' },
            { station: req.stationId, quantity, price, money },
            { new: true, upsert: true }
        );
        if (!record) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            req.admin,
            'UPDATE',
            'DailyTreasury',
            `تعديل بند (From Shift) في ملخص اليومية بتاريخ ${date}`,
            { date, quantity, price, money }
        );

        const summary = await fetchSummary(date, req.stationId);
        sendResponse(res, 200, true, summary, 'update_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Create daily treasury entry
// @route   POST /api/daily-treasury
export const createEntry = async (req: Request, res: Response) => {
    try {
        const { date, quantity, price, money, statement } = req.body;
        if (!date || !statement) {
            return sendResponse(res, 400, false, null, 'required_fields');
        }

        const finalMoney = money !== undefined ? money : (quantity || 0) * (price || 0);

        const record = await DailyTreasury.create({
            station: req.stationId,
            date,
            quantity: quantity || 0,
            price: price || 0,
            money: finalMoney,
            statement
        });

        await logActivity(
            req.admin,
            'CREATE',
            'DailyTreasury',
            `اضافة بند (${statement}) في ملخص اليومية بتاريخ ${date}`,
            { date, quantity, price, money: finalMoney, statement }
        );

        const summary = await fetchSummary(date, req.stationId);
        sendResponse(res, 201, true, summary, 'add_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};


// @desc    Delete daily treasury entry
// @route   DELETE /api/daily-treasury/:id
export const deleteEntry = async (req: Request, res: Response) => {
    try {
        const record = await DailyTreasury.findOneAndDelete({ _id: req.params.id, station: req.stationId });
        if (!record) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            req.admin,
            'DELETE',
            'DailyTreasury',
            `حذف بند (${(record as any).statement}) من ملخص اليومية بتاريخ ${(record as any).date}`,
            { id: req.params.id }
        );

        const summary = await fetchSummary((record as any).date as string, req.stationId);
        sendResponse(res, 200, true, summary, 'delete_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};




