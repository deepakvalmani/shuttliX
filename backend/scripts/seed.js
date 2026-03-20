require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const Organization = require('../models/Organization');
const User = require('../models/User');
const Shuttle = require('../models/Shuttle');
const { Route, Stop } = require('../models/Route');

const MONGODB_URI = process.env.MONGODB_URI;

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      Organization.deleteMany({}),
      User.deleteMany({}),
      Shuttle.deleteMany({}),
      Route.deleteMany({}),
      Stop.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // Create organisation
    const org = await Organization.create({
      name: 'Institute of Business Administration',
      shortName: 'IBA',
      code: crypto.randomBytes(3).toString('hex').toUpperCase(),
      contactEmail: 'transport@iba.edu.pk',
      address: 'University Road, Karachi',
      timezone: 'Asia/Karachi',
      mapCenter: { lat: 24.9056, lng: 67.0822 },
      defaultMapZoom: 15,
      isActive: true,
      plan: 'pilot',
    });
    console.log(`✅ Organisation created: ${org.name} (${org._id})`);

    const salt = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

    // Create users
    const [admin, driver1, driver2, student1, student2] = await Promise.all([
      User.create({ name: 'Transport Admin', email: 'admin@iba.edu.pk', password: 'Admin@1234', role: 'admin', organizationId: org._id, isVerified: true }),
      User.create({ name: 'Ahmed Khan', email: 'driver1@iba.edu.pk', password: 'Driver@1234', role: 'driver', organizationId: org._id, isVerified: true, licenseNumber: 'KHI-12345' }),
      User.create({ name: 'Bilal Malik', email: 'driver2@iba.edu.pk', password: 'Driver@1234', role: 'driver', organizationId: org._id, isVerified: true, licenseNumber: 'KHI-67890' }),
      User.create({ name: 'Sara Ahmed', email: 'student1@iba.edu.pk', password: 'Student@1234', role: 'student', organizationId: org._id, isVerified: true, studentId: 'IBA-001' }),
      User.create({ name: 'Ali Raza', email: 'student2@iba.edu.pk', password: 'Student@1234', role: 'student', organizationId: org._id, isVerified: true, studentId: 'IBA-002' }),
    ]);
    console.log('✅ Users created (admin, 2 drivers, 2 students)');

    // Create stops around IBA Karachi campus
    const stopData = [
      { name: 'Main Gate', lat: 24.9070, lng: 67.0800 },
      { name: 'Library Block', lat: 24.9058, lng: 67.0815 },
      { name: 'CS Department', lat: 24.9045, lng: 67.0832 },
      { name: 'Sports Complex', lat: 24.9035, lng: 67.0848 },
      { name: 'Hostel Block A', lat: 24.9062, lng: 67.0858 },
      { name: 'Admin Block', lat: 24.9078, lng: 67.0843 },
      { name: 'Canteen', lat: 24.9052, lng: 67.0825 },
      { name: 'City Bus Stop', lat: 24.9090, lng: 67.0785 },
    ];

    const stops = await Stop.insertMany(
      stopData.map(s => ({
        organizationId: org._id,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        location: { type: 'Point', coordinates: [s.lng, s.lat] },
        isActive: true,
      }))
    );
    console.log(`✅ Stops created (${stops.length})`);

    // Create shuttles
    const [shuttle1, shuttle2, shuttle3] = await Promise.all([
      Shuttle.create({
        organizationId: org._id,
        name: 'Shuttle A',
        shortCode: 'A',
        plateNumber: 'KHI-1234',
        capacity: 30,
        make: 'Toyota',
        model: 'Hiace',
        year: 2022,
        color: 'White',
        status: 'idle',
        currentDriverId: driver1._id,
      }),
      Shuttle.create({
        organizationId: org._id,
        name: 'Shuttle B',
        shortCode: 'B',
        plateNumber: 'KHI-5678',
        capacity: 25,
        make: 'Toyota',
        model: 'Coaster',
        year: 2021,
        color: 'White',
        status: 'idle',
        currentDriverId: driver2._id,
      }),
      Shuttle.create({
        organizationId: org._id,
        name: 'Shuttle C',
        shortCode: 'C',
        plateNumber: 'KHI-9012',
        capacity: 35,
        make: 'Hino',
        model: 'Minibus',
        year: 2020,
        color: 'White',
        status: 'idle',
      }),
    ]);
    console.log('✅ Shuttles created (3)');

    // Create routes
    const routeA = await Route.create({
      organizationId: org._id,
      name: 'Main Campus Loop',
      shortCode: 'A',
      color: '#1A56DB',
      isCircular: true,
      isActive: true,
      stops: [
        { stopId: stops[0]._id, order: 1, estimatedMinutesFromStart: 0 },
        { stopId: stops[1]._id, order: 2, estimatedMinutesFromStart: 3 },
        { stopId: stops[2]._id, order: 3, estimatedMinutesFromStart: 6 },
        { stopId: stops[6]._id, order: 4, estimatedMinutesFromStart: 9 },
        { stopId: stops[5]._id, order: 5, estimatedMinutesFromStart: 12 },
        { stopId: stops[0]._id, order: 6, estimatedMinutesFromStart: 15 },
      ],
      schedule: [{
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        startTime: '08:00',
        endTime: '20:00',
        frequency: 20,
      }],
    });

    const routeB = await Route.create({
      organizationId: org._id,
      name: 'Hostel Express',
      shortCode: 'B',
      color: '#D97706',
      isCircular: false,
      isActive: true,
      stops: [
        { stopId: stops[7]._id, order: 1, estimatedMinutesFromStart: 0 },
        { stopId: stops[0]._id, order: 2, estimatedMinutesFromStart: 5 },
        { stopId: stops[4]._id, order: 3, estimatedMinutesFromStart: 10 },
        { stopId: stops[3]._id, order: 4, estimatedMinutesFromStart: 15 },
      ],
      schedule: [{
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        startTime: '07:00',
        endTime: '22:00',
        frequency: 30,
      }],
    });

    // Assign routes to drivers and shuttles
    await Promise.all([
      User.findByIdAndUpdate(driver1._id, { assignedShuttleId: shuttle1._id, assignedRouteId: routeA._id }),
      User.findByIdAndUpdate(driver2._id, { assignedShuttleId: shuttle2._id, assignedRouteId: routeB._id }),
      Shuttle.findByIdAndUpdate(shuttle1._id, { assignedRouteId: routeA._id }),
      Shuttle.findByIdAndUpdate(shuttle2._id, { assignedRouteId: routeB._id }),
    ]);

    console.log('✅ Routes created (Main Campus Loop, Hostel Express)');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Seed complete! Login credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\nOrganisation ID : ${org._id}`);
    console.log(`Organisation Code: ${org.code}  ← KEEP THIS SECRET\n`);
    console.log(`Admin   : admin@iba.edu.pk    / Admin@1234   (needs org code: ${org.code})`);
    console.log(`Driver1 : driver1@iba.edu.pk  / Driver@1234`);
    console.log(`Driver2 : driver2@iba.edu.pk  / Driver@1234`);
    console.log(`Student : student1@iba.edu.pk / Student@1234`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
