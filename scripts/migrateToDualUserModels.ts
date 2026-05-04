/**
 * Migration Script: Split Admins → PlatformUser + StationUser
 * 
 * This script:
 * 1. Reads all users from the legacy 'admins' collection
 * 2. Migrates true Super Admins to 'platformusers'
 * 3. Migrates regular Station Admins/Staff to 'stationusers'
 * 
 * Run with: npx ts-node scripts/migrateToDualUserModels.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { ENV } from '../src/config';

async function migrate() {
    console.log('🚀 Starting User Model Split Migration...\n');

    await mongoose.connect(ENV.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    if (!db) {
        console.error('❌ Database connection not available');
        process.exit(1);
    }

    const legacyAdmins = await db.collection('admins').find({}).toArray();
    console.log(`📊 Found ${legacyAdmins.length} legacy admins to migrate.`);

    let platformCount = 0;
    let stationCount = 0;

    for (const admin of legacyAdmins) {
        const isSuper = admin.isSuperAdmin === true;

        // Prepare base document
        const baseUser = {
            ...admin,
            // Remove legacy fields that might not fit new schema exactly if needed
            // But for now we keep most as they are shared
        };
        delete (baseUser as any).isSuperAdmin; // Remove the flag as it's now collection-based

        if (isSuper) {
            // Platform User roles are super_admin, admin, employee
            // Map legacy role to platform role
            if (!['super_admin', 'admin', 'employee'].includes(admin.role)) {
                baseUser.role = 'super_admin';
            }

            await db.collection('platformusers').updateOne(
                { email: admin.email },
                { $set: baseUser },
                { upsert: true }
            );
            platformCount++;
        } else {
            // Station User roles are admin, manager, cashier, financial
            // Ensure station is present
            if (!admin.station) {
                console.warn(`⚠️  User ${admin.email} has no station! Skipping...`);
                continue;
            }

            await db.collection('stationusers').updateOne(
                { email: admin.email },
                { $set: baseUser },
                { upsert: true }
            );
            stationCount++;
        }
    }

    console.log('\n--- Migration Results ---');
    console.log(`✅ Platform Users created: ${platformCount}`);
    console.log(`✅ Station Users created: ${stationCount}`);
    console.log('\n🎉 Migration completed successfully!');
    console.log('⚠️  Note: The legacy "admins" collection is still preserved. Deletion is recommended only after verification.');

    await mongoose.disconnect();
    process.exit(0);
}

migrate().catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
