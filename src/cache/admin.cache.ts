// Simple in-memory cache for admin sessions or frequently used data
const adminCache = new Map<string, any>();

export const AdminCache = {
    set: (key: string, value: any) => adminCache.set(key, value),
    get: (key: string) => adminCache.get(key),
    delete: (key: string) => adminCache.delete(key),
    clear: () => adminCache.clear()
};
