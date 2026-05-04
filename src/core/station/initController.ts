import { Request, Response } from 'express';
import { BenzenePrice } from '../../database/models/station/Benzene';
import Benzene from '../../database/models/station/Benzene';
import SupplyBook from '../../database/models/station/SupplyBook';
import DailyTreasury from '../../database/models/station/DailyTreasury';
import Oil, { OilStorage, OilShift } from '../../database/models/station/Oil';
import ShiftDiary from '../../database/models/station/ShiftDiary';
import EntryAdjustment from '../../database/models/station/EntryAdjustment';
import Statement from '../../database/models/station/Statement';
import sendResponse from '../../server/utils/responseHandler';
import { logActivity } from '../../server/utils/logger';

// Helper: get previous date string
function getPreviousDate(dateStr: string): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}

// @desc    Initialize all daily records for a given date (mirrors Python start() method)
// @route   POST /api/init/:date
export const initializeDay = async (req: Request, res: Response) => {
    try {
        const { date } = req.params as any;
        const previousDate = getPreviousDate(date);

        // ============ Benzene Prices ============
        const existingPrice = await BenzenePrice.findOne({ station: req.stationId, date });
        if (!existingPrice) {
            const prevPrice: any = await BenzenePrice.findOne({ station: req.stationId, date: previousDate });
            if (prevPrice) {
                await BenzenePrice.create({
                    station: req.stationId,
                    date,
                    solarPrice: prevPrice.solarPrice,
                    ben80Price: prevPrice.ben80Price,
                    ben92Price: prevPrice.ben92Price,
                    ben95Price: prevPrice.ben95Price,
                });
            } else {
                await BenzenePrice.create({ station: req.stationId, date, solarPrice: 0, ben80Price: 0, ben92Price: 0, ben95Price: 0 });
            }
        }

        // ============ Benzene (fuel pumps) ============
        const existingBenzene = await Benzene.findOne({ station: req.stationId, date });
        if (!existingBenzene) {
            const pumps = [
                { type: 'solar', count: 6 },
                { type: 'ben80', count: 1 },
                { type: 'ben92', count: 2 },
                { type: 'ben95', count: 2 },
            ];

            // Get previous day's pumps to carry over 'end' to 'start'
            const prevPumps = await Benzene.find({ station: req.stationId, date: previousDate });

            const benzeneRecords = [];
            for (const pump of pumps) {
                for (let i = 1; i <= pump.count; i++) {
                    const prevP = prevPumps.find(p => (p as any).pumpNumber === i && (p as any).pumpType === pump.type);
                    benzeneRecords.push({
                        station: req.stationId,
                        date,
                        pumpNumber: i,
                        pumpType: pump.type,
                        start: prevP ? (prevP as any).end : 0,
                        end: prevP ? (prevP as any).end : 0,
                        liters: 0,
                    });
                }
            }
            await Benzene.insertMany(benzeneRecords);
        }

        // ============ Daily Treasury ============
        const existingTreasury = await DailyTreasury.findOne({ station: req.stationId, date });
        if (!existingTreasury) {
            await DailyTreasury.insertMany([
                { station: req.stationId, date, quantity: 0, price: 0, money: 0, statement: 'island' },
                { station: req.stationId, date, quantity: 0, price: 0, money: 0, statement: 'fromShift' },
            ]);
        }

        // ============ Supply Book ============
        const existingSupplyBook = await SupplyBook.findOne({ station: req.stationId, date });
        if (!existingSupplyBook) {
            const benzTypes = ['solar', 'ben80', 'ben92', 'ben95'];
            const prevSupply = await SupplyBook.find({ station: req.stationId, date: previousDate });

            const supplyRecords = benzTypes.map((benzType) => {
                const prev = prevSupply.find(s => (s as any).benzType === benzType);
                return {
                    station: req.stationId,
                    date,
                    benzType,
                    start: prev ? (prev as any).end : 0,
                    incoming: 0,
                    dispensed: 0,
                    pumps: '',
                    end: prev ? (prev as any).end : 0,
                    standard: 0,
                };
            });
            await SupplyBook.insertMany(supplyRecords);
        }

        // ============ Oils ============
        const existingOilStorage = await OilStorage.findOne({ station: req.stationId, date });
        if (!existingOilStorage) {
            const oils = await Oil.find({ station: req.stationId });
            const oilStorageRecords = [];
            const oilShiftRecords = [];

            const prevStorage = await OilStorage.find({ station: req.stationId, date: previousDate });
            const prevShift = await OilShift.find({ station: req.stationId, date: previousDate });

            for (const oil of oils) {
                const prevS = prevStorage.find((s: any) => s.oilName === (oil as any).oilName);
                const prevSh = prevShift.find((s: any) => s.oilName === (oil as any).oilName);

                oilStorageRecords.push({
                    station: req.stationId,
                    date,
                    oilName: (oil as any).oilName,
                    startBalance: prevS ? prevS.endBalance : 0,
                    endBalance: prevS ? prevS.endBalance : 0,
                    storageIncoming: 0,
                });
                oilShiftRecords.push({
                    station: req.stationId,
                    date,
                    oilName: (oil as any).oilName,
                    firstTermBalance: prevSh ? prevSh.endTermBalance : 0,
                    endTermBalance: prevSh ? prevSh.endTermBalance : 0,
                    incoming: 0,
                    sold: 0,
                    price: (oil as any).price,
                    total: 0,
                });
            }
            if (oilStorageRecords.length > 0) {
                await OilStorage.insertMany(oilStorageRecords);
                await OilShift.insertMany(oilShiftRecords);
            }
        }

        // ============ Shift Diary (ked) ============
        const existingKed = await ShiftDiary.findOne({ station: req.stationId, date });
        if (!existingKed) {
            const [year, month, day] = date.split('-');
            const isFirstDayOfYear = parseInt(day) === 1 && parseInt(month) === 1;

            if (isFirstDayOfYear) {
                await ShiftDiary.create({ station: req.stationId, date, number: 2 });
            } else {
                const prevKed: any = await ShiftDiary.findOne({ station: req.stationId, date: previousDate });
                if (prevKed) {
                    await ShiftDiary.create({ station: req.stationId, date, number: prevKed.number + 1 });
                } else {
                    await ShiftDiary.create({ station: req.stationId, date, number: 2 });
                }
            }
        }

        // ============ Entry Adjustments ============
        const existingAdjustment = await EntryAdjustment.findOne({ station: req.stationId, date });
        if (!existingAdjustment) {
            const statements = await Statement.find({ station: req.stationId });
            const adjustmentRecords = [];
            for (const stmt of statements) {
                adjustmentRecords.push({ station: req.stationId, date, type: 'مقبوضات', statement: (stmt as any).name, transfer: 0, priceDiff: 0 });
                adjustmentRecords.push({ station: req.stationId, date, type: 'مدفوعات', statement: (stmt as any).name, transfer: 0, priceDiff: 0 });
            }
            if (adjustmentRecords.length > 0) {
                await EntryAdjustment.insertMany(adjustmentRecords);
            }
        }

        await logActivity(
            req.admin,
            'OTHER',
            'System',
            `بدء يوم جديد بتاريخ ${date}`,
            { date }
        );

        sendResponse(res, 200, true, { date }, 'init_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
