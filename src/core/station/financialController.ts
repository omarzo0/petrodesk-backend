import { Request, Response } from 'express';
import Benzene from '../../database/models/station/Benzene';
import { OilShift } from '../../database/models/station/Oil';
import TreasuryMovement from '../../database/models/station/TreasuryMovement';
import Expense from '../../database/models/station/Expense';
import Employee from '../../database/models/station/Employee';
import TermClient from '../../database/models/station/TermClient';
import Voucher from '../../database/models/station/Voucher';
import Account from '../../database/models/station/Account';
import DailyTreasury from '../../database/models/station/DailyTreasury';
import FinancialSafe from '../../database/models/station/FinancialSafe';
import sendResponse from '../../server/utils/responseHandler';

/**
 * Helper to get opening balance for a date
 */
const getOpeningBalance = async (date: string, stationId: string): Promise<number> => {
    const prevSafe = await FinancialSafe.findOne({ station: stationId, date: { $lt: date } }).sort({ date: -1 });
    return prevSafe ? prevSafe.closingBalance : 0;
};


/**
 * @desc    Get comprehensive financial summary for a date (Big System)
 * @route   GET /api/financial/summary/:date
 */
export const getDailySummary = async (req: Request, res: Response) => {
    try {
        const date = req.params.date as string;

        // 1. Core Revenue (Fuel & Oil)
        const benzeneData = await Benzene.find({ station: req.stationId, date });
        const fuelRevenue = benzeneData.reduce((sum, item: any) => sum + (item.totalAmount || 0), 0);

        const oilData = await OilShift.find({ station: req.stationId, date });
        const oilRevenue = oilData.reduce((sum, item: any) => sum + item.total, 0);

        // 2. Treasury Movements
        const movements = await TreasuryMovement.find({ station: req.stationId, date });
        const receipts = movements
            .filter((m: any) => m.type === 'مقبوضات')
            .reduce((sum, m: any) => sum + m.money, 0);
        const payments = movements
            .filter((m: any) => m.type === 'مدفوعات')
            .reduce((sum, m: any) => sum + m.money, 0);

        // 3. Core Expenses
        const expenseData = await Expense.find({ station: req.stationId, date });
        const directExpenses = expenseData.reduce((sum, item: any) => sum + item.money, 0);

        // 4. Employee Salaries (Monthly liability shown as daily reference or total staff cost)
        const employees = await Employee.find({ station: req.stationId });
        const totalMonthlySalaries = employees.reduce((sum, e: any) => sum + e.salary, 0);

        // 5. Vouchers
        const voucherData = await Voucher.find({ station: req.stationId, date });
        const voucherTotal = voucherData.reduce((sum, v: any) => sum + v.total, 0);

        // 6. Term Clients
        const clientData = await TermClient.find({ station: req.stationId, date });
        const totalTermClients = clientData.reduce((sum, c: any) => sum + (c.money || 0), 0);


        // 7. Client/Bank Accounts
        const accountData = await Account.find({ station: req.stationId, date });
        const accountMovements = accountData.reduce((sum, a: any) => sum + a.money, 0);

        // 8. Daily Treasury (Island Cash)
        const islandData = await DailyTreasury.find({ station: req.stationId, date, statement: 'island' });

        const islandCash = islandData.reduce((sum, i: any) => sum + i.money, 0);

        // 9. Balance Carry-Forward
        const openingBalance = await getOpeningBalance(date, req.stationId);
        const totalIn = fuelRevenue + oilRevenue + receipts + (accountMovements > 0 ? accountMovements : 0) + islandCash;
        const totalOut = payments + directExpenses + voucherTotal + totalTermClients + (accountMovements < 0 ? Math.abs(accountMovements) : 0);

        const netChange = totalIn - totalOut;
        const closingBalance = openingBalance + netChange;

        // 10. Persist today's safe record for future carry-forwards
        await FinancialSafe.findOneAndUpdate(
            { station: req.stationId, date },
            { station: req.stationId, openingBalance, closingBalance, netCashFlow: netChange },
            { upsert: true, new: true }
        );

        // 11. Global Live Balance (Latest closing balance in absolute system time)
        const latestSafe = await FinancialSafe.findOne({ station: req.stationId }).sort({ date: -1 });
        const globalBalance = latestSafe ? latestSafe.closingBalance : closingBalance;

        const summary = {
            date,
            globalBalance,
            openingBalance,


            closingBalance,
            fuel: { revenue: fuelRevenue, count: benzeneData.length },
            oil: { revenue: oilRevenue, count: oilData.length },
            treasury: { receipts, payments },
            expenses: { total: directExpenses, count: expenseData.length },
            salaries: { monthlyLiability: totalMonthlySalaries, count: employees.length },
            vouchers: { total: voucherTotal, count: voucherData.length },
            clients: { total: totalTermClients },
            accounts: { netMovement: accountMovements },
            island: { totalCash: islandCash },
            overview: {
                totalIn,
                totalOut,
                netProfit: netChange
            }
        };


        sendResponse(res, 200, true, summary);
    } catch (error) {
        console.error('Big System Financial Summary Error:', error);
        sendResponse(res, 500, false, null, 'server_error');
    }
};

