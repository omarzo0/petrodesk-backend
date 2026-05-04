// ─────────────────────────────────────────────────────────────
//  Platform Permissions — Admin Panel
//  Roles: super_admin | admin | employee
//  Features: overview, payment, plan, staff, station,
//            stationUser, subscription, ticket, warning
// ─────────────────────────────────────────────────────────────

export type PlatformRole = 'super_admin' | 'admin' | 'employee';

export type PlatformModule =
    | 'overview'
    | 'payment'
    | 'plan'
    | 'staff'
    | 'station'
    | 'stationUser'
    | 'subscription'
    | 'ticket'
    | 'warning';

export type PlatformAction =
    | 'create'
    | 'read'
    | 'update'
    | 'delete'
    | 'respond'   // ticket: write a reply
    | 'close'     // ticket: mark resolved
    | 'assign'    // ticket: assign to a staff member
    | 'suspend'   // station: temporarily disable
    | 'refund'    // payment: issue a refund
    | 'override'; // subscription: manually change plan

export type PlatformPermissions = Record<
    PlatformRole,
    Partial<Record<PlatformModule, PlatformAction[]>>
>;

// ─────────────────────────────────────────────────────────────
//  Permission map
// ─────────────────────────────────────────────────────────────

export const platformPermissions: PlatformPermissions = {

    // ── SUPER ADMIN ───────────────────────────────────────────
    super_admin: {
        overview: ['read'],
        payment: ['read', 'refund'],
        plan: ['create', 'read', 'update', 'delete'],
        staff: ['create', 'read', 'update', 'delete'],
        station: ['create', 'read', 'update', 'delete', 'suspend'],
        stationUser: ['create', 'read', 'update', 'delete'],
        subscription: ['create', 'read', 'update', 'delete', 'override'],
        ticket: ['read', 'respond', 'assign', 'close', 'delete'],
        warning: ['create', 'read', 'update', 'delete'],
    },

    // ── ADMIN ─────────────────────────────────────────────────
    admin: {
        overview: ['read'],
        payment: ['read'],
        plan: ['read'],
        staff: [],
        station: ['create', 'read', 'update', 'suspend'],
        stationUser: ['create', 'read', 'update'],
        subscription: ['read'],
        ticket: ['read', 'respond', 'assign', 'close'],
        warning: ['create', 'read', 'update'],
    },

    // ── EMPLOYEE ──────────────────────────────────────────────
    employee: {
        overview: ['read'],
        payment: [],
        plan: [],
        staff: [],
        station: ['read'],
        stationUser: ['read'],
        subscription: [],
        ticket: ['read', 'respond'],
        warning: ['read'],
    },
};

// ─────────────────────────────────────────────────────────────
//  Helper — check a single permission at runtime
// ─────────────────────────────────────────────────────────────

export const hasPermission = (
    role: PlatformRole,
    module: PlatformModule,
    action: PlatformAction
): boolean => {
    return platformPermissions[role]?.[module]?.includes(action) ?? false;
};

// ─────────────────────────────────────────────────────────────
//  Helper — get all allowed actions for a role on a module
// ─────────────────────────────────────────────────────────────

export const getAllowed = (
    role: PlatformRole,
    module: PlatformModule
): PlatformAction[] => {
    return platformPermissions[role]?.[module] ?? [];
};
