require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const User         = require('../models/User');
const Organization = require('../models/Organization');
const { Shuttle, Trip, Rating } = require('../models/index');
const { Stop, Route } = require('../models/Route');

const seed = async () => {
  await connectDB();
  console.log('\n🌱 Seeding ShutliX v2 database...\n');

//   // ── Clean existing seed data ────────────────────────────
//   const existingOrg = await Organization.findOne({ code: 'IBA001' });
//   if (existingOrg) {
//     console.log('⚠️  Seed data already exists. Dropping and re-seeding...');
//     await User.deleteMany({ organizationId: existingOrg._id });
//     await Stop.deleteMany({ organizationId: existingOrg._id });
//     await Route.deleteMany({ organizationId: existingOrg._id });
//     await Shuttle.deleteMany({ organizationId: existingOrg._id });
//     await Trip.deleteMany({ organizationId: existingOrg._id });
//     await Organization.findByIdAndDelete(existingOrg._id);
//   }


// ── Clean existing seed data ────────────────────────────
const existingOrg = await Organization.findOne({ code: 'IBA001' });

if (existingOrg) {
  console.log('⚠️  Seed data already exists. Dropping and re-seeding...');

  // Delete EVERYTHING related (safe reset)
  await Promise.all([
    User.deleteMany({}),
    Stop.deleteMany({}),
    Route.deleteMany({}),
    Shuttle.deleteMany({}),
    Trip.deleteMany({}),
    Rating.deleteMany({}),
    Organization.deleteMany({})
  ]);
}

  // ── Organisation ────────────────────────────────────────
  const org = await Organization.create({
    name:      'Institute of Business Administration',
    shortName: 'IBA',
    code:      'IBA001',
    contactEmail: 'admin@iba.edu.pk',
    address:   'University Road, Karachi 75270',
    timezone:  'Asia/Karachi',
    mapCenter: { lat: 24.9056, lng: 67.0822 },
    defaultZoom: 15,
    isActive: true,
  });
  console.log(`✅ Organisation: ${org.name} (code: ${org.code})`);

  // ── Admin ────────────────────────────────────────────────
  const admin = await User.create({
    name:           'Admin User',
    email:          'admin@iba.edu.pk',
    password:       'Admin@1234',
    role:           'admin',
    organizationId: org._id,
    isVerified:     true,
    isActive:       true,
  });
  console.log(`✅ Admin: ${admin.email} / Admin@1234  (org code: ${org.code})`);

  // ── Drivers ──────────────────────────────────────────────
  const driver1 = await User.create({
    name:           'Ali Hassan',
    email:          'driver1@iba.edu.pk',
    password:       'Driver@1234',
    role:           'driver',
    organizationId: org._id,
    licenseNumber:  'KHI-2020-11234',
    isVerified:     true,
    isActive:       true,
  });
  const driver2 = await User.create({
    name:           'Usman Khan',
    email:          'driver2@iba.edu.pk',
    password:       'Driver@1234',
    role:           'driver',
    organizationId: org._id,
    licenseNumber:  'KHI-2021-55678',
    isVerified:     true,
    isActive:       true,
  });
  console.log(`✅ Drivers: driver1@iba.edu.pk & driver2@iba.edu.pk / Driver@1234`);

  // ── Students ─────────────────────────────────────────────
  const students = await User.insertMany([
    { name: 'Sara Ahmed',   email: 'student1@iba.edu.pk', password: 'Student@1234', role: 'student', organizationId: org._id, studentId: 'IBA-2023-001', isVerified: true, isActive: true },
    { name: 'Bilal Malik',  email: 'student2@iba.edu.pk', password: 'Student@1234', role: 'student', organizationId: org._id, studentId: 'IBA-2023-002', isVerified: true, isActive: true },
    { name: 'Zara Sheikh',  email: 'student3@iba.edu.pk', password: 'Student@1234', role: 'student', organizationId: org._id, studentId: 'IBA-2023-003', isVerified: true, isActive: true },
  ]);
  console.log(`✅ Students: student1/2/3@iba.edu.pk / Student@1234`);

  // ── Stops ─────────────────────────────────────────────────
  const stopData = [
    { name: 'Main Gate',        lat: 24.9056, lng: 67.0822, facilities: ['shelter', 'lighting'] },
    { name: 'Library Block',    lat: 24.9070, lng: 67.0835, facilities: ['shelter', 'bench'] },
    { name: 'Admin Block',      lat: 24.9040, lng: 67.0810, facilities: ['lighting'] },
    { name: 'Sports Complex',   lat: 24.9080, lng: 67.0850, facilities: ['shelter', 'bench', 'lighting'] },
    { name: 'Hostel A',         lat: 24.9030, lng: 67.0800, facilities: ['shelter'] },
    { name: 'Cafeteria Stop',   lat: 24.9060, lng: 67.0840, facilities: ['bench', 'lighting'] },
  ];

  const stops = await Stop.insertMany(
    stopData.map(s => ({ ...s, organizationId: org._id, isActive: true }))
  );
  console.log(`✅ Stops: ${stops.length} created`);

  // ── Shuttles ──────────────────────────────────────────────
  const shuttle1 = await Shuttle.create({
    organizationId: org._id,
    name:        'Shuttle Alpha',
    plateNumber: 'KHI-001',
    capacity:    30,
    shortCode:   'A',
    make:        'Toyota',
    model:       'Coaster',
    year:        2020,
    color:       '#2563EB',
    status:      'idle',
    currentDriverId: driver1._id,
  });
  const shuttle2 = await Shuttle.create({
    organizationId: org._id,
    name:        'Shuttle Beta',
    plateNumber: 'KHI-002',
    capacity:    25,
    shortCode:   'B',
    make:        'Hino',
    model:       'Bus',
    year:        2019,
    color:       '#10B981',
    status:      'idle',
    currentDriverId: driver2._id,
  });
  console.log(`✅ Shuttles: Shuttle Alpha (A) & Shuttle Beta (B)`);

  // ── Routes ────────────────────────────────────────────────
  const route1 = await Route.create({
    organizationId: org._id,
    name:      'Campus Loop',
    shortCode: 'CL',
    color:     '#2563EB',
    isActive:  true,
    isCircular: true,
    stops: [
      { stopId: stops[0]._id, order: 1, estimatedMinutesFromStart: 0  },
      { stopId: stops[1]._id, order: 2, estimatedMinutesFromStart: 5  },
      { stopId: stops[2]._id, order: 3, estimatedMinutesFromStart: 10 },
      { stopId: stops[3]._id, order: 4, estimatedMinutesFromStart: 15 },
      { stopId: stops[0]._id, order: 5, estimatedMinutesFromStart: 22 },
    ],
    schedule: [{
      days: ['Mon','Tue','Wed','Thu','Fri'],
      startTime: '08:00',
      endTime:   '18:00',
      frequency: 30,
    }],
    totalDistanceKm:       3.5,
    estimatedTotalMinutes: 22,
  });

  const route2 = await Route.create({
    organizationId: org._id,
    name:      'Hostel Express',
    shortCode: 'HE',
    color:     '#10B981',
    isActive:  true,
    isCircular: false,
    stops: [
      { stopId: stops[4]._id, order: 1, estimatedMinutesFromStart: 0  },
      { stopId: stops[2]._id, order: 2, estimatedMinutesFromStart: 8  },
      { stopId: stops[0]._id, order: 3, estimatedMinutesFromStart: 15 },
    ],
    schedule: [{
      days: ['Mon','Tue','Wed','Thu','Fri','Sat'],
      startTime: '07:00',
      endTime:   '20:00',
      frequency: 20,
    }],
    totalDistanceKm:       2.1,
    estimatedTotalMinutes: 15,
  });
  console.log(`✅ Routes: Campus Loop (CL) & Hostel Express (HE)`);

  // ── Assign shuttle to routes ──────────────────────────────
  await User.findByIdAndUpdate(driver1._id, { assignedShuttleId: shuttle1._id, assignedRouteId: route1._id });
  await User.findByIdAndUpdate(driver2._id, { assignedShuttleId: shuttle2._id, assignedRouteId: route2._id });
  await Shuttle.findByIdAndUpdate(shuttle1._id, { assignedRouteId: route1._id });
  await Shuttle.findByIdAndUpdate(shuttle2._id, { assignedRouteId: route2._id });

  // ── Past trips for history ────────────────────────────────
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pastTrip = await Trip.create({
    organizationId: org._id,
    shuttleId:  shuttle1._id,
    driverId:   driver1._id,
    routeId:    route1._id,
    status:     'completed',
    startTime:  yesterday,
    endTime:    new Date(yesterday.getTime() + 25 * 60 * 1000),
    distanceCoveredKm: 3.2,
    peakPassengers: 18,
    totalBoardings: 22,
  });

  await Rating.create({
    organizationId: org._id,
    tripId:    pastTrip._id,
    studentId: students[0]._id,
    driverId:  driver1._id,
    rating:    4,
    comment:   'Good service, on time!',
  });
  console.log(`✅ Past trip + rating created`);

  console.log('\n' + '='.repeat(55));
  console.log('🎉  Seed complete!');
  console.log('='.repeat(55));
  console.log('\n📋  LOGIN CREDENTIALS');
  console.log(`  Admin:   admin@iba.edu.pk / Admin@1234  +org: ${org.code}`);
  console.log(`  Driver1: driver1@iba.edu.pk / Driver@1234`);
  console.log(`  Driver2: driver2@iba.edu.pk / Driver@1234`);
  console.log(`  Student: student1@iba.edu.pk / Student@1234`);
  console.log('\n🔑  Org Code: ' + org.code);
  console.log('='.repeat(55) + '\n');

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch(err => {
  console.error('❌ Seed error:', err.message);
  process.exit(1);
});
