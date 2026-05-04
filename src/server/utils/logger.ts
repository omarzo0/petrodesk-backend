import ActivityLog from '../../database/models/shared/ActivityLog';

/**
 * Utility to log user activities for auditing
 */
export const logActivity = async (
    admin: { email: string; name?: string; role?: string; station?: any } | undefined,
    type: 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'OTHER',
    category: string,
    move: string,
    details?: any,
    stationId?: any
) => {
    try {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0];

        // Ensure stationId is captured
        const finalStationId = stationId || admin?.station;

        await ActivityLog.create({
            station: finalStationId,
            date,
            time,
            email: admin?.email || 'System',
            adminName: admin?.name || 'System',
            role: admin?.role || 'System',
            type,

            category,
            move,
            details
        });
    } catch (error) {
        // We don't want to crash the main flow if logging fails, but we should log it to console
        console.error('Logging Activity Failed:', error);
    }
};
