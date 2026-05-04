const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

const normalize = (val) => {
    if (!val) return val;
    let v = val.toLowerCase();
    if (v.includes('solar') || v.includes('سولار')) return 'solar';
    if (v.includes('80')) return 'ben80';
    if (v.includes('92')) return 'ben92';
    if (v.includes('95')) return 'ben95';
    return v;
};

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);

        const collections = [
            { name: 'benzenes', field: 'pumpType' },
            { name: 'supplybooks', field: 'benzType' },
            { name: 'vouchers', field: 'pumpType' },
            { name: 'matchingvouchers', field: 'pumpType' }
        ];

        for (const colDef of collections) {
            const col = mongoose.connection.db.collection(colDef.name);
            const records = await col.find({}).toArray();
            console.log(`Checking ${records.length} records in ${colDef.name}...`);

            let count = 0;
            for (const doc of records) {
                const oldVal = doc[colDef.field];
                const newVal = normalize(oldVal);

                if (newVal !== oldVal) {
                    await col.updateOne({ _id: doc._id }, { $set: { [colDef.field]: newVal } });
                    count++;
                }
            }
            console.log(`Updated ${count} records in ${colDef.name}.`);
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
