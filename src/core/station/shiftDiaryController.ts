import { Request, Response } from 'express';
import ShiftDiary from '../../database/models/station/ShiftDiary';
import EntryAdjustment from '../../database/models/station/EntryAdjustment';
import TreasuryMovement from '../../database/models/station/TreasuryMovement';
import Statement from '../../database/models/station/Statement';
import Benzene from '../../database/models/station/Benzene';
import Expense from '../../database/models/station/Expense';
import Account from '../../database/models/station/Account';
import Voucher from '../../database/models/station/Voucher';
import TermClient from '../../database/models/station/TermClient';
import SupplyBook from '../../database/models/station/SupplyBook';

import sendResponse from '../../server/utils/responseHandler';

import { logActivity } from '../../server/utils/logger';

const STATEMENT_MAP: { [key: string]: string } = {
    'مبيعات نقدية': 'cashSales',
    'مصروفات': 'expenses',
    'موردين': 'suppliers',
    'توريد بنك': 'bankDeposit',
    'ح/العملاء': 'clientAccounts',
    'المحاسب': 'accountantAccount',
    'الحج سيد': 'hajSayedAccount',
    'مصروفات (عامة)': 'generalExpenses',
    'كوبونات': 'vouchers',
    'عملاء آجل': 'deferredClients',
    'omar': 'omar'
};

const mapStatement = (name: string): string => {
    // Check direct mapping
    if (STATEMENT_MAP[name]) return STATEMENT_MAP[name];

    // Check for "ح/ المحاسب" or "ح/ الحج سيد"
    if (name.includes('المحاسب')) return 'accountantAccount';
    if (name.includes('الحج سيد')) return 'hajSayedAccount';

    // Default to camelCase or original if no mapping
    return name;
};

