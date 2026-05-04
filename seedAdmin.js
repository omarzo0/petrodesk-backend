require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const connectDB = require('./config/db');

const seedSuperAdmin = async () => {
    try {
        await connectDB();

        const email = 'omarkhaled202080@gmail.com';
        const password = 'superpassword123';
        const firstName = 'omar';
        const lastName = 'khaled';
        const phoneNumber = '01002020455';
        const nationalId = '12345678901234';
        const role = 'super_admin';

        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            console.log('Super Admin already exists');
            process.exit(0);
        }

        await Admin.create({
            email,
            password,
            firstName,
            lastName,
            phoneNumber,
            nationalId,
            role
        });

        console.log('Super Admin created successfully!');
        console.log('Email:', email);
        console.log('Password:', password);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding Super Admin:', error.message);
        process.exit(1);
    }
};

seedSuperAdmin();
