import { Request } from 'express';

declare global {
    namespace Express {
        interface Request {
            /**
             * The authenticated user (PlatformUser or StationUser)
             */
            admin?: {
                id: string;
                email: string;
                role: string;
                language: string;
                userType: 'platform' | 'station';
                station?: string;
                isSuperAdmin?: boolean;
            };
            lang?: string;
            stationId?: any;
            subscription?: any;
        }
    }
}