// @desc    Get shift diary for a date (entry number + all statement entries)
// @route   GET /api/shift-diary/:date
export const getByDate = async (req: Request, res: Response) => {
    try {
        const date = String(req.params.date || '').trim();
        const shiftDiary: any = await ShiftDiary.findOne({ station: req.stationId, date });

        // Removed strict 404 check to allow viewing data even if day isn't initialized
        const shiftNumber = shiftDiary ? String(shiftDiary.number) : 'N/A';

        const statements = await Statement.find({ station: req.stationId });

        // Build receipts entries
        const receipts: any[] = [];
        for (const stmt of statements) {
            const movements = await TreasuryMovement.find({ station: req.stationId, date, type: 'مقبوضات', statement: (stmt as any).name });
            const adjustment: any = await EntryAdjustment.findOne({ station: req.stationId, date, type: 'مقبوضات', statement: (stmt as any).name });

            const total = movements.reduce((sum, m: any) => sum + m.money, 0);
            const transfer = adjustment ? (adjustment.transfer ?? 0) : 0;
            const priceDiff = adjustment ? (adjustment.priceDiff ?? 0) : 0;

            // Only include if there is actual data
            if (movements.length > 0 || transfer !== 0 || priceDiff !== 0) {
                receipts.push({
                    statement: mapStatement((stmt as any).name),
                    entries: movements.map((m: any) => ({ receiptName: m.receiptName, money: m.money })),
                    total,
                    transfer,
                    priceDiff,
                });
            }
        }

        // Build payments entries
        const payments: any[] = [];
        for (const stmt of statements) {
            const movements = await TreasuryMovement.find({ station: req.stationId, date, type: 'مدفوعات', statement: (stmt as any).name });
            const adjustment: any = await EntryAdjustment.findOne({ station: req.stationId, date, type: 'مدفوعات', statement: (stmt as any).name });

            const total = movements.reduce((sum, m: any) => sum + m.money, 0);
            const transfer = adjustment ? (adjustment.transfer ?? 0) : 0;
            const priceDiff = adjustment ? (adjustment.priceDiff ?? 0) : 0;

            // Only include if there is actual data
            if (movements.length > 0 || transfer !== 0 || priceDiff !== 0) {
                payments.push({
                    statement: mapStatement((stmt as any).name),
                    entries: movements.map((m: any) => ({ receiptName: m.receiptName, money: m.money })),
                    total,
                    transfer,
                    priceDiff,
                });
            }
        }

        // Fetch benzene pump readings
        const benzeneDocs = await Benzene.find({ station: req.stationId, date });
        const benzene = benzeneDocs.map((b: any) => ({
            trumbaNumber: b.pumpNumber,
            trumbaType: b.pumpType,
            start: b.start,
            end: b.end,
            total: b.liters // 'total' in frontend equals 'liters' in backend
        }));

        // Fetch expenses, vouchers, termClients for inclusion in payments
        const expensesDocs = await Expense.find({ station: req.stationId, date });
        const vouchersDocs = await Voucher.find({ station: req.stationId, date });
        const termClientsDocs = await TermClient.find({ station: req.stationId, date });

        // Add Expenses to payments if they exist
        if (expensesDocs.length > 0) {
            payments.push({
                statement: 'generalExpenses',
                entries: expensesDocs.map((e: any) => ({ receiptName: e.receiptName, money: e.money })),
                total: expensesDocs.reduce((sum, e) => sum + e.money, 0),
                transfer: 0,
                priceDiff: 0
            });
        }


        // Add Vouchers to payments if they exist
        if (vouchersDocs.length > 0) {
            payments.push({
                statement: 'vouchers',
                entries: vouchersDocs.map((v: any) => ({ receiptName: v.serialNumber || v.receiptName, money: v.total })),
                total: vouchersDocs.reduce((sum, v) => sum + (v.total || 0), 0),
                transfer: 0,
                priceDiff: 0
            });
        }


        // Add Term Clients to payments if they exist
        if (termClientsDocs.length > 0) {
            payments.push({
                statement: 'deferredClients',
                entries: termClientsDocs.map((t: any) => ({ receiptName: t.clientName || 'client', money: t.money })),
                total: termClientsDocs.reduce((sum, t) => sum + (t.money || 0), 0),
                transfer: 0,
                priceDiff: 0
            });
        }



        // Fetch and categorize Account records (Special vs General)
        const accountRecords = await Account.find({ station: req.stationId, date });
        if (accountRecords.length > 0) {
            // Check for legacy special names
            const specialAccountNames = ['المحاسب', 'الحج سيد'];

            for (const name of specialAccountNames) {
                const specificRecords = accountRecords.filter(a => a.name === name);
                if (specificRecords.length > 0) {
                    receipts.push({
                        statement: mapStatement(name),
                        entries: specificRecords.map((a: any) => ({ receiptName: a.receiptName, money: a.money })),
                        total: specificRecords.reduce((sum, a) => sum + a.money, 0),
                        transfer: 0,
                        priceDiff: 0
                    });
                }

            }

            // General accounts (those not in special names)
            const generalAccounts = accountRecords.filter(a => !specialAccountNames.includes(a.name));
            if (generalAccounts.length > 0) {
                receipts.push({
                    statement: 'clientAccounts',
                    entries: generalAccounts.map((a: any) => ({ receiptName: `${a.name} - ${a.receiptName}`, money: a.money })),
                    total: generalAccounts.reduce((sum, a: any) => sum + a.money, 0),
                    transfer: 0,
                    priceDiff: 0
                });
            }

        }


        // Fetch supply book data
        const supplyBook = await SupplyBook.find({ station: req.stationId, date });

        sendResponse(res, 200, true, {
            number: shiftNumber,
            date,
            mkbodat: receipts, // Sync with frontend key
            mdfo3at: payments, // Sync with frontend key
            benzene,
            expenses: expensesDocs,
            supplyBook
        });



    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Update transfer and priceDiff for a shift diary entry
// @route   PUT /api/shift-diary/entry-adjustment
export const updateEntryAdjustment = async (req: Request, res: Response) => {
    try {
        const { date, type, statement, transfer, priceDiff } = req.body;
        const record = await EntryAdjustment.findOneAndUpdate(
            { station: req.stationId, date, type, statement },
            { station: req.stationId, transfer, priceDiff },
            { new: true, upsert: true }
        );
        if (!record) {
            return sendResponse(res, 404, false, null, 'item_not_found');
        }

        await logActivity(
            req.admin,
            'UPDATE',
            'ShiftDiary',
            `تعديل نقل/فرق كيد لـ ${statement} (${type}) بتاريخ ${date}`,
            { date, type, statement, transfer, priceDiff }
        );

        sendResponse(res, 200, true, record, 'update_success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};

// @desc    Create or update shift diary entry (date + entry number)
// @route   PUT /api/shift-diary
export const upsertShiftDiary = async (req: Request, res: Response) => {
    try {
        const { date, number } = req.body;
        const record = await ShiftDiary.findOneAndUpdate(
            { station: req.stationId, date },
            { station: req.stationId, number },
            { new: true, upsert: true }
        );

        await logActivity(
            req.admin,
            record ? 'UPDATE' : 'CREATE',
            'ShiftDiary',
            `تهيئة دفتر الوردية بتاريخ ${date} برقم كيد ${number}`,
            { date, number }
        );

        sendResponse(res, 200, true, record, 'success');
    } catch (error) {
        sendResponse(res, 500, false, null, 'server_error');
    }
};