/**
 * @desc    Get comprehensive financial report for a date range (Big System)
 * @route   GET /api/financial/report
 */
export const getPeriodicReport = async (req: Request, res: Response) => {
    try {
        const { start, end } = req.query;
        if (!start || !end) {
            return sendResponse(res, 400, false, null, 'required_fields');
        }

        const filter = { station: req.stationId, date: { $gte: start as string, $lte: end as string } };


        const [benzene, oil, treasury, expenses, vouchers, clients, accounts, island, employeesList] = await Promise.all([
            Benzene.find(filter),
            OilShift.find(filter),
            TreasuryMovement.find(filter),
            Expense.find(filter),
            Voucher.find(filter),
            TermClient.find(filter),
            Account.find(filter),
            DailyTreasury.find({ ...filter, statement: 'island' }),
            Employee.find({ station: req.stationId })

        ]);


        const fuelRevenue = benzene.reduce((sum, item: any) => sum + (item.totalAmount || 0), 0);
        const oilRevenue = oil.reduce((sum, item: any) => sum + item.total, 0);
        const receipts = treasury.filter((m: any) => m.type === 'مقبوضات').reduce((sum, m: any) => sum + m.money, 0);
        const payments = treasury.filter((m: any) => m.type === 'مدفوعات').reduce((sum, m: any) => sum + m.money, 0);
        const totalExpenses = expenses.reduce((sum, item: any) => sum + item.money, 0);
        const totalVouchers = vouchers.reduce((sum, v: any) => sum + v.total, 0);
        const totalTermClients = clients.reduce((sum, c: any) => sum + (c.money || 0), 0);
        const accountMovements = accounts.reduce((sum, a: any) => sum + a.money, 0);
        const islandCash = island.reduce((sum, i: any) => sum + i.money, 0);

        const totalIn = fuelRevenue + oilRevenue + receipts + (accountMovements > 0 ? accountMovements : 0) + islandCash;
        const totalOut = payments + totalExpenses + totalVouchers + totalTermClients + (accountMovements < 0 ? Math.abs(accountMovements) : 0);


        const startOpening = await getOpeningBalance(start as string, req.stationId);
        const endSafe = await FinancialSafe.findOne({ station: req.stationId, date: { $lte: end as string } }).sort({ date: -1 });
        const endClosing = endSafe ? endSafe.closingBalance : (startOpening + totalIn - totalOut);


        const summary = {
            period: { start, end },
            openingBalance: startOpening,
            closingBalance: endClosing,
            fuelRevenue,
            oilRevenue,
            receipts,
            payments,
            expenses: totalExpenses,
            vouchers: totalVouchers,
            totalTermClients,
            accountMovements,
            islandCash,
            salaries: employeesList.reduce((sum: number, e: any) => sum + e.salary, 0),
            totalIn,
            totalOut,
            netProfit: totalIn - totalOut
        };




        sendResponse(res, 200, true, summary);
    } catch (error) {
        console.error('Big System Periodic Report Error:', error);
        sendResponse(res, 500, false, null, 'server_error');
    }
};
