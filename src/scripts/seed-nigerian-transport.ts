// src/scripts/seed-nigerian-transport.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt'; // Changed from bcryptjs to bcrypt

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🌱 Starting Nigerian Transport Data Seed...\n');

  try {
    // ============================================
    // 1. CREATE SUPER ADMIN
    // ============================================
    console.log('👤 Creating Super Admin...');

    const passwordHash = await bcrypt.hash('Pampersbaby@12345!', 12);

    const adminResult = await dataSource.query(
      `
      INSERT INTO admins (
        email, 
        "firstName", 
        "lastName", 
        "passwordHash", 
        role, 
        permissions, 
        "isActive",
        "mustChangePassword",
        "passwordChangedAt",
        "totpEnabled",
        "failedLoginAttempts",
        "createdAt",
        "updatedAt"
      ) VALUES (
        'joel.emmanuel@avigate.co',
        'Joel',
        'Emmanuel',
        $1,
        'super_admin',
        '["*"]',
        true,
        false,
        NOW(),
        false,
        0,
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE 
      SET 
        "passwordHash" = EXCLUDED."passwordHash",
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        "isActive" = EXCLUDED."isActive",
        "mustChangePassword" = EXCLUDED."mustChangePassword",
        "passwordChangedAt" = EXCLUDED."passwordChangedAt",
        "totpEnabled" = EXCLUDED."totpEnabled",
        "updatedAt" = NOW()
      RETURNING id;
    `,
      [passwordHash],
    );

    console.log('✅ Super Admin created/updated');
    console.log('   Email: joel.emmanuel@avigate.co');
    console.log('   Password: Pampersbaby@12345!');
    console.log('   Role: super_admin');
    console.log('   TOTP: Disabled (can be enabled after login)\n');

    // ============================================
    // 2. CREATE ADDITIONAL ADMIN ACCOUNTS (Optional)
    // ============================================
    console.log('👥 Creating Additional Admin Accounts...\n');

    const additionalAdmins = [
      {
        email: 'admin@avigate.co',
        firstName: 'Test',
        lastName: 'Admin',
        password: 'AdminTest123!@#',
        role: 'admin',
        permissions: [
          'users.view',
          'users.create',
          'users.edit',
          'users.delete',
          'analytics.view',
          'analytics.export',
          'content.moderate',
          'admins.view',
        ],
      },
      {
        email: 'moderator@avigate.co',
        firstName: 'Test',
        lastName: 'Moderator',
        password: 'ModeratorTest123!@#',
        role: 'moderator',
        permissions: ['users.view', 'users.edit', 'content.moderate', 'analytics.view'],
      },
    ];

    for (const admin of additionalAdmins) {
      const adminPasswordHash = await bcrypt.hash(admin.password, 12);

      await dataSource.query(
        `
        INSERT INTO admins (
          email, 
          "firstName", 
          "lastName", 
          "passwordHash", 
          role, 
          permissions, 
          "isActive",
          "mustChangePassword",
          "passwordChangedAt",
          "totpEnabled",
          "failedLoginAttempts",
          "createdAt",
          "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
        )
        ON CONFLICT (email) DO UPDATE 
        SET 
          "passwordHash" = EXCLUDED."passwordHash",
          role = EXCLUDED.role,
          permissions = EXCLUDED.permissions,
          "isActive" = EXCLUDED."isActive",
          "mustChangePassword" = EXCLUDED."mustChangePassword",
          "passwordChangedAt" = EXCLUDED."passwordChangedAt",
          "totpEnabled" = EXCLUDED."totpEnabled",
          "updatedAt" = NOW()
      `,
        [
          admin.email,
          admin.firstName,
          admin.lastName,
          adminPasswordHash,
          admin.role,
          JSON.stringify(admin.permissions),
          true, // isActive
          false, // mustChangePassword (false for seed data)
          new Date(), // passwordChangedAt
          false, // totpEnabled
          0, // failedLoginAttempts
        ],
      );

      console.log(`✅ Created admin: ${admin.email} (Role: ${admin.role})`);
    }

    console.log(`\n✅ Created ${additionalAdmins.length + 1} admin accounts\n`);

    // ============================================
    // 3. CREATE TEST USERS
    // ============================================
    console.log('👥 Creating Test Users...\n');

    const testUsers = [
      {
        email: 'testuser1@avigate.co',
        firstName: 'Test',
        lastName: 'User One',
        sex: 'male',
        phoneNumber: '+2348012345671',
        password: 'TestPass123!',
        googleId: null,
        description: 'General testing account for basic app functionality',
      },
      {
        email: 'testuser2@avigate.co',
        firstName: 'Test',
        lastName: 'User Two',
        sex: 'female',
        phoneNumber: '+2348012345672',
        password: 'TestPass123!',
        googleId: null,
        description: 'Advanced testing account with higher reputation',
      },
      {
        email: 'googletest@avigate.co',
        firstName: 'Google',
        lastName: 'Test',
        sex: 'male',
        phoneNumber: '+2348012345673',
        password: 'TestPass123!',
        googleId: 'test_google_id_123',
        description: 'Google Play Store testing account',
      },
      {
        email: 'appletest@avigate.co',
        firstName: 'Apple',
        lastName: 'Test',
        sex: 'female',
        phoneNumber: '+2348012345674',
        password: 'TestPass123!',
        googleId: null,
        description: 'Apple App Store testing account',
      },
    ];

    const createdTestUsers: Array<{ email: string; id: any }> = [];

    for (const user of testUsers) {
      const userPasswordHash = await bcrypt.hash(user.password, 12);

      const userResult = await dataSource.query(
        `
        INSERT INTO users (
          email, 
          "firstName", 
          "lastName", 
          sex,
          "phoneNumber",
          "googleId",
          "passwordHash",
          "isVerified",
          "isActive",
          "isTestAccount",
          "reputationScore",
          "createdAt",
          "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
        )
        ON CONFLICT (email) DO UPDATE 
        SET email = EXCLUDED.email
        RETURNING id;
      `,
        [
          user.email,
          user.firstName,
          user.lastName,
          user.sex,
          user.phoneNumber,
          user.googleId,
          userPasswordHash,
          true,
          true,
          true,
          user.email === 'testuser2@avigate.co' ? 500 : 100,
        ],
      );

      createdTestUsers.push({
        email: user.email,
        id: userResult[0].id,
      });

      console.log(`✅ Created test user: ${user.email} - ${user.description}`);
    }

    const testUserId = createdTestUsers[0].id;
    console.log(`\n✅ Created ${testUsers.length} test users\n`);

    // ============================================
    // 4. PORT HARCOURT LOCATIONS
    // ============================================
    console.log('📍 Creating Port Harcourt Locations...');

    const phLocations = [
      {
        name: 'Choba Junction',
        lat: 4.8984,
        lng: 6.9157,
        type: 'junction',
        landmarks: ['University of Port Harcourt Gate', 'Choba Market'],
      },
      {
        name: 'Rumuokoro Junction',
        lat: 4.8456,
        lng: 6.9931,
        type: 'junction',
        landmarks: ['Rumuokoro Flyover', 'Total Filling Station'],
      },
      {
        name: 'Airforce Junction',
        lat: 4.8245,
        lng: 7.0123,
        type: 'junction',
        landmarks: ['Airforce Base Gate', 'Nigerian Air Force Secondary School'],
      },
      {
        name: 'Eleme Junction',
        lat: 4.7823,
        lng: 7.1234,
        type: 'junction',
        landmarks: ['Eleme Petrochemical', 'Eleme Refinery'],
      },
      {
        name: 'Oyigbo Junction',
        lat: 4.8956,
        lng: 7.1456,
        type: 'junction',
        landmarks: ['Oyigbo Market', 'Police Station'],
      },
      {
        name: 'Waterlines Junction',
        lat: 4.8156,
        lng: 7.0234,
        type: 'junction',
        landmarks: ['Waterlines Roundabout', 'First Bank'],
      },
      {
        name: 'Rumuola Junction',
        lat: 4.8334,
        lng: 6.9845,
        type: 'junction',
        landmarks: ['Rumuola Flyover', 'GTBank'],
      },
      {
        name: 'Eliozu Junction',
        lat: 4.8567,
        lng: 7.0234,
        type: 'junction',
        landmarks: ['Eliozu Main Junction', 'Assemblies of God Church'],
      },
      {
        name: 'Mile 1 Market',
        lat: 4.7756,
        lng: 7.0134,
        type: 'market',
        landmarks: ['Ikwerre Road', 'Mile 1 Taxi Park'],
      },
      {
        name: 'Mile 3 Market',
        lat: 4.8012,
        lng: 7.0245,
        type: 'market',
        landmarks: ['Aba Road', 'Mile 3 Park'],
      },
      {
        name: 'Oyigbo Market',
        lat: 4.8945,
        lng: 7.1445,
        type: 'market',
        landmarks: ['Oyigbo Main Market', 'Trans-Amadi Road'],
      },
      {
        name: 'Rumuwoji Market',
        lat: 4.8223,
        lng: 6.9956,
        type: 'market',
        landmarks: ['Rumuwoji Junction', 'Zenith Bank'],
      },
      {
        name: 'University of Port Harcourt Main Gate',
        lat: 4.8995,
        lng: 6.9167,
        type: 'university',
        landmarks: ['UNIPORT', 'Choba Gate'],
      },
      {
        name: 'Rivers State University',
        lat: 4.8145,
        lng: 6.9823,
        type: 'university',
        landmarks: ['RSU', 'Nkpolu-Oroworukwo'],
      },
      {
        name: 'Federal College of Education',
        lat: 4.7934,
        lng: 6.9756,
        type: 'college',
        landmarks: ['FCE Rumuolumeni'],
      },
      {
        name: 'University of Port Harcourt Teaching Hospital',
        lat: 4.8234,
        lng: 6.9567,
        type: 'hospital',
        landmarks: ['UPTH', 'Alakahia'],
      },
      {
        name: 'Braithwaite Memorial Hospital',
        lat: 4.7823,
        lng: 7.0156,
        type: 'hospital',
        landmarks: ['BMH', 'Aba Road'],
      },
      {
        name: 'Rumuokwuta',
        lat: 4.8445,
        lng: 6.9712,
        type: 'residential',
        landmarks: ['Rumuokwuta Junction', 'Police Barracks'],
      },
      {
        name: 'Alakahia',
        lat: 4.8323,
        lng: 6.9634,
        type: 'residential',
        landmarks: ['Alakahia Roundabout', 'Community Hall'],
      },
      {
        name: 'Eliozu',
        lat: 4.8567,
        lng: 7.0234,
        type: 'residential',
        landmarks: ['Eliozu Junction', 'Assemblies of God Church'],
      },
      {
        name: 'Mgbuoba',
        lat: 4.8134,
        lng: 6.9845,
        type: 'residential',
        landmarks: ['Mgbuoba Junction'],
      },
      {
        name: 'Port Harcourt Mall',
        lat: 4.8156,
        lng: 7.0089,
        type: 'mall',
        landmarks: ['PH Mall', 'Aba Road'],
      },
      {
        name: 'Genesis Cinema',
        lat: 4.8145,
        lng: 7.0078,
        type: 'cinema',
        landmarks: ['Aba Road', 'Elevation Church'],
      },
      {
        name: 'Port Harcourt International Airport',
        lat: 5.0155,
        lng: 6.9496,
        type: 'airport',
        landmarks: ['Omagwa Airport'],
      },
      {
        name: 'Rivers State Secretariat',
        lat: 4.8067,
        lng: 7.0123,
        type: 'government',
        landmarks: ['Government House', 'Aba Road'],
      },
    ];

    const locationIds = {};

    for (const loc of phLocations) {
      const result = await dataSource.query(
        `
        INSERT INTO locations (
          name, city, state, country, latitude, longitude, description,
          "isVerified", "isActive", "popularityScore", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id;
      `,
        [
          loc.name,
          'Port Harcourt',
          'Rivers',
          'Nigeria',
          loc.lat,
          loc.lng,
          `${loc.type.charAt(0).toUpperCase() + loc.type.slice(1)} - ${loc.landmarks.join(', ')}`,
          true,
          true,
          Math.floor(Math.random() * 100) + 50,
        ],
      );

      locationIds[loc.name] = result[0].id;

      for (const landmark of loc.landmarks) {
        await dataSource.query(
          `
          INSERT INTO landmarks (
            "locationId", name, type, latitude, longitude, "isVerified", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW());
        `,
          [result[0].id, landmark, loc.type, loc.lat, loc.lng, true],
        );
      }
    }

    console.log(`✅ Created ${phLocations.length} Port Harcourt locations\n`);

    // ============================================
    // 5. CREATE DETAILED ROUTES
    // ============================================
    console.log('🛣️ Creating Routes with Detailed Instructions...\n');

    const routes = [
      {
        name: 'Choba to Airforce Junction via Rumuokoro',
        startLocation: 'Choba Junction',
        endLocation: 'Airforce Junction',
        description: 'Popular route from UNIPORT area to Airforce',
        transportModes: ['taxi', 'bus'],
        estimatedDuration: 45,
        distance: 12.5,
        minFare: 900,
        maxFare: 1100,
        steps: [
          {
            order: 1,
            fromLocation: 'Choba Junction',
            toLocation: 'Rumuokoro Junction',
            transportMode: 'taxi',
            instructions: `Getting to Rumuokoro Junction from Choba:

**Transport Options:** You can take either a taxi or bus for this leg

**App gets user current location**
- From your current location walk to the highway (Avigate app showing direction of walkable distance)
- When you get to the highway you would see either a bus, mini bus or taxi saying "Rumuokoro", or Bus conductor screaming Rumuokoro and other destinations
- Board any vehicle heading towards Eliozu or Eleme (they all pass Rumuokoro)
- Inform the conductor "I dey go Rumuokoro" (I'm going to Rumuokoro) 
- Since you are heading to Airforce you can enter vehicle going to Eliozu and pass the Rumuokoro stop this way you won't need to change vehicle at Rumuokoro. And it can be cheaper.

**If user current location is inside UNIPORT campus:**
- Walk to the main gate (about 5-10 minutes)
- Or take campus shuttle from Abuja park to the gate

**At the campus shuttle bus stop:**
- Should see Taxis and Buses shouting "Rumuokoro" and other stops
- Tell the conductor "Rumuokoro Junction"
- The vehicle will be filled with other passengers (shared transport)
- Journey takes about 15-20 minutes (Trip estimate by google map) depending on traffic

**What to look for at Rumuokoro:**
- You'll see a big flyover (bridge)
- Lots of buses and taxis parked
- We (Avigate app) will notify you when you are close and when you're there

**Important:** Always confirm with driver before entering: "You dey go Rumuokoro?" (Are you going to Rumuokoro?)`,
            duration: 20,
            distance: 7.2,
            estimatedFare: 550,
            vehicleInfo: 'Taxi or bus - Shared vehicle (Taxi: ₦500-₦600, Bus: ₦400-₦500)',
            landmarks: ['UNIPORT Main Gate', 'Choba Market', 'Rumuokoro Flyover'],
          },
          {
            order: 2,
            fromLocation: 'Rumuokoro Junction',
            toLocation: 'Airforce Junction',
            transportMode: 'taxi',
            instructions: `Getting from Rumuokoro to Airforce Junction:

**At Rumuokoro Junction:**
- After you drop from the first vehicle, look for the Airforce taxi park
- It's usually near the flyover, on the side going towards Eleme
- Look for taxis with drivers or vehicle loaders shouting "Airforce" or "Airforce and Eliozu Junction"

**If you can't find the taxi park:**
- Ask any local: "Abeg, where Airforce motor dey?" (Excuse me, where are vehicles to Airforce?)
- People are usually helpful and will point you in the right direction

**The Journey:**
- Vehicles fill up before leaving (usually 5 passengers)
- Wait time can be 5-15 minutes
- Journey takes about 15-20 minutes
- You'll pass Eliozu Junction on the way

**Alternative: Direct from Eliozu:**
- If you took the vehicle that passes Rumuokoro and stops at Eliozu Junction (On the same route), after you drop from the vehicle, look for the Airforce taxi park
- It's usually near the flyover, on the side going towards Airforce
- Look for taxis with drivers or vehicle loaders shouting "Airforce" or "Airforce Junction"
- Fare is within ₦200 - ₦300

**(Avigate app) should be able to detect user current location, make adjustments and give instructions accordingly**

**At Airforce Junction:**
- We (Avigate app) will notify you when you are close and when you're there
- Tell the driver: "Drop me for Airforce Junction"
- You'll see Nigerian Air Force Base gate
- Air Force Secondary School is nearby

**Safety Tip:** Keep your phone and valuables secure. Port Harcourt is generally safe during the day, but stay alert.`,
            duration: 25,
            distance: 5.3,
            estimatedFare: 450,
            vehicleInfo: 'Yellow taxi - Shared vehicle (5 passengers)',
            landmarks: ['Rumuokoro Flyover', 'Eliozu', 'Bori Camp', 'Airforce Base Gate'],
          },
        ],
      },

      {
        name: 'Choba to Mile 1 Market',
        startLocation: 'Choba Junction',
        endLocation: 'Mile 1 Market',
        description: 'Direct route to downtown Port Harcourt market area',
        transportModes: ['bus'],
        estimatedDuration: 35,
        distance: 10.8,
        minFare: 600,
        maxFare: 800,
        steps: [
          {
            order: 1,
            fromLocation: 'Choba Junction',
            toLocation: 'Mile 1 Market',
            transportMode: 'bus',
            instructions: `Going from Choba to Mile 1 Market:

**At Choba Junction:**
- Look for buses shouting and loading "Mile 1", "Agip", "Mile 3" 
- Commercial buses are common

**Boarding:**
- Board any bus going to "Town" - they all pass Mile 1
- Tell the conductor: "I dey drop Mile 1" (I'm dropping at Mile 1)
- Fare is usually ₦600-₦700

**App gets user current location**
- From your current location walk to the highway (Avigate app showing direction of walkable distance)
- When you get to the highway you would see either a bus, mini bus saying "Mile 1", "Agip", "Mile 3", or Bus conductor screaming "Mile 1", "Agip", "Mile 3" and other destinations

**During the Journey:**
- Journey is about 25-30 minutes
- You'll pass through Alakahia, Rumuola areas
- The bus conductor or driver will announce stops

**At Mile 1:**
- You'll see Mile 1 Market on your right
- Lots of shops and trading activities
- We (Avigate app) will notify you when you are close and when you're there
- Tell driver or Conductor: "Driver, Mile 1!" when you see the market

**Getting Around Mile 1:**
- The market is huge - ask traders for specific sections
- "Where phone section dey?" for electronics
- "Where cloth section dey?" for fabrics
- Keep belongings secure - markets are crowded

**Return Journey:**
- Same location, look for "Choba" or "UNIPORT" buses`,
            duration: 30,
            distance: 10.8,
            estimatedFare: 650,
            vehicleInfo: 'Commercial bus - Stops to pick passengers',
            landmarks: ['Alakahia', 'Rumuola', 'Mile 1 Market', 'Ikwerre Road'],
          },
        ],
      },

      {
        name: 'Rumuokoro to Port Harcourt Mall',
        startLocation: 'Rumuokoro Junction',
        endLocation: 'Port Harcourt Mall',
        description: 'Route to shopping mall with Buses',
        transportModes: ['bus'],
        estimatedDuration: 40,
        distance: 6.5,
        minFare: 500,
        maxFare: 700,
        steps: [
          {
            order: 1,
            fromLocation: 'Rumuokoro Junction',
            toLocation: 'Mile 1 Market',
            transportMode: 'bus',
            instructions: `Rumuokoro to Mile 1:

**At Rumuokoro:**
- Look for buses going towards "Mile 1 Market" or "Town (Lagos)"
- Buses park and loading passengers near the flyover
- Tell conductor: "Mile 1 Market or Town (Lagos)". Most buses don't get to the Town (Lagos) stop, they drop at Mile 1 Market
- Fare: ₦400-₦500 (Feel free to negotiate)

**The Ride:**
- Short journey, about 25 minutes
- Shared Bus with other passengers

**At Mile 1/ Education:**
- We (Avigate app) will notify you when you are close and when you're there
- This is where most drivers stop
- You'll see the market area
- Lots of Town (Lagos) buses waiting and loading passengers to Lagos Town`,
            duration: 25,
            distance: 3.2,
            estimatedFare: 450,
            vehicleInfo: 'Commercial bus - Shared ride',
            landmarks: ['Rumuokoro Flyover', 'Ikwerre Road heading to Aba Road', 'Mile 1 Market'],
          },
          {
            order: 2,
            fromLocation: 'Mile 1 Market',
            toLocation: 'Port Harcourt Mall',
            transportMode: 'bus',
            instructions: `Mile 1 to PH Mall (Spar) by Bus:

**Finding the Bus:**
- At Mile 1/Education, You will see Town (Lagos) buses waiting and loading passengers to Lagos Town
- Tell the conductor you are going to Spar
- Usually they park near the main road

**Negotiating Fare:**
- Tell the conductor: "Spar PH Mall, how much?"
- Normal price: ₦150-₦200
- Don't pay more than ₦200

**The Journey:**
- Very short ride, about 10-15 minutes
- You'll go deeper into Aba Road
- Buses are shared with other passengers

**At PH Mall:**
- We (Avigate app) will notify you when you are close and when you're there
- Bus will drop you at the opposite side of the road
- Spar PH Mall is opposite
- Security will check bags at entrance`,
            duration: 15,
            distance: 3.3,
            estimatedFare: 175,
            vehicleInfo: 'Commercial bus - Shared ride',
            landmarks: ['Mile 1 Market', 'Aba Road', 'PH Mall', 'Spar'],
          },
        ],
      },

      {
        name: 'UNIPORT to Mile 3 Market',
        startLocation: 'University of Port Harcourt Main Gate',
        endLocation: 'Mile 3 Market',
        description: 'Route from university campus to Mile 3 shopping area',
        transportModes: ['bus', 'taxi'],
        estimatedDuration: 40,
        distance: 11.5,
        minFare: 600,
        maxFare: 900,
        steps: [
          {
            order: 1,
            fromLocation: 'University of Port Harcourt Main Gate',
            toLocation: 'Mile 3 Market',
            transportMode: 'bus',
            instructions: `UNIPORT Main Gate to Mile 3 Market:

**At UNIPORT Main Gate:**
- Look for buses or taxis shouting "Mile 3", "Town", or "Aba Road"
- Buses are cheaper than taxis
- Tell the conductor: "I dey go Mile 3" (I'm going to Mile 3)

**Boarding:**
- Wait for the vehicle to fill up (shared transport)
- Fare: ₦600-₦800 depending on vehicle type
- Keep your belongings secure

**During the Journey:**
- Journey takes about 30-35 minutes
- You'll pass through Alakahia, Rumuola, and Mile 1
- The conductor will announce major stops

**At Mile 3:**
- We (Avigate app) will notify you when you are close and when you're there
- Tell driver: "Driver, Mile 3!" when you see the market
- Mile 3 Market is a large shopping area
- Look out for the park and market stalls

**Getting Around Mile 3:**
- Ask locals for specific shops
- Keep valuables secure in crowded areas
- Buses back to UNIPORT leave from the same area`,
            duration: 35,
            distance: 11.5,
            estimatedFare: 700,
            vehicleInfo: 'Commercial bus or taxi - Shared transport',
            landmarks: ['UNIPORT Main Gate', 'Alakahia', 'Rumuola', 'Mile 1', 'Mile 3 Market'],
          },
        ],
      },

      {
        name: 'Port Harcourt Airport to Mile 1',
        startLocation: 'Port Harcourt International Airport',
        endLocation: 'Mile 1 Market',
        description: 'Route from airport to city center',
        transportModes: ['taxi', 'bus'],
        estimatedDuration: 60,
        distance: 25.0,
        minFare: 2500,
        maxFare: 4000,
        steps: [
          {
            order: 1,
            fromLocation: 'Port Harcourt International Airport',
            toLocation: 'Mile 1 Market',
            transportMode: 'taxi',
            instructions: `Airport to Mile 1 Market:

**At the Airport (Arrival):**
- When you exit arrivals, you'll see many taxi drivers
- They will approach you offering rides
- Airport taxis are more expensive than regular taxis

**Negotiating Fare:**
- Normal price to Town: ₦7,000 - ₦10,000 (solo ride)
- Some drivers may ask for ₦10,000+ (don't pay this)
- If you can find other passengers going to town, you can share
- Shared ride: ₦2,500 - ₦3,000 per person

**Better Option - Shuttle Bus:**
- Look for airport shuttle buses (if available)
- Much cheaper: ₦3,000 - ₦4,500
- Takes longer as it picks passengers
- Drops at major bus stops in town

**The Journey (Solo Taxi):**
- About 45-60 minutes depending on traffic
- Route: Airport → Eleme → Oyigbo → Mile 1
- Driver knows the way, just confirm: "You dey go Mile 1?"

**Safety Tips:**
- Use registered airport taxis (they have tags)
- Agree on price BEFORE entering vehicle
- Keep luggage in view
- Have small change ready (drivers often don't have change for big notes)`,
            duration: 55,
            distance: 25.0,
            estimatedFare: 3000,
            vehicleInfo: 'Airport taxi (private) or shuttle bus (shared)',
            landmarks: ['Airport Terminal', 'Eleme Junction', 'Oyigbo', 'Mile 1 Market'],
          },
        ],
      },
    ];

    let routeCount = 0;
    const createdRoutes: Array<{
      name: string;
      id: any;
      steps: Array<{ order: number; id: any }>;
    }> = [];

    for (const route of routes) {
      const routeResult = await dataSource.query(
        `
        INSERT INTO routes (
          name, "startLocationId", "endLocationId", description,
          "transportModes", "estimatedDuration", distance, "minFare", "maxFare",
          "isVerified", "isActive", "popularityScore", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING id;
      `,
        [
          route.name,
          locationIds[route.startLocation],
          locationIds[route.endLocation],
          route.description,
          route.transportModes,
          route.estimatedDuration,
          route.distance,
          route.minFare,
          route.maxFare,
          true,
          true,
          Math.floor(Math.random() * 50) + 50,
        ],
      );

      const routeId = routeResult[0].id;
      createdRoutes.push({ name: route.name, id: routeId, steps: [] });

      for (const step of route.steps) {
        const stepResult = await dataSource.query(
          `
          INSERT INTO route_steps (
            "routeId", "stepOrder", "fromLocationId", "toLocationId",
            "transportMode", instructions, duration, distance, "estimatedFare",
            "vehicleInfo", landmarks, "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
          RETURNING id;
        `,
          [
            routeId,
            step.order,
            step.fromLocation ? locationIds[step.fromLocation] : null,
            step.toLocation ? locationIds[step.toLocation] : null,
            step.transportMode,
            step.instructions,
            step.duration,
            step.distance,
            step.estimatedFare,
            step.vehicleInfo,
            JSON.stringify(step.landmarks),
          ],
        );

        createdRoutes[createdRoutes.length - 1].steps.push({
          order: step.order,
          id: stepResult[0].id,
        });
      }

      routeCount++;
      console.log(`✅ Created route ${routeCount}: ${route.name}`);
    }

    console.log(`\n✅ Created ${routeCount} detailed routes\n`);

    // ============================================
    // 6. CREATE SAMPLE FARE FEEDBACK
    // ============================================
    console.log('💰 Creating Sample Fare Feedback...\n');

    const fareFeedbackSamples = [
      {
        routeName: 'Choba to Airforce Junction via Rumuokoro',
        stepOrder: 1,
        fare: 550,
        mode: 'taxi',
      },
      {
        routeName: 'Choba to Airforce Junction via Rumuokoro',
        stepOrder: 1,
        fare: 500,
        mode: 'taxi',
      },
      {
        routeName: 'Choba to Airforce Junction via Rumuokoro',
        stepOrder: 1,
        fare: 600,
        mode: 'taxi',
      },
      {
        routeName: 'Choba to Airforce Junction via Rumuokoro',
        stepOrder: 2,
        fare: 450,
        mode: 'taxi',
      },
      {
        routeName: 'Choba to Airforce Junction via Rumuokoro',
        stepOrder: 2,
        fare: 400,
        mode: 'taxi',
      },
      { routeName: 'Choba to Mile 1 Market', stepOrder: 1, fare: 650, mode: 'bus' },
      { routeName: 'Choba to Mile 1 Market', stepOrder: 1, fare: 600, mode: 'bus' },
      { routeName: 'Choba to Mile 1 Market', stepOrder: 1, fare: 700, mode: 'bus' },
      { routeName: 'Rumuokoro to Port Harcourt Mall', stepOrder: 1, fare: 450, mode: 'bus' },
      { routeName: 'Rumuokoro to Port Harcourt Mall', stepOrder: 2, fare: 175, mode: 'bus' },
      { routeName: 'Rumuokoro to Port Harcourt Mall', stepOrder: 2, fare: 200, mode: 'bus' },
    ];

    let feedbackCount = 0;
    for (const feedback of fareFeedbackSamples) {
      const route = createdRoutes.find(r => r.name === feedback.routeName);
      if (!route) {
        console.log(`⚠️  Route not found: ${feedback.routeName}`);
        continue;
      }

      const step = route.steps.find(s => s.order === feedback.stepOrder);
      if (!step) {
        console.log(`⚠️  Step ${feedback.stepOrder} not found for route: ${feedback.routeName}`);
        continue;
      }

      await dataSource.query(
        `
        INSERT INTO fare_feedbacks (
          "userId", 
          "routeId", 
          "routeStepId", 
          "farePaid", 
          "transportMode", 
          "isVerified",
          "createdAt", 
          "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW());
      `,
        [testUserId, route.id, step.id, feedback.fare, feedback.mode, false],
      );

      feedbackCount++;
    }

    console.log(`✅ Created ${feedbackCount} fare feedback entries\n`);

    console.log('✅ Seed completed successfully! 🎉\n');
    console.log('='.repeat(60));
    console.log('Summary:');
    console.log('='.repeat(60));
    console.log(`\n📊 Admin Accounts:`);
    console.log(`   1. joel.emmanuel@avigate.co (Super Admin)`);
    console.log(`      Password: Pampersbaby@12345!`);
    console.log(`      Role: super_admin`);
    console.log(`      TOTP: Disabled (can be enabled after login)`);
    console.log(`\n   2. admin@avigate.co (Admin)`);
    console.log(`      Password: AdminTest123!@#`);
    console.log(`      Role: admin`);
    console.log(`\n   3. moderator@avigate.co (Moderator)`);
    console.log(`      Password: ModeratorTest123!@#`);
    console.log(`      Role: moderator`);
    console.log(`\n👥 Test User Accounts:`);
    console.log(`   1. testuser1@avigate.co (Password: TestPass123!)`);
    console.log(`      - General testing account`);
    console.log(`      - Reputation: 100`);
    console.log(`   2. testuser2@avigate.co (Password: TestPass123!)`);
    console.log(`      - Advanced testing account`);
    console.log(`      - Reputation: 500`);
    console.log(`   3. googletest@avigate.co (Password: TestPass123!)`);
    console.log(`      - Google Play Store testing`);
    console.log(`      - Google ID: test_google_id_123`);
    console.log(`   4. appletest@avigate.co (Password: TestPass123!)`);
    console.log(`      - Apple App Store testing`);
    console.log(`\n📍 Data Created:`);
    console.log(`   - Admin Accounts: 3`);
    console.log(`   - Test User Accounts: 4`);
    console.log(`   - Locations: ${phLocations.length}`);
    console.log(`   - Routes: ${routeCount}`);
    console.log(`   - Fare Feedback Entries: ${feedbackCount}`);
    console.log(`\n✨ All routes include detailed, local-style instructions`);
    console.log(`✨ All admin accounts are ready to use immediately`);
    console.log(`✨ Super admin can enable 2FA after first login`);
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

seed();
