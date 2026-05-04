
import { ENV } from './config';
import { initCache } from './cache';

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

import connectDB from './database/init';
import localize from './server/middleware/localize';
import sendResponse from './server/utils/responseHandler';

// Import Routes
import authRoutes from './server/api/station/auth';
import initRoutes from './server/api/station/init';
import benzeneRoutes from './server/api/station/benzene';
import oilRoutes from './server/api/station/oil';
import expenseRoutes from './server/api/station/expenses';
import voucherRoutes from './server/api/station/vouchers';
import matchingVoucherRoutes from './server/api/station/matchingVouchers';
import termClientRoutes from './server/api/station/termClients';
import dailyTreasuryRoutes from './server/api/station/dailyTreasury';
import supplyBookRoutes from './server/api/station/supplyBook';
import treasuryMovementRoutes from './server/api/station/treasuryMovement';
import statementRoutes from './server/api/station/statements';
import accountRoutes from './server/api/station/accounts';
import shiftDiaryRoutes from './server/api/station/shiftDiary';
import employeeRoutes from './server/api/station/employees';
import stationStaffRoutes from './server/api/station/stationStaff';
import logRoutes from './server/api/station/logs';
import financialRoutes from './server/api/station/financial';
import uploadRoutes from './server/api/station/upload';
import supportRoutes from './server/api/station/support';
import stationDataRoutes from './server/api/station/station';
import platformRoutes from './server/api/platform/platform';
import platformAuthRoutes from './server/api/platform/platformAuth';

// Middleware imports
import { auth } from './server/middleware/auth';
import { tenantGuard } from './server/middleware/tenantGuard';
import { subscriptionCheck } from './server/middleware/subscriptionCheck';




// Initialize System
const startServer = async () => {
    // Connect to MongoDB
    await connectDB();

    // Initialize Cache
    await initCache();

    const app = express();

    // Middleware
    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    app.use(morgan('dev'));
    app.use(localize);

    // Rate limiting for auth
    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 30, // limit each IP to 30 requests per windowMs
        message: {
            success: false,
            message: 'too_many_login_attempts_try_later'
        }
    });

    // Routes
    app.use('/api/auth/login', loginLimiter);
    app.use('/api/auth', authRoutes);

    // Platform routes (Super Admin only - check auth first)
    app.use('/api/platform/auth', platformAuthRoutes);
    app.use('/api/platform', platformRoutes);

    const tenantMiddleware = [auth, tenantGuard, subscriptionCheck] as any[];

    app.use('/api/init', tenantMiddleware, initRoutes);
    app.use('/api/benzene', tenantMiddleware, benzeneRoutes);
    app.use('/api/oils', tenantMiddleware, oilRoutes);
    app.use('/api/expenses', tenantMiddleware, expenseRoutes);
    app.use('/api/vouchers', tenantMiddleware, voucherRoutes);
    app.use('/api/matching-vouchers', tenantMiddleware, matchingVoucherRoutes);

    app.use('/api/term-clients', tenantMiddleware, termClientRoutes);
    app.use('/api/daily-treasury', tenantMiddleware, dailyTreasuryRoutes);
    app.use('/api/supply-book', tenantMiddleware, supplyBookRoutes);
    app.use('/api/treasury-movement', tenantMiddleware, treasuryMovementRoutes);
    app.use('/api/statements', tenantMiddleware, statementRoutes);
    app.use('/api/accounts', tenantMiddleware, accountRoutes);
    app.use('/api/shift-diary', tenantMiddleware, shiftDiaryRoutes);
    app.use('/api/employees', tenantMiddleware, employeeRoutes);
    app.use('/api/station-staff', tenantMiddleware, stationStaffRoutes);
    app.use('/api/logs', tenantMiddleware, logRoutes);
    app.use('/api/financial', tenantMiddleware, financialRoutes);
    app.use('/api/upload', tenantMiddleware, uploadRoutes);
    app.use('/api/support', tenantMiddleware, supportRoutes);
    app.use('/api/station', tenantMiddleware, stationDataRoutes);


    // Health check
    app.get('/api/health', (req: Request, res: Response) => {
        res.json({ status: 'ok', message: 'PetroDesk API is running' });
    });

    // Error handling middleware
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
        console.error(err.stack);
        sendResponse(res, 500, false, null, 'server_error');
    });

    const PORT = ENV.PORT;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} in ${ENV.NODE_ENV} mode`);
    });
};

startServer();