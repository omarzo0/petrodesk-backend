// ─────────────────────────────────────────────────────────────
//  Station Permissions — Tenant Panel
//  Roles: admin | manager | cashier | financial
//  Features: account, benzene, dailyTreasury, employee, 
//            expense, financial, init, log, oil, shiftDiary,
//            statement, stationStaff, supplyBook, support,
//            termClient, treasuryMovement, voucher
// ─────────────────────────────────────────────────────────────

export type StationRole = 'admin' | 'manager' | 'cashier' | 'financial';

export type StationModule =
    | 'account'
    | 'benzene'
    | 'dailyTreasury'
    | 'employee'
    | 'expense'
    | 'financial'
    | 'init'
    | 'log'
    | 'oil'
    | 'shiftDiary'
    | 'statement'
    | 'stationStaff'
    | 'supplyBook'
    | 'support'
    | 'termClient'
    | 'treasuryMovement'
    | 'voucher'
    | 'station';

export type StationAction =
    | 'create'
    | 'read'
    | 'update'
    | 'delete'
    | 'respond'   // support: reply to tickets
    | 'close';     // support: resolve tickets

export type StationPermissions = Record<
    StationRole,
    Partial<Record<StationModule, StationAction[]>>
>;

// ─────────────────────────────────────────────────────────────
//  Permission map
// ─────────────────────────────────────────────────────────────

export const stationPermissions: StationPermissions = {

    // ── ADMIN ─────────────────────────────────────────────────
    admin: {
        account: ['create', 'read', 'update', 'delete'],
        benzene: ['create', 'read', 'update', 'delete'],
        dailyTreasury: ['create', 'read', 'update', 'delete'],
        employee: ['create', 'read', 'update', 'delete'],
        expense: ['create', 'read', 'update', 'delete'],
        financial: ['create', 'read', 'update', 'delete'],
        init: ['create', 'read', 'update'],
        log: ['read', 'delete'],
        oil: ['create', 'read', 'update', 'delete'],
        shiftDiary: ['create', 'read', 'update', 'delete'],
        statement: ['create', 'read', 'update', 'delete'],
        stationStaff: ['create', 'read', 'update', 'delete'],
        supplyBook: ['create', 'read', 'update', 'delete'],
        support: ['create', 'read', 'update', 'delete', 'respond', 'close'],
        termClient: ['create', 'read', 'update', 'delete'],
        treasuryMovement: ['create', 'read', 'update', 'delete'],
        voucher: ['create', 'read', 'update', 'delete'],
        station: ['read', 'update'],
    },

    // ── MANAGER ───────────────────────────────────────────────
    manager: {
        account: ['create', 'read', 'update'],
        benzene: ['create', 'read', 'update'],
        dailyTreasury: ['read'],
        employee: ['create', 'read', 'update'],
        expense: ['create', 'read', 'update', 'delete'],
        financial: ['read'],
        log: ['read'],
        oil: ['create', 'read', 'update'],
        shiftDiary: ['create', 'read', 'update'],
        statement: ['read'],
        stationStaff: ['read'],
        supplyBook: ['create', 'read', 'update'],
        support: ['create', 'read', 'update'],
        termClient: ['create', 'read', 'update'],
        treasuryMovement: ['read'],
        voucher: ['create', 'read', 'update'],
    },

    // ── CASHIER ───────────────────────────────────────────────
    cashier: {
        account: ['read'],
        benzene: ['read'],
        dailyTreasury: ['create', 'read'],
        oil: ['read'],
        shiftDiary: ['create', 'read'],
        support: ['create', 'read', 'update'],
        termClient: ['read'],
        treasuryMovement: ['create', 'read'],
        voucher: ['create', 'read'],
    },

    // ── FINANCIAL ─────────────────────────────────────────────
    financial: {
        account: ['read'],
        dailyTreasury: ['create', 'read', 'update'],
        expense: ['create', 'read', 'update', 'delete'],
        financial: ['create', 'read', 'update'],
        log: ['read'],
        statement: ['create', 'read', 'update'],
        supplyBook: ['read'],
        support: ['read'],
        termClient: ['read'],
        treasuryMovement: ['create', 'read', 'update'],
    },
};

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

export const hasStationPermission = (
    role: StationRole,
    module: StationModule,
    action: StationAction
): boolean => {
    return stationPermissions[role]?.[module]?.includes(action) ?? false;
};
