/**
 * Migration Script: Single-Tenant → Multi-Tenant
 * 
 * This script:
 * 1. Creates a default "Station" for existing data
 * 2. Creates a 14-day trial subscription for it
 * 3. Assigns all existing Admins to this station
 * 4. Adds `station` field to all existing documents across 16 collections
 * 5. Marks the first admin as station owner
 * 
 * Run with: npx ts-node scripts/migrateToMultiTenant.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { ENV } from '../src/config';

// Import all models
import Station from '../src/database/models/platform/Station';
import Subscription from '../src/database/models/platform/Subscription';
import StationUser from '../src/database/models/station/StationUser';

// Tenant-scoped collections to migrate
const COLLECTIONS = [
    'benzenes',
    'benzeneprices',
    'oilshifts',
    'oilstorages',
    'expenses',
    'vouchers',
    'matchingvouchers',
    'termclients',
    'treasurymovements',
    'dailytreasuries',
    'supplybooks',
    'statements',
    'accounts',
    'shiftdiary',
    'na2lfr2keds',
    'financialsafes',
    'employees',
    'activitylogs',
];

async function migrate() {
    console.log('🚀 Starting Multi-Tenant Migration...\n');

    await mongoose.connect(ENV.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Create default station
    let station = await Station.findOne({ code: 'DEFAULT-001' });
    if (!station) {
        station = await Station.create({
            name: 'PetroDesk Station',
            nameAr: 'محطة بتروديسك',
            code: 'DEFAULT-001',
            address: 'Default Station',
            phone: '',
            isActive: true,
        });
        console.log(`✅ Created default station: ${station.name} (${station.code})`);
    } else {
        console.log(`⏭️  Default station already exists: ${station.code}`);
    }

    // Step 2: Create trial subscription
    let subscription = await Subscription.findOne({ station: station._id });
    if (!subscription) {
        const now = new Date();
        subscription = await Subscription.create({
            station: station._id,
            status: 'trial',
            trialStart: now,
            trialEnd: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        });
        console.log('✅ Created trial subscription (14 days)');
    } else {
        console.log('⏭️  Subscription already exists');
    }

    // Step 3: Assign all existing admins to the station
    const adminsResult = await StationUser.updateMany(
        { station: { $exists: false } },
        { $set: { station: station._id, isSuperAdmin: false } }
    );
    console.log(`✅ Assigned ${adminsResult.modifiedCount} admins to default station`);

    // Make the first admin the station owner if no owner set
    if (!station.owner) {
        const firstAdmin = await StationUser.findOne({ station: station._id });
        if (firstAdmin) {
            station.owner = firstAdmin._id as any;
            await station.save();
            console.log(`✅ Set ${firstAdmin.email} as station owner`);
        }
    }

    // Step 4: Add stationId to all existing documents
    const db = mongoose.connection.db;
    if (!db) {
        console.error('❌ Database connection not available');
        process.exit(1);
    }

    for (const collectionName of COLLECTIONS) {
        try {
            const collection = db.collection(collectionName);
            const result = await collection.updateMany(
                { station: { $exists: false } },
                { $set: { station: station._id } }
            );
            if (result.modifiedCount > 0) {
                console.log(`✅ ${collectionName}: Added station to ${result.modifiedCount} documents`);
            } else {
                console.log(`⏭️  ${collectionName}: No documents to migrate`);
            }
        } catch (err) {
            console.log(`⚠️  ${collectionName}: Collection may not exist yet, skipping`);
        }
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log(`\n📌 Default Station ID: ${station._id}`);
    console.log('📌 Next steps:');
    console.log('   1. Create a Super Admin: set isSuperAdmin=true on an admin document');
    console.log('   2. Start creating new stations via /api/platform/stations');

    await mongoose.disconnect();
    process.exit(0);
}

migrate().catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
