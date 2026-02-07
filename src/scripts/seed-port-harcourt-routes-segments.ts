// scripts/seed-port-harcourt-routes-segments.ts
import { DataSource } from 'typeorm';

/**
 * AVIGATE PORT HARCOURT ROUTE SEEDING WITH INTELLIGENT SEGMENTS
 *
 * This seed creates:
 * 1. Locations (major stops AND intermediate stops)
 * 2. Route Segments (shared paths between locations)
 * 3. Complete Routes (compositions of segments)
 *
 * Focus: Choba to Airforce via Rumuokoro + Rumuokoro to Mile 1/Education
 *
 * UPDATE: All landmarks now include latitude and longitude coordinates
 */

export async function seedPortHarcourtWithSegments(dataSource: DataSource) {
  console.log('🚀 Starting Port Harcourt Routes & Segments Seeding...\n');

  const locationIds: Record<string, string> = {};

  // ============================================
  // 1. CREATE LOCATIONS (INCLUDING INTERMEDIATE STOPS)
  // ============================================
  console.log('📍 Creating Locations...\n');

  const locations = [
    {
      name: 'University of Port Harcourt Main Gate',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.895036,
      longitude: 6.915045,
      description: 'Main entrance of UNIPORT',
      isVerified: true,
    },
    // Add these to your locations array:
    {
      name: 'Obasanjo Bypass',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.852363,
      longitude: 7.018898,
      description: 'Major bypass road in Port Harcourt',
      isVerified: true,
    },
    {
      name: 'c',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.8339,
      longitude: 7.0177,
      description: 'Road leading to Stadium area near Airforce Junction',
      isVerified: true,
    },
    {
      name: 'Alhajia Estate',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.866253,
      longitude: 7.004541,
      description: 'Residential estate between Rumuokoro and Eliozu',
      isVerified: true,
    },
    {
      name: 'Peace Estate',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.863016,
      longitude: 7.012074,
      description: 'Residential estate between Rumuokoro and Eliozu',
      isVerified: true,
    },
    {
      name: 'Mile 1 Diobu',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.792284,
      longitude: 6.997777,
      description: 'Mile 1 Market area in Diobu',
      isVerified: true,
    },
    // Add all the intermediate stops from the Rumuokoro to Mile 1 segment:
    {
      name: 'Rumugbo Junction',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.849449,
      longitude: 6.990875,
      description: 'Junction area with civic centre',
      isVerified: true,
    },
    {
      name: 'Nice Up/GTCO',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.837227,
      longitude: 6.988356,
      description: 'Commercial area near Mile 5',
      isVerified: true,
    },
    {
      name: 'Mile 5 AP Filling Station',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.837081,
      longitude: 6.987755,
      description: 'AP Filling Station at Mile 5',
      isVerified: true,
    },
    {
      name: 'Rumuepirikom',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.8383,
      longitude: 7.0402,
      description: 'Residential area with civic centre',
      isVerified: true,
    },
    {
      name: 'Police Headquarters',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.834065,
      longitude: 6.9848,
      description: 'Nigeria Police Divisional Headquarters',
      isVerified: true,
    },
    {
      name: 'Rumubiakani/Wimpy Junction',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.829799,
      longitude: 6.981759,
      description: 'Wimpy Junction area',
      isVerified: true,
    },
    {
      name: 'Rumueme',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.8284,
      longitude: 7.0666,
      description: 'Rumueme civic centre area',
      isVerified: true,
    },
    {
      name: 'Chida Bus Stop',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.823616,
      longitude: 6.980685,
      description: 'Chida bus stop area',
      isVerified: true,
    },
    {
      name: 'Mile 4',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.822651,
      longitude: 6.981005,
      description: 'Mile 4 commercial area',
      isVerified: true,
    },
    {
      name: 'Agip Roundabout',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.81387,
      longitude: 6.98361,
      description: 'Agip Road junction area',
      isVerified: true,
    },
    {
      name: 'Mile 3',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.804867,
      longitude: 6.989466,
      description: 'Mile 3 Market Square area',
      isVerified: true,
    },
    {
      name: 'UST Roundabout',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.806131,
      longitude: 6.988156,
      description: 'UST Junction roundabout',
      isVerified: true,
    },
    {
      name: 'Mile 2 Diobu',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.797595,
      longitude: 6.992507,
      description: 'Mile 2 Diobu area',
      isVerified: true,
    },
    {
      name: 'Choba Junction',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.898616,
      longitude: 6.906686,
      description: 'Major transport hub near UNIPORT',
      isVerified: true,
    },
    // Intermediate stops: Choba to Rumuokoro
    {
      name: 'Alakahia',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.887095,
      longitude: 6.924384,
      description: 'Residential and commercial area between Choba and Rumuosi',
      isVerified: true,
    },
    {
      name: 'Rumuosi',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.882583,
      longitude: 6.940745,
      description: 'Community along Choba-Rumuokoro route with market and churches',
      isVerified: true,
    },
    {
      name: 'Rumuagholu',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.867381,
      longitude: 6.997523,
      description: 'Residential area between Rumuosi and Nkpolu',
      isVerified: true,
    },
    {
      name: 'Nkpolu',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.869385,
      longitude: 6.980765,
      description: 'Commercial area near Rumuokoro with Twin Towers Hospital',
      isVerified: true,
    },
    {
      name: 'Rumuokoro Junction',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.867036,
      longitude: 6.997757,
      description: 'Major junction with flyover on Ikwerre Road',
      isVerified: true,
    },
    {
      name: 'Eliozu Junction',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.860564,
      longitude: 7.018559,
      description: 'Major junction at Eliozu with flyover on East-West Road',
      isVerified: true,
    },
    {
      name: 'Airforce Junction',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.835759,
      longitude: 7.016739,
      description: 'Major junction at Airforce Base area near Stadium Road',
      isVerified: true,
    },
    {
      name: 'Education Bus Stop',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.789061,
      longitude: 7.001091,
      description: 'Popular bus stop near educational institutions in central Port Harcourt',
      isVerified: true,
    },
  ];

  for (const location of locations) {
    const result = await dataSource.query(
      `INSERT INTO locations (name, city, state, country, latitude, longitude, description, "isVerified", "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING id;`,
      [
        location.name,
        location.city,
        location.state,
        location.country,
        location.latitude,
        location.longitude,
        location.description,
        location.isVerified,
        true,
      ],
    );
    locationIds[location.name] = result[0].id;
    console.log(`✅ Created location: ${location.name}`);
  }

  console.log(`\n✅ Created ${Object.keys(locationIds).length} locations\n`);

  // ============================================
  // 1B. CREATE LANDMARK LOCATIONS
  // ============================================
  console.log('🏢 Creating Landmark Locations...\n');

  // Collect all unique landmarks from all segments
  const allLandmarks = new Map<string, { name: string; lat: number; lng: number }>();

  //  Choba to Rumuokoro landmarks with 6 decimal places

  const chobaToRumuokoroLandmarks = [
    // CHOBA JUNCTION AREA
    { name: 'Market Square Choba Junction', lat: 4.898729, lng: 6.908096 },
    { name: 'Every Supermarket, Choba', lat: 4.898253, lng: 6.907298 },
    { name: 'Ay Machanic Workshop Choba', lat: 4.896217, lng: 6.911337 },
    { name: 'Dking Logistics', lat: 4.896181, lng: 6.910691 },
    { name: 'Olobo Premier College', lat: 4.89458, lng: 6.911858 },
    { name: 'Life Sanctuary parish redeem church', lat: 4.894288, lng: 6.912994 },
    { name: 'Oando Gas Station', lat: 4.894025, lng: 6.913527 },
    { name: 'Oando Car Wash', lat: 4.893835, lng: 6.913726 },
    { name: 'AP Filling Station', lat: 4.894295, lng: 6.914151 },
    { name: 'Institue of Petroleum Studies Rd', lat: 4.893766, lng: 6.914411 },
    { name: 'University of Port Harcourt', lat: 4.895036, lng: 6.915045 },
    { name: "Domino's Pizza Choba", lat: 4.893438, lng: 6.914209 },
    { name: 'YKC Junction', lat: 4.893337, lng: 6.914887 },
    { name: 'SYNLAB Nigeria', lat: 4.893037, lng: 6.914831 },
    { name: 'TechNTell', lat: 4.89292, lng: 6.914996 },
    { name: 'Igbogo Rd', lat: 4.89293, lng: 6.915174 },
    { name: 'DOMCHUKS AUTO CLINIK', lat: 4.892519, lng: 6.915577 },
    { name: 'Nigerian Flyer Designers Agency', lat: 4.892483, lng: 6.915848 },
    { name: 'Candy Clothing Store', lat: 4.892399, lng: 6.915748 },
    { name: 'GIG Logistics', lat: 4.892253, lng: 6.915685 },
    { name: 'Police Station Road', lat: 4.892374, lng: 6.916007 },
    { name: 'Choba Divisional Police Station', lat: 4.892142, lng: 6.916138 },
    { name: 'Helena Haven', lat: 4.89154, lng: 6.916853 },
    { name: 'Total Petrol Station Choba', lat: 4.89154, lng: 6.9171 },
    { name: 'Gateway International Church, Choba', lat: 4.891542, lng: 6.916858 },
    { name: 'Odums Hotel Rd', lat: 4.891366, lng: 6.917346 },
    { name: 'Christ Embassy Church, Choba', lat: 4.891269, lng: 6.917462 },
    { name: 'Blue Roof Ave', lat: 4.891182, lng: 6.917603 },
    { name: 'UNIQUE LUXURY HOTEL AND SUITES', lat: 4.891277, lng: 6.917999 },
    { name: 'bris vile hotel', lat: 4.89087, lng: 6.918973 },
    { name: 'Osaks Inteq Nig', lat: 4.889124, lng: 6.919808 },
    { name: 'Happy Rollings', lat: 4.88959, lng: 6.919841 },

    // ALAKAHIA AREA
    { name: 'Faro Event Center', lat: 4.9008, lng: 6.9201 },
    { name: 'OKAHIA ESTATE', lat: 4.889066, lng: 6.921345 },
    { name: 'Aesthetic luminous beauty', lat: 4.888724, lng: 6.921073 },
    { name: 'CJ gas point', lat: 4.888482, lng: 6.921378 },
    { name: 'Supreme Delich', lat: 4.888129, lng: 6.921931 },
    { name: 'Redeemed Christian Church of God', lat: 4.8953, lng: 6.9226 },
    { name: 'Jovit Fast Food', lat: 4.887248, lng: 6.924804 },
    { name: 'Rumualogu St', lat: 4.887048, lng: 6.924245 },
    { name: 'University Of Port Harcourt Teaching Hospital Rd', lat: 4.887595, lng: 6.924558 },
    { name: 'Galaxy Car Wash and bar', lat: 4.887539, lng: 6.924006 },
    { name: 'Final Fantasy Lounge', lat: 4.887598, lng: 6.924143 },
    { name: 'Supreme Delich Restaurant', lat: 4.8955, lng: 6.926 },
    { name: 'Tokyo Royal Hotel', lat: 4.8952, lng: 6.9265 },
    { name: 'ROYAL CHOIX PORTHARCOURT', lat: 4.886213, lng: 6.926501 },
    { name: 'FRANK SIGNATURE', lat: 4.895, lng: 6.9268 },
    { name: 'NYSC Rd', lat: 4.886337, lng: 6.926927 },
    { name: 'Assemblies of God Church, (Miracle Home), Alakahia', lat: 4.886468, lng: 6.927142 },
    { name: 'Sevriegn Apartments', lat: 4.8949, lng: 6.9272 },
    { name: "D'CRUISE Carwash and Bar", lat: 4.89485, lng: 6.9274 },
    { name: "Henry's lodge", lat: 4.89482, lng: 6.9276 },
    { name: 'WHITE HOUSE LODGE', lat: 4.8948, lng: 6.927 },
    { name: 'SHALOM BAPTIST CHURCH UNIPORT', lat: 4.89475, lng: 6.9278 },
    { name: 'Aka Plaza Alakahia', lat: 4.886282, lng: 6.928175 },
    { name: 'Anwuri Plaza', lat: 4.885766, lng: 6.928335 },
    { name: 'Biosystems Medical Diagnostics Alakahia', lat: 4.8944, lng: 6.9284 },
    { name: 'OTANA HEARING & EDU-HEALTH', lat: 4.8943, lng: 6.9286 },
    { name: 'Seer road', lat: 4.8942, lng: 6.9288 },
    { name: 'GUO Logistics Choba', lat: 4.894, lng: 6.9282 },
    {
      name: 'Energy Technology Institute University of Port Harcourt',
      lat: 4.885818,
      lng: 6.929464,
    },
    { name: 'Mtn Nigeria office', lat: 4.885448, lng: 6.929992 },
    { name: 'Obama Liquid', lat: 4.885271, lng: 6.930159 },
    { name: 'NDDC Rd', lat: 4.885389, lng: 6.930345 },
    { name: 'Vacmed Pharmacy', lat: 4.8937, lng: 6.9298 },
    { name: 'Onariz kiddies', lat: 4.8936, lng: 6.9301 },
    { name: 'Rumousogwu Hall', lat: 4.8935, lng: 6.9304 },
    { name: 'Chow Labs', lat: 4.8934, lng: 6.9307 },
    { name: "Annie's Fashion", lat: 4.8933, lng: 6.931 },
    { name: 'Nailgasm by Pearl Beauty Studio', lat: 4.8932, lng: 6.9313 },
    { name: 'NNPC Alakahia', lat: 4.885665, lng: 6.93156 },
    { name: 'Mobil Filling Station Alakahia', lat: 4.885706, lng: 6.931493 },
    { name: 'Today FM 95.1 road', lat: 4.885485, lng: 6.931621 },
    { name: 'Lantern Cafe, Alakahia', lat: 4.8854, lng: 6.93213 },
    { name: 'Spadob Hotel Alakahia', lat: 4.884975, lng: 6.932061 },
    { name: 'Royal court Private School _ OAM arts', lat: 4.885486, lng: 6.932247 },
    { name: 'Lebavics Oil', lat: 4.885227, lng: 6.933663 },
    { name: 'Williete Development Systems Ltd', lat: 4.884545, lng: 6.934443 },
    { name: 'Ema-Dominion international School', lat: 4.884401, lng: 6.935307 },
    { name: 'HEAVENLY JERUSALEM ASSEMBLY RUMUEKINI', lat: 4.884798, lng: 6.935504 },
    { name: 'Ola banky fuel station', lat: 4.88402, lng: 6.936663 },
    { name: 'Salvation Rd', lat: 4.883968, lng: 6.936803 },
    { name: 'ASTERN PHARMACEUTICALS & STORES', lat: 4.884024, lng: 6.937013 },
    { name: 'Deeper Life Bible Church Alakahia', lat: 4.884236, lng: 6.937799 },
    { name: 'Kapna International Academy', lat: 4.88407, lng: 6.937949 },
    { name: 'Oak Westfield Plaza', lat: 4.883345, lng: 6.938627 },
    { name: 'NEDAL SPECIALIST HOSPITAL', lat: 4.882883, lng: 6.939185 },
    { name: 'Jubbet-Grid Energies Limited', lat: 4.883449, lng: 6.9394 },

    // RUMUOSI AREA
    { name: 'Rumosi market', lat: 4.882874, lng: 6.940033 },
    { name: 'Rumuekini Rd', lat: 4.882847, lng: 6.940885 },
    { name: 'State primary school, Rumuosi Town', lat: 4.882659, lng: 6.941159 },
    { name: 'Rumuosi-Ozuoba Rd', lat: 4.882418, lng: 6.940993 },
    { name: 'ASSEMBLIES OF GOD CHURCH Rumuosi', lat: 4.882479, lng: 6.941827 },
    { name: 'Whiz Oil', lat: 4.882038, lng: 6.942575 },
    { name: 'Salvation Ministries Timber Junct', lat: 4.881024, lng: 6.94348 },
    { name: 'Timber Junct', lat: 4.881125, lng: 6.943617 },
    { name: 'Ifythel Lights and Accessories', lat: 4.8823, lng: 6.94355 },
    { name: 'HEAVENLY JERUSALEM', lat: 4.88225, lng: 6.94365 },
    { name: 'TEE LU SERVICE', lat: 4.8822, lng: 6.94375 },
    { name: 'Chi Bons and son restaurant', lat: 4.88215, lng: 6.94385 },
    { name: 'Chilotem Electrical & Electronics', lat: 4.8821, lng: 6.9436 },
    { name: '9ja Farmers Market', lat: 4.8818, lng: 6.9442 },
    { name: 'St. Gabriel Catholic Church', lat: 4.8812, lng: 6.9452 },
    { name: 'CHOICE PLACE', lat: 4.8811, lng: 6.94535 },
    { name: 'Samlency Autoplex', lat: 4.881, lng: 6.9455 },
    { name: 'Jesus Breed', lat: 4.8809, lng: 6.94565 },
    { name: 'Christ Apostolic Church Akpor District', lat: 4.880277, lng: 6.945609 },
    { name: 'FAYE GLOW', lat: 4.8806, lng: 6.9461 },
    { name: 'Foundation Faith Church Rumuosi', lat: 4.880164, lng: 6.946651 },
    { name: 'The Sought Out Intercessory Deliverance Ministries', lat: 4.879787, lng: 6.947297 },

    // RUMUOSI/RUMUAGHOLU SECTION
    { name: 'MOE Fitness gym', lat: 4.8795, lng: 6.9485 },
    { name: 'United Evangelical Church, Rivers Field', lat: 4.8793, lng: 6.9488 },
    { name: 'Bolinbeth Hotel', lat: 4.8791, lng: 6.9491 },
    { name: 'Rumuosi Football Field', lat: 4.877657, lng: 6.94945 },
    { name: 'GLOBAL EDUCATION CONSULT', lat: 4.8787, lng: 6.9497 },
    { name: 'Coollink.ng Port Harcourt', lat: 4.8785, lng: 6.95 },
    { name: 'Wazobia MAX Television, Port Harcourt', lat: 4.8783, lng: 6.9503 },
    { name: 'Rumuosi Rd', lat: 4.8781, lng: 6.9506 },
    { name: 'Gade Place Hotel', lat: 4.878104, lng: 6.950767 },
    { name: 'Amala Empire', lat: 4.8779, lng: 6.951 },
    { name: 'Atlantic Bluewater Services Limited', lat: 4.878056, lng: 6.95129 },
    { name: 'WCC word changers chapel pH', lat: 4.877937, lng: 6.951173 },
    { name: 'Oil Link', lat: 4.877267, lng: 6.95124 },
    { name: 'Heimans petroleum limited', lat: 4.876921, lng: 6.95194 },

    // RUMUAGHOLU AREA
    { name: 'THE EDGE', lat: 4.87765, lng: 6.952 },
    { name: 'Bell Crest Shopping Mall', lat: 4.87746, lng: 6.952265 },
    { name: 'Playfield Park and Event Center', lat: 4.877767, lng: 6.952376 },
    { name: 'All express.nig', lat: 4.8776, lng: 6.9521 },
    { name: 'Touch of gold interiors', lat: 4.87755, lng: 6.9522 },
    { name: 'MetroFlex Gym Rumuosi', lat: 4.8774, lng: 6.9524 },
    { name: 'LA FIDES GLOBAL SERVICE LTD', lat: 4.876657, lng: 6.953043 },
    { name: 'konga Express', lat: 4.8768, lng: 6.9536 },
    { name: 'NORLAND NIGERIA (Team Sunny)', lat: 4.876924, lng: 6.953964 },
    { name: 'RUMUAGHOLU JUNCTION OFF NEW AIRPORT ROAD', lat: 4.87578, lng: 6.95361 },
    { name: 'Focus Point Homes And Properties', lat: 4.8767, lng: 6.954 },
    { name: 'National Institute of Surveyors', lat: 4.87665, lng: 6.9541 },
    { name: 'Rumu-Osi/obiri ikwerre flyover', lat: 4.87573, lng: 6.954128 },
    { name: 'Frigate Upstream & Energy Services Limited', lat: 4.8766, lng: 6.95415 },
    { name: "NUELA'S PLACE RUMUAGHOLU", lat: 4.8765, lng: 6.9542 },
    { name: 'Strides Energy & Maritime Ltd', lat: 4.875323, lng: 6.95547 },
    { name: 'Pan African Health Foundation', lat: 4.8764, lng: 6.9544 },
    { name: 'Integrated Medical Industries', lat: 4.87635, lng: 6.9545 },
    { name: 'Fieldworks Energy Services Nigeria Limited', lat: 4.8763, lng: 6.9546 },

    // MINITA/NKPOLU AREA
    { name: 'Minita Rd', lat: 4.874936, lng: 6.957267 },
    { name: 'Lechez Hotels & Suites', lat: 4.8758, lng: 6.9555 },
    { name: "The Lord's Chosen", lat: 4.8756, lng: 6.9558 },
    { name: 'Veluvai Beauty', lat: 4.87555, lng: 6.9559 },
    { name: 'Bilk Pharmacy', lat: 4.8755, lng: 6.956 },
    { name: "The Lord's Chosen Estate", lat: 4.8754, lng: 6.9562 },
    { name: 'Skyvalue Aluminum', lat: 4.874524, lng: 6.958286 },
    { name: 'Nigerian Medical Association, Port Harcourt Office', lat: 4.874294, lng: 6.958817 },
    { name: 'Vogue Aluminium Roofing Ltd', lat: 4.873403, lng: 6.960532 },
    { name: 'Charkin Maritime Academy', lat: 4.873496, lng: 6.96049 },
    { name: 'Amando Table Water', lat: 4.8751, lng: 6.9567 },
    { name: 'Egbelu Minita Estate', lat: 4.875, lng: 6.9568 },
    { name: 'Egbelu Minita Road', lat: 4.872274, lng: 6.96335 },
    { name: 'Jerry Justice Ave', lat: 4.87495, lng: 6.95685 },
    { name: 'Piqulina Road', lat: 4.87492, lng: 6.9569 },
    { name: 'Bua Cement Depot', lat: 4.87491, lng: 6.95695 },
    { name: 'Twin Towers Specialist Hospitals', lat: 4.8749, lng: 6.957 },
    { name: 'RCCG Great Rock Parish', lat: 4.87485, lng: 6.9571 },
    { name: 'Jephtah Nursery & Primary School', lat: 4.871537, lng: 6.963575 },
    { name: 'ECM PLAZA', lat: 4.872648, lng: 6.961118 },
    { name: 'Supreme & Mitchells Oil Ltd', lat: 4.873032, lng: 6.961218 },
    { name: 'Vitafoam', lat: 4.872967, lng: 6.961421 },
    { name: 'Bobby Investment Nig. Ltd', lat: 4.872652, lng: 6.962462 },
    { name: 'Pipeline Road', lat: 4.8719, lng: 6.964209 },
    { name: 'Jephthah Comprehensive Secondary School', lat: 4.870884, lng: 6.964104 },

    // FINAL STRETCH TO RUMUOKORO
    { name: 'AHMADIYYA CENTRAL MOSQUE', lat: 4.8725, lng: 6.9605 },
    { name: 'Aazy Hotel and suites', lat: 4.8723, lng: 6.9608 },
    { name: 'The Altar of Faith Ministry', lat: 4.8721, lng: 6.9611 },
    { name: 'Mango Oil', lat: 4.871598, lng: 6.965435 },
    { name: 'Wellness Hotel', lat: 4.871371, lng: 6.968111 },
    { name: 'Omega House Power Arena', lat: 4.870453, lng: 6.968475 },
    { name: 'DSTV OFFICE EAST WEST ROAD', lat: 4.870371, lng: 6.97002 },
    { name: 'Chophouse bistro and grills', lat: 4.8701, lng: 6.9646 },
    { name: 'NFA Agurugu Uturu Rd', lat: 4.87, lng: 6.9648 },
    { name: 'Jayogonna Ave', lat: 4.86995, lng: 6.9649 },
    { name: 'SureGuide Education Centre in Port Harcourt', lat: 4.870168, lng: 6.974349 },
    { name: 'Okunola Link Rd', lat: 4.86985, lng: 6.96505 },
    { name: 'Obamini Avenue', lat: 4.86982, lng: 6.9651 },
    { name: 'Rumukwuta street', lat: 4.873068, lng: 6.970612 },
    { name: 'Acmetechacademyltd', lat: 4.871146, lng: 6.969175 },
    { name: 'Ziblyn Oil', lat: 4.870439, lng: 6.96942 },
    { name: 'iPRESS LTD.', lat: 4.870182, lng: 6.97132 },
    { name: 'NNPC Gas Station Nkpolu', lat: 4.870812, lng: 6.971526 },
    { name: 'R.C.C.G MERCYLAND', lat: 4.870939, lng: 6.971649 },
    { name: 'Octopus car wash', lat: 4.870174, lng: 6.97237 },
    { name: 'Chicken Hills Nkpolu', lat: 4.868912, lng: 6.981277 },
    { name: 'Otogbo Ave', lat: 4.8697, lng: 6.9652 },
    { name: 'Owhonda Lane', lat: 4.8696, lng: 6.9653 },
    { name: 'Owhonda Close', lat: 4.8695, lng: 6.9654 },
    { name: "St Jude's Catholic Church", lat: 4.8694, lng: 6.9656 },
    { name: 'NTA Apara Link Rd', lat: 4.869832, lng: 6.975083 },
    { name: 'Wherelse', lat: 4.869808, lng: 6.975193 },
    { name: 'Mobil Station Nkpolu', lat: 4.86973, lng: 6.975376 },
    { name: 'SDD - Mercyland, E - W Road', lat: 4.869778, lng: 6.97617 },
    { name: 'MAFORIS EVENTS CENTRE', lat: 4.86942, lng: 6.976424 },
    { name: 'Born Stars International School', lat: 4.869517, lng: 6.97666 },
    { name: 'Port Harcourt Behavioral Health Clinic', lat: 4.869801, lng: 6.976561 },
    { name: 'Conoil Station Nkpolu', lat: 4.869894, lng: 6.977894 },
    { name: 'Mercyland Specialist Hospital', lat: 4.869325, lng: 6.978328 },
    { name: 'Planet Oil', lat: 4.869734, lng: 6.979076 },
    { name: 'Lavi Pharmacy', lat: 4.86924, lng: 6.979286 },
    { name: 'Literesults Services', lat: 4.869181, lng: 6.979817 },
    { name: 'Keton Technology', lat: 4.869408, lng: 6.980278 },
    { name: 'Nkpolu bus stop Port Harcourt', lat: 4.869566, lng: 6.980686 },
    { name: 'NKPOLU JUNCTION PARK', lat: 4.869617, lng: 6.980868 },
    { name: 'SDD - Nkpolu Junction E - W Road', lat: 4.869446, lng: 6.980805 },
    { name: 'Guru Nkpolu Road', lat: 4.869622, lng: 6.980919 },
    { name: 'Obiwali Rd', lat: 4.868788, lng: 6.981098 },
    { name: 'CRYSTAL EVANGELICAL MISSION', lat: 4.868656, lng: 6.982546 },
    { name: "Christ Chosen Church Of God Int'l", lat: 4.869414, lng: 6.983012 },
    { name: 'EJ Haris Complex', lat: 4.86869, lng: 6.983653 },
    { name: 'LOGOS ROYAL ACADEMY', lat: 4.869168, lng: 6.983879 },
    { name: 'Salvation Avenue', lat: 4.86968, lng: 6.983954 },
    { name: 'U D Uko Petrol', lat: 4.868792, lng: 6.984179 },
    { name: 'House 1', lat: 4.868425, lng: 6.984446 },
    { name: 'Total Fuel Station Nkpolu', lat: 4.868952, lng: 6.986059 },
    { name: 'Dantown', lat: 4.86823, lng: 6.986518 },
    { name: 'Atlantic Herald School', lat: 4.867727, lng: 6.986053 },
    { name: 'BENEJAF INTERNATIONAL LIMITED', lat: 4.868662, lng: 6.988103 },
    { name: 'Shallom Hospital', lat: 4.867753, lng: 6.987486 },
    { name: 'RCCG City of Favour Port Harcourt', lat: 4.867443, lng: 6.988462 },
    { name: 'TotalEnergies East West Road Service Station', lat: 4.868545, lng: 6.990045 },
    { name: 'Compass International School', lat: 4.868856, lng: 6.990534 },
    { name: 'First Bank - Port Harcourt Rumuokoro Branch', lat: 4.867095, lng: 6.990483 },
    { name: 'Fasthire Services', lat: 4.868066, lng: 6.990527 },
    { name: "Kabaka Global Int'l Company Ltd", lat: 4.868332, lng: 6.99239 },
    { name: 'Zenith Bank Rumuokoro', lat: 4.868127, lng: 6.992763 },
    { name: 'Access Bank Plc Ph, Rumuokoro East - West Road', lat: 4.868345, lng: 6.993101 },
    { name: 'Balm of Gilead Homecare limited', lat: 4.86779, lng: 6.992985 },
    { name: 'Fidelity bank Rumuokoro', lat: 4.867439, lng: 6.99346 },
    { name: 'First Bank of Nigeria Limited - Portharcourt', lat: 4.867238, lng: 6.993799 },
    { name: 'Chicken Republic - Rumuokoro', lat: 4.867926, lng: 6.99451 },
    { name: 'ZAMAC TRANSPORT LTD', lat: 4.867209, lng: 6.994423 },
    { name: 'Rumuokoro Motor Park', lat: 4.867054, lng: 6.99454 },
    { name: 'Accion Microfinance Bank', lat: 4.868042, lng: 6.994916 },
    { name: 'Jomac Paints & Allied Chemicals Ind. Ltd.', lat: 4.867731, lng: 6.995974 },
    { name: 'SDD - Rumuokoro Junction', lat: 4.866948, lng: 6.997184 },
    { name: 'Emmanuel Anglican Church', lat: 4.866827, lng: 6.997198 },
    { name: 'Rumuaghaolu Road', lat: 4.867352, lng: 6.997635 },
    { name: 'Rumuokoro Flyover', lat: 4.863889, lng: 6.972222 },
  ];
  // Rumuokoro to Eliozu landmarks

  const rumuokoroToEliozuLandmarks = [
    // RUMUOKORO JUNCTION AREA
    { name: 'SDD - Rumuokoro Junction', lat: 4.866922, lng: 6.997138 },
    { name: 'PEACE MASS TRANSIT Park', lat: 4.867544, lng: 6.998354 },
    { name: 'Eligbolo Street', lat: 4.867029, lng: 6.998843 },
    { name: 'G. Agofure Motors', lat: 4.867115, lng: 6.999383 },
    { name: 'Sosils Logistics', lat: 4.866879, lng: 6.999682 },
    { name: 'Green Bands Pharmacy', lat: 4.86664, lng: 6.998375 },
    { name: 'Goodness and mercy mass transit', lat: 4.866487, lng: 6.999056 },
    { name: 'BB company', lat: 4.8623, lng: 6.9762 },
    { name: 'Ogename Pharmacy', lat: 4.862, lng: 6.977 },
    { name: 'TSK-G Pharmacy', lat: 4.866445, lng: 7.000734 },
    { name: 'Mbarie Services (NIG) LTD', lat: 4.8614, lng: 6.9786 },
    { name: 'Vet planet veterinary center', lat: 4.8611, lng: 6.9794 },
    { name: 'Bark Arena Pet Grooming Facility', lat: 4.8608, lng: 6.9802 },
    { name: 'Tech Mobile Integrated Service', lat: 4.8605, lng: 6.981 },

    // EAST-WEST ROAD CORRIDOR
    { name: 'Bori Camp Rd', lat: 4.865371, lng: 7.006987 },
    { name: '10 Ahoada East - West Rd', lat: 4.866261, lng: 7.002982 },
    { name: 'GT Bank', lat: 4.866341, lng: 7.003237 },
    { name: 'GTbank ATM', lat: 4.866461, lng: 7.003342 },
    { name: 'Den-bec Group Of Schools', lat: 4.866368, lng: 7.003862 },
    { name: 'Discovery assembly', lat: 4.866242, lng: 7.004189 },
    { name: 'Den-Bec Event Place', lat: 4.866734, lng: 7.003905 },
    { name: 'IJMB', lat: 4.865601, lng: 7.0049 },

    // ALHAJIA ESTATE AREA
    { name: 'Alhajia Estate', lat: 4.866253, lng: 7.004541 },
    { name: 'Winners Chapel', lat: 4.866116, lng: 7.005503 },
    { name: 'Hodex Gas', lat: 4.865881, lng: 7.006764 },
    { name: 'Oma Chi Street', lat: 4.866381, lng: 7.006873 },
    { name: 'No Slack Motors', lat: 4.8577, lng: 6.9857 },
    { name: 'Royal Guest House', lat: 4.865872, lng: 7.007341 },
    { name: 'Wisdom Gate School (Campus 2)', lat: 4.865916, lng: 7.0084 },
    { name: 'The Young Shall Grow Motors Limited', lat: 4.865383, lng: 7.008788 },
    { name: 'Franksele Academy', lat: 4.865256, lng: 7.00886 },
    { name: 'Uni-Ike', lat: 4.8562, lng: 6.9897 },
    { name: "Amanda's fashion collection", lat: 4.8559, lng: 6.9905 },
    { name: 'Megastar Technical & Construction Company', lat: 4.864622, lng: 7.008988 },
    { name: 'Mifoods', lat: 4.8553, lng: 6.9921 },
    { name: 'Chisco Bush Bar', lat: 4.855, lng: 6.9929 },

    // APPROACHING ELIOZU
    { name: 'Chisco', lat: 4.864501, lng: 7.010264 },
    { name: 'Kotec Brick Tiles', lat: 4.863975, lng: 7.010073 },
    { name: 'The Church of Jesus Christ of Latter-day Saints', lat: 4.864861, lng: 7.011018 },
    { name: 'De Chico Group', lat: 4.864021, lng: 7.011224 },
    { name: 'CakesbySucre', lat: 4.8538, lng: 6.9961 },
    { name: 'BANDITOS LOUNGE SPORTS BAR', lat: 4.863341, lng: 7.011316 },
    { name: 'ShopBy Online Mall', lat: 4.8524, lng: 6.9952 },

    // PEACE ESTATE AREA
    { name: 'Peace Estate', lat: 4.863016, lng: 7.012074 },
    { name: 'Bellberry', lat: 4.8521, lng: 6.996 },
    { name: 'TOC CANADA', lat: 4.8518, lng: 6.9968 },
    { name: 'Arecent Solutions', lat: 4.8515, lng: 6.9976 },
    { name: 'Clendac Oil', lat: 4.862777, lng: 7.012607 },
    { name: 'UZOGUD', lat: 4.8509, lng: 6.9992 },
    { name: 'Lawban Media and PR', lat: 4.8506, lng: 7 },
    { name: 'Genton Integrated World Ltd', lat: 4.862614, lng: 7.013812 },
    { name: 'Shortlet Homes Port Harcourt', lat: 4.862379, lng: 7.01408 },
    { name: 'Grace Covenant Ministries', lat: 4.862039, lng: 7.013747 },
    { name: 'Ihunda Lane', lat: 4.861946, lng: 7.014076 },
    { name: 'INEC', lat: 4.8494, lng: 7.0032 },
    { name: 'AEC AGROSYSTEMS', lat: 4.8491, lng: 7.004 },
    { name: '619 LOUNGE & BAR', lat: 4.862128, lng: 7.014929 },
    { name: 'City Roller transport company', lat: 4.861943, lng: 7.015007 },
    { name: 'Richoak Montessori School', lat: 4.861716, lng: 7.015551 },
    { name: 'ROYAL LINK', lat: 4.8482, lng: 7.0064 },
    { name: 'Rhemluxe Global Limited', lat: 4.861577, lng: 7.015473 },
    { name: 'Chisco Transport Nigeria Limited', lat: 4.861243, lng: 7.016195 },
    { name: 'Ekulema Gardens Estate', lat: 4.860968, lng: 7.015573 },
    { name: 'Wholeman Hospital', lat: 4.8476, lng: 7.008 },
    { name: 'Evangel Medical Laboratory', lat: 4.8473, lng: 7.0088 },
    { name: 'Tribel Global Motors', lat: 4.860818, lng: 7.01706 },
    { name: 'Nkpologwu Unity Hall', lat: 4.860478, lng: 7.016144 },
    { name: 'Phase 2', lat: 4.860444, lng: 7.016559 },
    { name: 'Rukpakwolusi', lat: 4.860638, lng: 7.018145 },
    { name: 'T.G.M MOSQUE', lat: 4.86031, lng: 7.017327 },
    { name: 'Phase 2 Eliozu', lat: 4.859876, lng: 7.017756 },
    { name: 'Anna Medical Centre', lat: 4.8458, lng: 7.0128 },
    { name: 'Almighty Favour Hospital', lat: 4.85978, lng: 7.018325 },
    { name: 'GN Layout', lat: 4.859322, lng: 7.018699 },
    { name: 'Umenco Oil', lat: 4.859428, lng: 7.019602 },
    { name: 'Eligbolo Street Eliozu', lat: 4.860564, lng: 7.018559 },
    { name: "The Lord's Chosen", lat: 4.859303, lng: 7.019928 },
    { name: 'The Life Plus Community Church', lat: 4.845556, lng: 7.003889 },
    { name: 'Ilorin Glory Motors', lat: 4.859719, lng: 7.020609 },
    { name: "Jehovah Rapha's Clinics", lat: 4.8454, lng: 7.0046 },
    { name: 'Cossel Construction Company Nigeria', lat: 4.859228, lng: 7.020514 },
    { name: 'Desicon Engineering Limited', lat: 4.8451, lng: 7.0054 },
    { name: 'The Great And Mighty Universal Standard Ltd', lat: 4.859712, lng: 7.020757 },
    { name: 'RE-BEST ENTERPRISE', lat: 4.8448, lng: 7.0062 },
    { name: 'Umenco Oil', lat: 4.8445, lng: 7.007 },
    { name: "The Lord's Chosen Eliozu", lat: 4.8442, lng: 7.0078 },
    { name: 'Dj emmmzeal entertainment', lat: 4.859616, lng: 7.021896 },
    { name: 'Elizou bustop', lat: 4.859293, lng: 7.021381 },
    { name: 'Miracle Electrical Services Limited', lat: 4.8439, lng: 7.0086 },
    { name: 'Echema Hotels', lat: 4.859841, lng: 7.021327 },
    { name: 'Cossel Construction Company Nigeria', lat: 4.8436, lng: 7.0094 },
    { name: 'ABC Transport', lat: 4.860081, lng: 7.021673 },
    { name: 'De-Amicable Global Communications', lat: 4.8433, lng: 7.0102 },
    { name: 'ABC Bus Park', lat: 4.859958, lng: 7.021665 },
    { name: 'Echema Hotels', lat: 4.843, lng: 7.011 },
    { name: 'Donkaycee Pharmacy', lat: 4.860322, lng: 7.021086 },
    { name: 'Eliogbolo Rd', lat: 4.860989, lng: 7.020764 },
    { name: 'Eliozu Road', lat: 4.861194, lng: 7.021353 },
    {
      name: 'Dunamis international Gospel center Eloizu,Port harcourt',
      lat: 4.861162,
      lng: 7.020798,
    },
    { name: 'Skyfall Mega Lounge', lat: 4.845556, lng: 7.003889 },
  ];

  // Eliozu to Airforce landmarks

  const eliozuToAirforceLandmarks = [
    // ELIOZU JUNCTION AREA
    { name: 'Elizou bustop', lat: 4.859293, lng: 7.021381 },
    { name: 'Eliozu Junction', lat: 4.845556, lng: 7.003889 },
    { name: 'Pipeline Rd', lat: 4.858968, lng: 7.020739 },
    { name: 'WhypeMasters', lat: 4.858489, lng: 7.021775 },
    { name: 'Harmony street', lat: 4.856713, lng: 7.022555 },
    { name: 'The Bridge Event Place', lat: 4.857748, lng: 7.021838 },
    { name: 'Pasture Of Freedom Ministries Eliozu', lat: 4.857431, lng: 7.022123 },
    { name: 'Thrive Technologies Nig', lat: 4.8452, lng: 7.0045 },
    { name: 'Daba Ave', lat: 4.857177, lng: 7.022034 },
    { name: 'DABA MINISTRY NIGERIA', lat: 4.857236, lng: 7.021943 },
    { name: 'DansVille Catering & Event Services', lat: 4.857238, lng: 7.022716 },
    { name: 'SUPERCITY MARKET', lat: 4.856851, lng: 7.023008 },
    { name: 'Mount On Ave', lat: 4.856814, lng: 7.02322 },
    { name: 'RICH OAK INTERNATIONAL SCHOOL', lat: 4.856493, lng: 7.021833 },
    { name: 'fothkings Ventures Nig.Ltd', lat: 4.855636, lng: 7.023235 },
    { name: 'Nyeweibos Cl', lat: 4.855763, lng: 7.023318 },
    { name: 'Aku Road', lat: 4.8428, lng: 7.0093 },
    { name: 'Mercy Cl', lat: 4.8424, lng: 7.0101 },
    { name: 'Pipeline Rd Airforce', lat: 4.842, lng: 7.0109 },
    { name: 'Wellness therapy', lat: 4.8416, lng: 7.0117 },
    { name: 'GN Layout Eliozu', lat: 4.853563, lng: 7.01998 },
    { name: 'Myrtle International School', lat: 4.852496, lng: 7.020385 },
    { name: 'GOLDEN CROWN PHARMACY', lat: 4.852629, lng: 7.019606 },
    { name: 'SDD - GU Ake/Obasanjo Bypass', lat: 4.852363, lng: 7.018898 },

    // OBASANJO BYPASS AREA
    { name: 'Apex Hilton Hotel', lat: 4.841111, lng: 7.008333 },
    { name: 'Kienkares International Fashion Accessories', lat: 4.8408, lng: 7.0091 },
    { name: 'Pacesetters Christian Assembly', lat: 4.8404, lng: 7.0099 },
    { name: 'Diplomat Ave', lat: 4.84, lng: 7.0107 },
    { name: 'Brockville Montessori School', lat: 4.8396, lng: 7.0115 },
    { name: 'Gift Legate', lat: 4.8392, lng: 7.0123 },
    { name: 'Legal Clique Law Firm', lat: 4.8388, lng: 7.0131 },
    { name: 'Myrtle International School Bypass', lat: 4.8384, lng: 7.0139 },
    { name: 'SDD - GU Ake/Obasanjo Bypass', lat: 4.838, lng: 7.0147 },
    { name: 'Gtext Holdings Port Harcourt', lat: 4.8376, lng: 7.0155 },
    { name: 'Krystal academy', lat: 4.8372, lng: 7.0163 },
    { name: 'Esthycollections', lat: 4.8368, lng: 7.0171 },

    // CITY CENTRE/GOVERNMENT AREA
    { name: 'City Centre', lat: 4.848924, lng: 7.014619 },
    { name: 'RIVERS STATE SECRETARIAT', lat: 4.84647, lng: 7.015564 },
    { name: 'Toa Hub Rd', lat: 4.846043, lng: 7.015078 },
    { name: 'Prepaid', lat: 4.845814, lng: 7.014856 },
    { name: 'Dr. Obi Wali International Conference Centre', lat: 4.843074, lng: 7.01372 },
    { name: 'City Centre Main', lat: 4.84158, lng: 7.014809 },
    { name: 'Garden City Terminal', lat: 4.8415, lng: 7.015555 },
    { name: 'Valentino Swiss Hotel and Apartment', lat: 4.841308, lng: 7.013892 },
    { name: 'NAFOWA MULTI-PURPOSE HALL', lat: 4.840613, lng: 7.015068 },
    { name: 'SDD - Pleasure Park', lat: 4.839325, lng: 7.013977 },
    { name: 'RIVERS STATE ICT DEPARTMENT', lat: 4.8361, lng: 7.013893 },
    { name: 'AQUA KING AQUATICS LIMITED', lat: 4.835846, lng: 7.014662 },
    { name: 'n12 LOUNGE', lat: 4.834953, lng: 7.013586 },

    // STADIUM ROAD/AIRFORCE AREA
    { name: 'Global shaves', lat: 4.836667, lng: 7.013889 },
    { name: 'Dignity metal fabrication/Welding', lat: 4.8364, lng: 7.0147 },
    { name: 'Progressive brothers club of Port Harcourt', lat: 4.836, lng: 7.0155 },
    { name: 'Toa Rd', lat: 4.8356, lng: 7.0163 },
    { name: 'Port Harcourt - Aba Expy', lat: 4.8352, lng: 7.0171 },
    { name: 'PA TABLE WATER COMPANY', lat: 4.8348, lng: 7.0179 },
    { name: 'Prince Amadi Cl', lat: 4.833935, lng: 7.015596 },
    { name: 'MTN Shop-Benjack Port Harcourt', lat: 4.834084, lng: 7.01554 },
    { name: 'Red Star Express', lat: 4.834309, lng: 7.015406 },
    { name: 'Benjack Group', lat: 4.834542, lng: 7.015813 },
    { name: 'SIM UNI-EDUCATION SERVICES', lat: 4.834897, lng: 7.016009 },
    { name: 'Oak Park and Garden', lat: 4.835589, lng: 7.015626 },
    { name: 'House of Bole Barbecue', lat: 4.835421, lng: 7.015274 },
    { name: "The King's Assembly", lat: 4.835386, lng: 7.016444 },
    { name: 'Happy Bite', lat: 4.835752, lng: 7.017063 },
    { name: 'Air Force', lat: 4.833333, lng: 7.016667 },
    { name: 'Aiforce bus stop', lat: 4.835845, lng: 7.016711 },
    { name: 'Airforce junction', lat: 4.835759, lng: 7.016739 },
    { name: 'SIM UNI-EDUCATION SERVICES Main', lat: 4.834868, lng: 7.015995 },
    { name: 'Happy bite complex', lat: 4.835962, lng: 7.017669 },
    { name: 'Guarantee Trust Bank ATM', lat: 4.836009, lng: 7.017621 },
    { name: 'Stadium Rd', lat: 4.8339, lng: 7.0177 },
    { name: 'OK HONDA/ ACCURA AUTO SERVICES', lat: 4.837993, lng: 7.014582 },
    { name: 'GUO Transport Co. - Port Harcourt', lat: 4.835937, lng: 7.018002 },
    { name: 'Big Treat Shopping mall', lat: 4.8335, lng: 7.0185 },
    { name: 'Haier Thermocool Showroom', lat: 4.835914, lng: 7.018464 },
    { name: 'Arochukwu Street', lat: 4.835933, lng: 7.019884 },
    { name: 'Hemels Projects', lat: 4.836015, lng: 7.019835 },
    { name: 'MasParts Technology Apple Store', lat: 4.8327, lng: 7.0201 },
    { name: 'Solar Electricity International BTRXLEE VENTURES', lat: 4.836128, lng: 7.020476 },
    { name: 'Arvel Travel and Tours', lat: 4.8323, lng: 7.0209 },
    { name: 'SHOPRITE', lat: 4.835833, lng: 7.020598 },
    { name: 'Filmhouse Cinemas - Garden City', lat: 4.835833, lng: 7.020598 },
    { name: 'Oak Park and Garden', lat: 4.8319, lng: 7.0217 },
    { name: 'House of Bole Barbecue', lat: 4.8315, lng: 7.0225 },
    { name: 'PAN MEDICAL LABORATORIES', lat: 4.836792, lng: 7.022545 },
    { name: "The King's Assembly", lat: 4.8311, lng: 7.0233 },
    { name: 'Samsung Electronics World', lat: 4.837501, lng: 7.024491 },
    { name: 'Jumbo Sports Mart', lat: 4.8307, lng: 7.0241 },
    { name: 'DIVINE CARE', lat: 4.837606, lng: 7.024569 },
    { name: 'Mystique Press Limited', lat: 4.8303, lng: 7.0249 },
    { name: 'Greenlife Herbals', lat: 4.838027, lng: 7.024973 },
    { name: 'Benjack Group', lat: 4.8299, lng: 7.0257 },
    { name: 'Market road', lat: 4.83817, lng: 7.025867 },
    { name: 'Onealpha Ryde', lat: 4.8295, lng: 7.0265 },
    { name: 'Royal Avenue Estate', lat: 4.838405, lng: 7.026017 },
    { name: 'Red Star Express', lat: 4.8291, lng: 7.0273 },
    { name: 'Genesis Restaurant - Rumuomasi', lat: 4.838022, lng: 7.025545 },
    { name: 'MTN Shop-Benjack Port Harcourt', lat: 4.8287, lng: 7.0281 },
    { name: 'Air force market', lat: 4.838573, lng: 7.025827 },
    { name: 'Prince Amadi Cl', lat: 4.8283, lng: 7.0289 },
    { name: 'Ozone Batteries and Solar Systems Limited', lat: 4.8388, lng: 7.026571 },
    { name: 'Cherice Garden Hotel Annex', lat: 4.8279, lng: 7.0297 },
    { name: 'Liquid Bulk Petrol Station', lat: 4.83825, lng: 7.026273 },
    { name: 'Rosa Mysterium Pharmacy & Stores Ltd', lat: 4.838466, lng: 7.026251 },
    { name: 'Etim Okpoyo Close', lat: 4.839773, lng: 7.029648 },
    { name: 'Louis Chambers', lat: 4.839809, lng: 7.029926 },
    { name: 'Globe Motors Holdings (Nig) Limited', lat: 4.840235, lng: 7.030558 },
    { name: 'Ekere Street', lat: 4.840209, lng: 7.030611 },
  ];

  // Rumuokoro to Mile 1 landmarks (long route)
  // Updated Rumuokoro to Mile 1/Education landmarks with 6 decimal places

  const rumuokoroToMile1Landmarks = [
    // RUMUOKORO JUNCTION AREA
    { name: 'SDD - Rumuokoro Junction', lat: 4.866922, lng: 6.997188 },
    { name: 'Emmanuel Anglican Church', lat: 4.866831, lng: 6.997212 },
    { name: 'FCMB IKWERRE II BRANCH', lat: 4.866647, lng: 6.997641 },
    { name: 'Wilson Pharmacy', lat: 4.866516, lng: 6.99769 },
    { name: 'Deli Spices Restaurant', lat: 4.866371, lng: 6.997336 },
    { name: 'Bet9ja', lat: 4.866219, lng: 6.997329 },
    { name: 'Access Bank', lat: 4.86596, lng: 6.997376 },
    { name: 'Anointed Treasure Ministries (ATM)', lat: 4.8617, lng: 6.9778 },
    { name: 'Bestman Adult Educational center', lat: 4.865444, lng: 6.996724 },
    { name: 'Bob Izua Motors', lat: 4.865321, lng: 6.996376 },
    { name: 'Origin Appliances', lat: 4.865205, lng: 6.996493 },
    { name: 'NEOLIFE Healthcare', lat: 4.864886, lng: 6.99581 },
    { name: 'United Bank for Africa', lat: 4.86498, lng: 6.995889 },
    { name: 'FCMB RUMUOKORO BRANCH', lat: 4.864694, lng: 6.995662 },
    { name: 'Celestial Church Of Christ, Parish 2', lat: 4.8599, lng: 6.9826 },
    { name: 'Klein Graphics', lat: 4.8596, lng: 6.9834 },
    { name: 'RCCG Jesus Arena', lat: 4.864108, lng: 6.995311 },
    {
      name: 'GNLD PRODUCTS AND NEOLIFE - Vitamin & supplements store',
      lat: 4.863797,
      lng: 6.995693,
    },
    { name: 'For Divas Hair And Beauty Zone', lat: 4.86361, lng: 6.99554 },
    { name: "Lord's Major Pharmacy Ltd", lat: 4.863435, lng: 6.995465 },
    { name: 'Harrison Oil', lat: 4.863044, lng: 6.995441 },
    { name: 'Tamcy4Eva', lat: 4.85631, lng: 6.992969 },
    { name: 'Crystal Dew Integrated Services', lat: 4.856088, lng: 6.992928 },

    // FEDERAL INSTITUTIONS AREA
    { name: 'Federal Government College, Port Harcourt', lat: 4.862336, lng: 6.9905 },
    { name: 'Hq 29 bn, porthacourt', lat: 4.860577, lng: 7.001752 },

    // RESIDENTIAL/COMMERCIAL AREAS
    { name: 'Amaka Hair Dressing Salon', lat: 4.860456, lng: 6.993661 },
    { name: 'JD Stiches', lat: 4.858215, lng: 6.994 },
    { name: 'Princekin Hotel', lat: 4.857613, lng: 6.99319 },
    { name: 'Elvine Collection Thriftstore', lat: 4.857752, lng: 6.993398 },
    { name: 'Mgbuike Hall', lat: 4.857173, lng: 6.993004 },
    { name: 'MagicGlow Beauty salon', lat: 4.857214, lng: 6.993128 },
    { name: 'Jxeptional Conceptz', lat: 4.856697, lng: 6.992999 },
    { name: 'Eze & Sons Shop', lat: 4.856663, lng: 6.993016 },
    { name: 'Etu Cl street', lat: 4.855923, lng: 6.992839 },
    { name: 'Benniez Global Enterprise', lat: 4.855441, lng: 6.992705 },
    { name: 'CLASSIC MARTHA DATA PLUS', lat: 4.855214, lng: 6.993071 },
    { name: 'Kabos Investment', lat: 4.855234, lng: 6.992541 },
    { name: 'Hydropet Filling Station', lat: 4.854006, lng: 6.992158 },
    { name: 'Aldersupport', lat: 4.853469, lng: 6.992316 },
    { name: 'Emmzybeatzz Recording Studio', lat: 4.853365, lng: 6.991986 },
    { name: "Luk's Lounge", lat: 4.853638, lng: 6.992112 },
    { name: 'Calabar Kitchens Delicious Food', lat: 4.853577, lng: 6.991949 },
    { name: 'MCC Operational Base', lat: 4.853267, lng: 6.992256 },
    { name: 'P Hair Plaza', lat: 4.853203, lng: 6.992316 },
    { name: 'Chidi-Rich Integrated Business Limited', lat: 4.853041, lng: 6.99192 },
    { name: 'Evergreen Shopping Centre', lat: 4.85288, lng: 6.992152 },
    { name: 'Hikvision', lat: 4.852693, lng: 6.991536 },
    { name: 'Maichini Beauty Home', lat: 4.852587, lng: 6.991741 },
    { name: 'Achistan diapers and more', lat: 4.85249, lng: 6.991751 },
    { name: 'Evelyn Natural Hair Beauty Salon', lat: 4.852564, lng: 6.992061 },
    { name: 'L 37 Global Pharmacy', lat: 4.852171, lng: 6.991604 },
    { name: 'Ifex Express Limited', lat: 4.852015, lng: 6.99183 },
    { name: 'BetQja', lat: 4.851746, lng: 6.991808 },
    { name: 'Foundation Marble & Granite Company Ltd', lat: 4.85157, lng: 6.991446 },
    { name: 'Deehairven', lat: 4.851558, lng: 6.991708 },
    { name: 'Henzor', lat: 4.851423, lng: 6.99143 },
    { name: 'Worlu Street intersection', lat: 4.851157, lng: 6.991561 },
    { name: 'Eterna', lat: 4.850981, lng: 6.991583 },
    { name: 'The Europe Shop Intl Shopping mall', lat: 4.850635, lng: 6.991532 },
    { name: 'Lavished Grace Assembly', lat: 4.850703, lng: 6.991261 },
    { name: 'Benzolin ventures Shopping mall', lat: 4.850368, lng: 6.991203 },
    { name: 'BLESSED FRANK SPARMARKET', lat: 4.850228, lng: 6.991442 },

    // RUMUGBO AREA
    { name: 'Rumugbo Primary Health Centre', lat: 4.850079, lng: 6.991005 },
    { name: 'Rumugbo Civic Centre Hall', lat: 4.849449, lng: 6.990875 },
    { name: 'Blessed Medicine Store & Cosmetics', lat: 4.849516, lng: 6.991319 },
    { name: 'Links Empire Fashion Hub', lat: 4.849855, lng: 6.991366 },
    { name: 'Church of Christ', lat: 4.8521, lng: 7.0034 },
    { name: 'David Veterinary Centre', lat: 4.848985, lng: 6.991187 },
    { name: "Val's Medical Stores", lat: 4.848885, lng: 6.991114 },
    { name: 'God Tex Aluminium Centre', lat: 4.848698, lng: 6.990683 },
    { name: 'UandU Electronics Electronics store', lat: 4.848603, lng: 6.990824 },
    { name: 'Foursquare Gospel Church', lat: 4.84855, lng: 6.990807 },
    { name: 'Chommy Delight', lat: 4.848375, lng: 6.990572 },
    { name: 'Everyday Supamakett Port Harcourt', lat: 4.84797, lng: 6.990265 },
    { name: 'Austino Technical Resources Limited', lat: 4.847925, lng: 6.990863 },
    { name: 'Bensolo electrical', lat: 4.793265, lng: 6.990682 },
    { name: 'Emmy J Cots', lat: 4.847587, lng: 6.990683 },
    { name: 'De Value Point Super Store', lat: 4.847487, lng: 6.990614 },
    { name: 'Rumuigbo Junction', lat: 4.84758, lng: 6.990298 },
    { name: 'Hisense', lat: 4.847109, lng: 6.990525 },
    { name: 'Hydropet', lat: 4.846833, lng: 6.990446 },
    { name: 'Wobo Lane intersection', lat: 4.846693, lng: 6.990408 },
    { name: 'Psychiatric Hospital Lane', lat: 4.846892, lng: 6.990401 },
    { name: 'Harwoj', lat: 4.846693, lng: 6.990408 },
    { name: 'Exousia Business Center & Cyber Cafe', lat: 4.846519, lng: 6.989979 },
    { name: 'Fasunanne Nigeria Limited', lat: 4.846378, lng: 6.990187 },
    { name: 'Queeneth Beauty Home', lat: 4.846202, lng: 6.990099 },
    { name: 'Classic Restaurant & Bar', lat: 4.846429, lng: 6.989909 },
    { name: 'Everyday Supermarket', lat: 4.846201, lng: 6.989813 },
    { name: 'Environmental office', lat: 4.845851, lng: 6.989857 },
    { name: 'Leading Fabrics', lat: 4.845952, lng: 6.989945 },
    { name: 'MARYDEE Couture Fashion accessories store', lat: 4.845644, lng: 6.989684 },
    { name: "Mel's Chaofan", lat: 4.845645, lng: 6.98946 },
    { name: 'Omega superstores', lat: 4.845537, lng: 6.989598 },
    { name: 'GOD LEAD RESTAURANT', lat: 4.845591, lng: 6.989644 },
    { name: 'Obiwali House', lat: 4.845359, lng: 6.989689 },
    { name: 'Ovuboyzdrip', lat: 4.845215, lng: 6.989392 },
    { name: 'Raazy Clothing Clothing store', lat: 4.84567, lng: 6.989401 },
    { name: 'Nice Up Beauty Complex', lat: 4.8494, lng: 7.0106 },
    { name: 'Rico foods cereals and beverages', lat: 4.8491, lng: 7.0114 },

    // RUMUAPARA/RUMUOKWUTA AREA
    { name: 'Holy Trinity Anglican Church Rumuapara', lat: 4.844719, lng: 6.988832 },
    { name: 'Nigerian brewery depot', lat: 4.844357, lng: 6.988955 },
    { name: '9mobile SIM Registration Centre', lat: 4.844297, lng: 6.988411 },
    { name: 'H O Signature', lat: 4.844098, lng: 6.988823 },
    { name: 'Anndora Bridal House Bridal shop', lat: 4.842683, lng: 6.988128 },
    { name: 'Seventh-day Adventist Church Rumuokwuta', lat: 4.842219, lng: 6.988434 },
    { name: 'Fountain of Power Christian Centre', lat: 4.84289, lng: 6.98846 },
    { name: 'Auto Clinicar Services', lat: 4.842416, lng: 6.988416 },
    { name: 'National Association of Adventist Corpers', lat: 4.842188, lng: 6.988117 },
    { name: 'Sam B Gadgets Hub', lat: 4.84193, lng: 6.988113 },
    { name: 'Starlight Jewelry & Accessories', lat: 4.841391, lng: 6.988038 },
    { name: "Annora's World Unisex Salon", lat: 4.841546, lng: 6.988403 },
    { name: 'Culture Crest Consult', lat: 4.841273, lng: 6.988436 },
    { name: 'Curls and Bangs', lat: 4.841251, lng: 6.988235 },
    { name: 'Oak View Hotel and Suites', lat: 4.840922, lng: 6.988384 },
    { name: 'Green Research Centre', lat: 4.840707, lng: 6.988366 },
    { name: 'Rehoboth Health and Emergency Response', lat: 4.840702, lng: 6.988238 },
    { name: 'Kent Investment Co. Ltd', lat: 4.847, lng: 7.017 },
    { name: 'EverAfter', lat: 4.8467, lng: 7.0178 },
    { name: 'Feliiz Xclusive Souvenirs Souvenir store', lat: 4.839912, lng: 6.987572 },
    { name: 'Chichis Place Unisex Salon', lat: 4.839912, lng: 6.988419 },
    { name: 'FLOMEN INTERNATIONAL SCHOOL', lat: 4.839786, lng: 6.988457 },
    { name: 'Fresh Gardens Export', lat: 4.839454, lng: 6.988346 },
    { name: 'Rab Resources', lat: 4.839551, lng: 6.988411 },
    { name: 'Obaco', lat: 4.83884, lng: 6.98819 },
    { name: 'SUMEC FIRMAN', lat: 4.838961, lng: 6.988472 },
    { name: 'Icon Mobile Technologies Cell phone store', lat: 4.838648, lng: 6.988539 },
    { name: 'The Eternal Sacred Order Of The Cherubim & Seraphim', lat: 4.838324, lng: 6.988179 },
    { name: 'Cee2Cee Cell phone store', lat: 4.83852, lng: 6.988131 },
    { name: 'Dovini Media Store', lat: 4.838106, lng: 6.988224 },
    { name: 'Bills Pharmacy Rumuokwuta', lat: 4.837992, lng: 6.988557 },
    { name: 'Orlu Market Road intersection', lat: 4.838199, lng: 6.988243 },
    { name: 'Chief Ok', lat: 4.837931, lng: 6.98817 },
    { name: 'Owhor Street', lat: 4.837867, lng: 6.987874 },
    { name: 'Jennys Secret', lat: 4.837526, lng: 6.98797 },
    { name: 'Success Super Stores', lat: 4.8455, lng: 7.021 },
    { name: 'Nice Up', lat: 4.837369, lng: 6.988066 },
    { name: 'GTCO', lat: 4.837363, lng: 6.987958 },
    { name: 'GTBank - GTExpress ATM', lat: 4.837238, lng: 6.987903 },

    // MILE 5 AREA
    { name: 'Kilimanjaro Restaurant Rumuokwuta', lat: 4.837227, lng: 6.988356 },
    { name: 'Quick Lube Automobile Services', lat: 4.837318, lng: 6.987747 },
    { name: 'AP Filling Station (Mile 5)', lat: 4.837081, lng: 6.987755 },
    { name: 'Freedom Hall', lat: 4.83706, lng: 6.987526 },
    { name: 'Vistige Office Port Harcourt', lat: 4.836945, lng: 6.98743 },
    { name: 'De Label Beauty Gallery', lat: 4.8446, lng: 7.0234 },
    { name: 'Kingdom Life Centre', lat: 4.836693, lng: 6.987827 },
    { name: 'Multinet', lat: 4.844, lng: 7.025 },
    { name: 'Engr Abdul Aminu', lat: 4.836247, lng: 6.987299 },
    { name: "Kingdom Hall Of Jehovah's Witnesses", lat: 4.835958, lng: 6.986848 },
    { name: 'EstateTown Hall', lat: 4.8437, lng: 7.0258 },
    { name: 'Ikegwuru Street', lat: 4.835993, lng: 6.98641 },
    { name: 'Nwakama Dredge Global', lat: 4.835718, lng: 6.987054 },
    { name: 'FIRSTLOVE Assembly', lat: 4.835672, lng: 6.986464 },
    { name: 'Jen-Edim Academic Dunamic Campus', lat: 4.8428, lng: 7.0282 },
    { name: 'Ab Artworld Ltd', lat: 4.835496, lng: 6.986762 },
    { name: 'GINACENT PHARMACY', lat: 4.8422, lng: 7.0298 },
    { name: 'GARDEN OF EDEN SUPERSTORES', lat: 4.835429, lng: 6.986266 },
    { name: 'Kala Street intersection', lat: 4.8419, lng: 7.0306 },
    { name: 'Kala Building Materials', lat: 4.835112, lng: 6.986219 },
    { name: 'Dabo House', lat: 4.835011, lng: 6.986312 },
    { name: 'Kala street', lat: 4.834932, lng: 6.986212 },
    { name: 'Kely_glow makeup studio', lat: 4.834864, lng: 6.98597 },
    { name: 'Dotnova Hotels Limited', lat: 4.835018, lng: 6.985875 },
    { name: 'Spring Hospital', lat: 4.8413, lng: 7.0322 },
    { name: 'Mouka Foam Depot', lat: 4.834935, lng: 6.985798 },
    { name: 'Lash55 Glam', lat: 4.841, lng: 7.033 },
    { name: 'Ugo Barbing Saloon', lat: 4.834757, lng: 6.985608 },
    { name: 'Blauvace Stores (Norland Stockist Center)', lat: 4.83468, lng: 6.985529 },
    { name: '9mobile SIM Registration Centre Mile 5', lat: 4.834513, lng: 6.985384 },
    { name: 'Police Station', lat: 4.834185, lng: 6.985417 },
    { name: 'Chief Cyprian Church & Co', lat: 4.83404, lng: 6.985448 },
    { name: 'Rumukirikum Market', lat: 4.8407, lng: 7.0338 },
    { name: 'The Nigeria Police Divisional Headquarters', lat: 4.834065, lng: 6.9848 },
    { name: 'Deeper Life Bible Church, Epirikom', lat: 4.8404, lng: 7.0346 },
    { name: 'Frank Mega Plus Cosmetics And Fragrances World', lat: 4.8338, lng: 6.985214 },
    { name: 'Onyiino Concepts', lat: 4.8401, lng: 7.0354 },
    { name: 'Total Petrol Station Mile 5', lat: 4.833729, lng: 6.984643 },
    { name: 'Proms beauty theater', lat: 4.833219, lng: 6.984186 },
    { name: 'MaRich Pharmacy', lat: 4.833263, lng: 6.984807 },
    { name: 'Deeper Life Bible Church, Epirikom, Ikwere', lat: 4.833219, lng: 6.984748 },
    { name: 'Beauty Goddess studio', lat: 4.833139, lng: 6.984499 },
    { name: 'Portharcourt petshop', lat: 4.83306, lng: 6.984469 },
    { name: 'Ejekwu St', lat: 4.832966, lng: 6.984536 },
    { name: 'Wobasi St', lat: 4.833388, lng: 6.984062 },
    { name: 'Dreadlocks innocent', lat: 4.832751, lng: 6.984127 },
    { name: 'Pollyfoam Depot', lat: 4.832671, lng: 6.984113 },
    { name: 'Salt and Pepper Restaurant and Bar', lat: 4.832628, lng: 6.983974 },
    { name: 'Lady´S Beauty', lat: 4.8328, lng: 6.983776 },
    { name: "Ogechi women's fashion", lat: 4.832776, lng: 6.983699 },
    { name: 'Ihunwo Street', lat: 4.832541, lng: 6.983629 },
    { name: 'Dominion Life Gate Intetnational School', lat: 4.832463, lng: 6.983741 },
    { name: 'Vicky4star Beauty Clinic', lat: 4.832555, lng: 6.983517 },
    { name: 'Global Fetch Collections', lat: 4.832484, lng: 6.983467 },
    { name: 'Nobel Carpets & Rugs Gallery', lat: 4.832376, lng: 6.983799 },
    { name: 'Nancees Confectionery wike street', lat: 4.832234, lng: 6.983663 },
    { name: 'Forte Oil', lat: 4.832205, lng: 6.983185 },
    { name: 'Alpha Crest Montessori Academy', lat: 4.8389, lng: 7.0386 },
    { name: 'Amber Consult LTD', lat: 4.832118, lng: 6.983556 },
    { name: 'Jerry shawarma', lat: 4.832014, lng: 6.983475 },
    { name: 'Tomak Pharmacy And Stores', lat: 4.831925, lng: 6.983404 },
    { name: 'Vee_NailsalonVee_Nailsalon', lat: 4.831872, lng: 6.983126 },
    { name: 'Frankdona Green Grass', lat: 4.831768, lng: 6.983223 },
    { name: 'Rumuepirikom Civic Centre', lat: 4.8383, lng: 7.0402 },
    { name: 'Frankdona Global Resources', lat: 4.831637, lng: 6.98314 },
    { name: 'Frankdona Global Resources - Carpets and Rugs', lat: 4.838, lng: 7.041 },
    { name: 'Mama Ewere Good Food', lat: 4.831566, lng: 6.98304 },
    { name: 'Game Villa Video game store', lat: 4.8377, lng: 7.0418 },
    { name: 'Ekani ave', lat: 4.831512, lng: 6.982616 },
    { name: "Saint Peter's Church, Rumuepirikom/Iwofe", lat: 4.8374, lng: 7.0426 },
    { name: 'Rerdwood & Ooak Legal Practitioners [Rerdwood-OLP]', lat: 4.831166, lng: 6.982702 },
    { name: 'NIMC ENROLLMENT CENTRE', lat: 4.8371, lng: 7.0434 },
    { name: 'Creamy Peak Ice-Cream Port Harcourt', lat: 4.831057, lng: 6.982415 },
    { name: 'Luxa Flair International Limited', lat: 4.8368, lng: 7.0442 },
    { name: 'Odoli street', lat: 4.831, lng: 6.982296 },
    { name: 'Betking Shop wimpy junction', lat: 4.829799, lng: 6.981759 },
    { name: 'Nyekwere TamunoTonye Tom', lat: 4.830906, lng: 6.98237 },
    { name: 'Mongoose-Life Community Church', lat: 4.8362, lng: 7.0458 },
    { name: 'GENEXT MOTORS', lat: 4.83085, lng: 6.982501 },
    { name: 'Midline Pharmacy', lat: 4.829383, lng: 6.981923 },
    { name: 'SETHCOM NIGERIA LIMITED', lat: 4.830799, lng: 6.982433 },
    { name: 'RCCG, KINGDOM CHAPEL', lat: 4.829137, lng: 6.981548 },
    { name: 'Kids & Mum Angles Warehouse', lat: 4.830753, lng: 6.982405 },
    { name: 'Blessed Glow', lat: 4.828612, lng: 6.981428 },
    { name: 'Rumupekim Plaza', lat: 4.830698, lng: 6.982369 },
    { name: 'Walmart organization', lat: 4.828712, lng: 6.981867 },
    { name: 'PARKER ELECTRONICS', lat: 4.830535, lng: 6.982258 },
    { name: 'Rumuapiri Primary Health Centre', lat: 4.8347, lng: 7.0498 },
    { name: '4Men Boutique', lat: 4.830447, lng: 6.98233 },
    { name: 'State Primary School Rumueme', lat: 4.828271, lng: 6.981375 },
    { name: 'Increase Golden Standard Limited', lat: 4.830389, lng: 6.982317 },
    { name: 'Mgbuike Town Hall', lat: 4.828199, lng: 6.981599 },
    { name: "Mabee's Restaurant", lat: 4.83022, lng: 6.981829 },
    { name: 'Manuchim Plaza Shopping mall', lat: 4.8338, lng: 7.0522 },
    { name: 'BLESSED AGU COLLECTIONS', lat: 4.830089, lng: 6.982076 },
    { name: 'Blessed Image and wealth', lat: 4.8335, lng: 7.053 },
    { name: "Mona's place ng", lat: 4.83001, lng: 6.982049 },
    { name: 'Union Bank ATM', lat: 4.826358, lng: 6.981108 },
    { name: 'Equity Supermarket', lat: 4.829902, lng: 6.982033 },
    { name: 'Onatex Furniture Showroom', lat: 4.825933, lng: 6.98112 },
    { name: 'Optimum Christo Light', lat: 4.830009, lng: 6.981735 },
    { name: 'Nze Joe & sons furniture showroom', lat: 4.825116, lng: 6.980953 },
    { name: 'Owabie Rd', lat: 4.82968, lng: 6.981932 },
    { name: 'Edugreen Schools', lat: 4.8323, lng: 7.0562 },
    { name: 'Ahunlele World', lat: 4.829681, lng: 6.981683 },
    { name: 'Chida Rd intersection', lat: 4.832, lng: 7.057 },
    { name: 'Exotic Superstores', lat: 4.829621, lng: 6.981616 },
    { name: 'Wellness Hub', lat: 4.8317, lng: 7.0578 },
    { name: 'JOHNEL BOUTIQUE', lat: 4.829465, lng: 6.981958 },
    { name: 'Mile 4 Mega Shop', lat: 4.822651, lng: 6.981005 },
    { name: 'Chinda Street', lat: 4.829374, lng: 6.981637 },
    { name: "St. Jerome's Chaplaincy Port Harcourt", lat: 4.82209, lng: 6.981166 },
    { name: 'FASHION FREAK EXCLUSIVE', lat: 4.829259, lng: 6.98158 },
    { name: 'Faith City Chapel International', lat: 4.820625, lng: 6.981509 },
    { name: 'Aneady', lat: 4.829196, lng: 6.981862 },
    { name: 'The Church of Christ, Mile 4, Rumueme', lat: 4.8305, lng: 7.061 },
    { name: 'Laundry Hub', lat: 4.829063, lng: 6.981511 },
    { name: 'Honeysparkles Bakery & Salon', lat: 4.8302, lng: 7.0618 },
    { name: "Zara's Collection", lat: 4.829, lng: 6.98152 },
    { name: 'Chitex Palace', lat: 4.8299, lng: 7.0626 },
    { name: 'Excel Cyber Cafe', lat: 4.828872, lng: 6.981783 },
    { name: 'Gambeta Groupe Limited', lat: 4.8296, lng: 7.0634 },
    { name: 'ERAZ DOZIE', lat: 4.828781, lng: 6.981644 },
    { name: 'CALL BOB NIGERIA Rent A Car', lat: 4.8293, lng: 7.0642 },
    { name: 'Shop "N" Save Supermarket', lat: 4.828825, lng: 6.981457 },
    { name: 'Tombia St intersection', lat: 4.829, lng: 7.065 },
    { name: 'Tyre World', lat: 4.828763, lng: 6.981442 },
    { name: '1001 Photography', lat: 4.8287, lng: 7.0658 },
    { name: 'Mimilicious Empire', lat: 4.82879, lng: 6.981733 },
    { name: 'RUMUEME CIVIC CENTRE', lat: 4.8284, lng: 7.0666 },
    { name: 'Oro Ogologo Hall', lat: 4.828486, lng: 6.981624 },
    { name: 'Chief Johnson St intersection', lat: 4.8281, lng: 7.0674 },
    { name: 'Epero Furnitures', lat: 4.828246, lng: 6.98166 },
    { name: 'Dominion City Church', lat: 4.818763, lng: 6.982639 },
    { name: 'Rumuchiolu Hall', lat: 4.828038, lng: 6.981646 },
    { name: 'Wide Choice Supermarket', lat: 4.81848, lng: 6.982512 },
    { name: 'Klaxic Marsyl Beauty Home', lat: 4.828089, lng: 6.98136 },
    { name: 'Mopelvis Pharmacy', lat: 4.818341, lng: 6.982579 },
    { name: 'ELITE PIERCE', lat: 4.82805, lng: 6.981341 },
    { name: 'Oro-Owo Community Town Hall', lat: 4.818012, lng: 6.983043 },
    { name: 'Hopevelli Kitchen', lat: 4.827984, lng: 6.981317 },
    { name: 'Henry Dc Medicals', lat: 4.81758, lng: 6.982896 },
    { name: 'BAMIRAS', lat: 4.827956, lng: 6.981601 },
    { name: 'NWANYI OKWUKWE PLAZA', lat: 4.8263, lng: 7.0722 },
    { name: 'Lucky Star Global Vitafoam Depot', lat: 4.827811, lng: 6.981616 },
    { name: 'Eco Bankport Harcourt', lat: 4.817203, lng: 6.983471 },
    { name: 'Divine Favour Superstores', lat: 4.827625, lng: 6.98143 },
    { name: 'Oroworukwo Mini Health Centre', lat: 4.81707, lng: 6.98369 },
    { name: 'SDD - Mile 4', lat: 4.82781, lng: 6.981144 },
    { name: 'Rivers State College of Health Science', lat: 4.816917, lng: 6.983416 },
    { name: 'Chief amadi street', lat: 4.827666, lng: 6.981301 },
    { name: 'Model Girls secondary school', lat: 4.815276, lng: 6.983304 },
    { name: 'Ekeninwor Road', lat: 4.827692, lng: 6.981823 },
    { name: 'Kilimanjaro Restaurant Agip Road', lat: 4.814162, lng: 6.983498 },
    { name: 'Healthy Lifestyle Services.', lat: 4.827272, lng: 6.981646 },
    { name: 'Access Bank Plc Agip Road Branch', lat: 4.813554, lng: 6.983625 },
    { name: 'Ibemerum Street', lat: 4.82607, lng: 6.980478 },
    { name: 'Chinda Oil', lat: 4.813265, lng: 6.983759 },
    { name: 'Eras - Dozie Global Resources Nig', lat: 4.825396, lng: 6.980959 },
    { name: 'OCEANIC HOMES AND INTERIORS', lat: 4.812905, lng: 6.983936 },
    { name: 'Flex fabric', lat: 4.824597, lng: 6.981088 },
    { name: 'Firstbank ATM', lat: 4.811787, lng: 6.984009 },
    { name: 'Slomandaz Furniture', lat: 4.82442, lng: 6.981151 },
    { name: 'Buyrite Sanitary & Bathroom accessories', lat: 4.811304, lng: 6.984302 },
    { name: 'Luchijanecouture', lat: 4.82437, lng: 6.981159 },
    { name: 'Frank Kelly Global', lat: 4.811134, lng: 6.984397 },
    { name: 'Pavlon hospital', lat: 4.824274, lng: 6.981145 },
    { name: 'Sherry Place', lat: 4.8224, lng: 7.0826 },
    { name: '11:30 bar', lat: 4.824217, lng: 6.981148 },
    { name: 'Isreal Hotels And Suites', lat: 4.8221, lng: 7.0834 },
    { name: 'Princeway Stores', lat: 4.824206, lng: 6.980878 },
    { name: 'Skene Motors Workshop', lat: 4.8218, lng: 7.0842 },
    { name: 'Chida Bus Stop', lat: 4.823616, lng: 6.980685 },
    { name: 'Delicious dishes', lat: 4.808402, lng: 6.98605 },
    { name: 'Aquamahn', lat: 4.823397, lng: 6.980976 },
    { name: 'Greenland Doors And Building Tech', lat: 4.8212, lng: 7.0858 },
    { name: 'Obiri Worgu Epara Chida', lat: 4.823369, lng: 6.980991 },
    { name: 'Nigeria Customs Service', lat: 4.807933, lng: 6.985881 },
    { name: 'Teekay Home & Office Furnishing Co', lat: 4.823397, lng: 6.981197 },
    { name: 'Aba-Ceorg Road intersection', lat: 4.8206, lng: 7.0874 },
    { name: 'Lucky & Bros Furniture', lat: 4.823043, lng: 6.981268 },
    { name: 'Fidelity Bank', lat: 4.807735, lng: 6.986243 },
    { name: 'Peaceko Ventures', lat: 4.822845, lng: 6.981018 },
    { name: 'Access Bank Plc Ph', lat: 4.82, lng: 7.089 },
    { name: 'BioSpec medical diagnostic centre', lat: 4.822686, lng: 6.980968 },
    { name: 'Rivers State Environmental', lat: 4.8197, lng: 7.0898 },
    { name: 'Worgumati St', lat: 4.822893, lng: 6.981323 },
    { name: 'Ring Petroleum', lat: 4.8194, lng: 7.0906 },
    { name: 'I.S.I Integrated Stylish Interior', lat: 4.822545, lng: 6.981308 },
    { name: 'His Grace Aluminium Company Limited', lat: 4.8191, lng: 7.0914 },
    { name: 'Dehabig Services Nigeria Limited', lat: 4.822608, lng: 6.98136 },
    { name: 'Rice world store', lat: 4.8188, lng: 7.0922 },
    { name: 'Okochi rd', lat: 4.822479, lng: 6.981251 },
    { name: 'Essential Services', lat: 4.8185, lng: 7.093 },
    { name: 'Chief Insirim Road', lat: 4.821708, lng: 6.981316 },
    { name: 'University Of Portharcourt', lat: 4.8182, lng: 7.0938 },
    { name: 'Yard', lat: 4.821323, lng: 6.981486 },
    { name: 'Genesis Restaurant, UST Roundabout', lat: 4.806981, lng: 6.987683 },
    { name: "Whitney's wine shop", lat: 4.821283, lng: 6.98151 },
    { name: 'College Of Continuing Education (Uniport)', lat: 4.8176, lng: 7.0954 },
    { name: 'Amaja Couture', lat: 4.821183, lng: 6.98154 },
    { name: 'State Primary School (Nkpolu)', lat: 4.806782, lng: 6.987922 },
    { name: 'Peace house restaurant and bar', lat: 4.821149, lng: 6.98155 },
    { name: 'Airtel Shop Cell phone store', lat: 4.817, lng: 7.097 },
    { name: 'Spot on car wash & bar', lat: 4.821111, lng: 6.981454 },
    { name: 'Nkpolu Oroworukwo Shopping Plaza', lat: 4.8167, lng: 7.0978 },
    { name: 'Editims Supermarket', lat: 4.821084, lng: 6.981299 },
    { name: 'Wechie St intersection', lat: 4.8164, lng: 7.0986 },
    { name: 'Able fit gym centre', lat: 4.821079, lng: 6.981468 },
    { name: 'Praise restaurant and bar', lat: 4.8161, lng: 7.0994 },
    { name: 'Kingspark Electronics', lat: 4.821011, lng: 6.981497 },
    { name: 'The Beautifiers Gym', lat: 4.806044, lng: 6.987906 },
    { name: 'Fourlas Empire Office', lat: 4.82086, lng: 6.981389 },
    { name: 'Mentlojane Super Store', lat: 4.8155, lng: 7.101 },
    { name: 'Grace lane', lat: 4.820879, lng: 6.981556 },
    { name: 'CHRIST REALM ASSEMBLY', lat: 4.8152, lng: 7.1018 },
    { name: 'Uks Upholstery', lat: 4.820879, lng: 6.981556 },
    { name: 'Lemekonsult Pharmacy', lat: 4.8149, lng: 7.1026 },
    { name: 'Tim Unique Furniture and Interior Services', lat: 4.820803, lng: 6.981777 },
    { name: 'Fresco Stores', lat: 4.8146, lng: 7.1034 },
    { name: 'Home Concept Furniture + Accessories', lat: 4.819748, lng: 6.981919 },
    { name: 'The Wisdom Center', lat: 4.8143, lng: 7.1042 },
    { name: 'Larpel Store Ng', lat: 4.819594, lng: 6.981998 },
    { name: 'CITY OF CHAMPIONS', lat: 4.805234, lng: 6.9888 },
    { name: 'Tombia St', lat: 4.819809, lng: 6.982266 },
    { name: 'Port Harcourt Medical Investigations Centre', lat: 4.805127, lng: 6.988854 },
    { name: 'Timeless Scissors', lat: 4.819429, lng: 6.981903 },
    { name: 'Adventist Nursery Basic Education', lat: 4.8134, lng: 7.1066 },
    { name: 'Kings Supermarket', lat: 4.819187, lng: 6.981969 },
    { name: 'Nike Art Gallery', lat: 4.8131, lng: 7.1074 },
    { name: 'Mouka Foam Authorized Distribution', lat: 4.818982, lng: 6.982526 },
    { name: 'Market Square Auto parts store', lat: 4.8128, lng: 7.1082 },
    { name: 'Milbert guest house', lat: 4.818801, lng: 6.982324 },
    { name: 'Elechi Road intersection', lat: 4.8125, lng: 7.109 },
    { name: 'Chibuike Rotimi Amaechi Rd', lat: 4.818803, lng: 6.982789 },
    { name: 'ANDY TECH', lat: 4.8122, lng: 7.1098 },
    { name: 'Ml-Signatures', lat: 4.817103, lng: 6.982995 },
    { name: 'Blessed Kendo Electronics', lat: 4.803814, lng: 6.989644 },
    { name: 'Ogoloma St', lat: 4.816605, lng: 6.982878 },
    { name: 'SDD - Mile 3 Park', lat: 4.803878, lng: 6.989981 },
    { name: 'Nigerian Law School,Port Harcourt', lat: 4.815294, lng: 6.985218 },
    { name: 'Wobo St intersection', lat: 4.8113, lng: 7.1122 },
    { name: 'Ketch Events', lat: 4.814708, lng: 6.984523 },
    { name: 'MRS(Filling Station)', lat: 4.802824, lng: 6.989953 },
    { name: 'Agip Rd/Agi[ junction', lat: 4.81387, lng: 6.98361 },
    { name: 'Tigerfoods', lat: 4.8107, lng: 7.1138 },
    { name: 'Sani Abacha Road', lat: 4.813808, lng: 6.98422 },
    { name: 'Maiduguri St intersection', lat: 4.8104, lng: 7.1146 },
    { name: 'Blessed Kizzi Global Resources', lat: 4.812645, lng: 6.983944 },
    { name: 'Ojiegbu St intersection', lat: 4.8101, lng: 7.1154 },
    { name: 'Nigerian Correctional Service Rivers State Command', lat: 4.812915, lng: 6.984963 },
    { name: 'Delta Express Ltd - Port Harcourt Mile 2 Terminal', lat: 4.801467, lng: 6.99042 },
    { name: 'Michael Wogbo Hall', lat: 4.811937, lng: 6.984093 },
    { name: 'Oando Station', lat: 4.8095, lng: 7.117 },
    { name: 'Bayelsa Road', lat: 4.812089, lng: 6.98463 },
    { name: 'The Church of Jesus Christ of Latter', lat: 4.8092, lng: 7.1178 },
    { name: 'Les mess inn', lat: 4.811636, lng: 6.984999 },
    { name: 'Ejigini St intersection', lat: 4.8089, lng: 7.1186 },
    { name: 'DEZEC Intergrated Services Limited', lat: 4.810496, lng: 6.984602 },
    { name: 'IMO City Mass Transit', lat: 4.800114, lng: 6.991022 },
    { name: 'Equitoni Bricks Limited', lat: 4.810157, lng: 6.984611 },
    { name: 'Chicken Republic-UST/IKOKU', lat: 4.799774, lng: 6.991246 },
    { name: 'Rivers State Waste Management Agency', lat: 4.810495, lng: 6.985659 },
    { name: 'Abissa St intersection', lat: 4.8077, lng: 7.1218 },
    { name: 'Agbolu St', lat: 4.810347, lng: 6.984631 },
    { name: 'Odunze St intersection', lat: 4.8074, lng: 7.1226 },
    { name: 'SAMSONITE HOMES NIG LTD', lat: 4.809415, lng: 6.985025 },
    { name: 'G standard top Technical', lat: 4.8071, lng: 7.1234 },
    { name: 'RONAGO', lat: 4.809313, lng: 6.984848 },
    { name: 'Ikowku Oil Market', lat: 4.8068, lng: 7.1242 },
    { name: 'Wokora Cl', lat: 4.809275, lng: 6.984935 },
    { name: 'NairaBet(Ikoku)', lat: 4.799191, lng: 6.991981 },
    { name: 'Culus', lat: 4.808969, lng: 6.98509 },
    { name: 'School Rd intersection', lat: 4.8062, lng: 7.1258 },
    { name: 'BC Global', lat: 4.808899, lng: 6.985123 },
    { name: 'Azikiwe St intersection', lat: 4.8059, lng: 7.1266 },
    { name: 'Star-Way International Ltd.', lat: 4.808859, lng: 6.985161 },
    { name: 'UGOXIAN TELECOMMUNIC', lat: 4.8056, lng: 7.1274 },
    { name: 'Noschidex Abundance Nig. Ltd', lat: 4.808816, lng: 6.985196 },
    { name: 'Diamond C&A', lat: 4.798673, lng: 6.992299 },
    { name: 'Bay Tracks International Limited', lat: 4.808685, lng: 6.985315 },
    { name: 'Emeke Japan International Company', lat: 4.805, lng: 7.129 },
    { name: 'Mic-Shars International Company', lat: 4.808637, lng: 6.985377 },
    { name: 'SDD - Diobu', lat: 4.798382, lng: 6.992436 },
    { name: '5-16 Echeonwu St', lat: 4.808987, lng: 6.985415 },
    { name: 'NNPC', lat: 4.7983, lng: 6.992522 },
    { name: 'Confy beauty channel', lat: 4.808198, lng: 6.985989 },
    { name: 'Restopark Oil & Gas', lat: 4.798218, lng: 6.992066 },
    { name: 'Mechanic junction', lat: 4.808135, lng: 6.985853 },
    { name: 'Hyper Filling Station, Ikoku', lat: 4.798009, lng: 6.992275 },
    { name: 'Ada-George Road', lat: 4.80807, lng: 6.985726 },
    { name: 'Adelabu St intersection', lat: 4.8035, lng: 7.133 },
    { name: 'Fidelity Bank (ATM)', lat: 4.807596, lng: 6.986396 },
    { name: 'Cudero Designs and Prints Limited', lat: 4.8032, lng: 7.1338 },
    { name: 'Access Bank Plc Ph, 222 Ikwerre Road', lat: 4.807492, lng: 6.986171 },
    { name: 'Meridian Hospital', lat: 4.8026, lng: 7.1354 },
    { name: 'Home Pride', lat: 4.807377, lng: 6.986785 },
    { name: 'St Thomas Anglican Church', lat: 4.797681, lng: 6.992828 },
    { name: 'Last B footwears', lat: 4.80727, lng: 6.986777 },
    { name: 'HyperCITY Ikoku', lat: 4.798364, lng: 6.99338 },
    { name: 'Favour Shoe World', lat: 4.807246, lng: 6.987437 },
    { name: 'RIVERS SPORTS SHOP PORT HARCOURT', lat: 4.796919, lng: 6.99295 },
    { name: 'Okokwu Street', lat: 4.807428, lng: 6.986935 },
    { name: 'Immaculate Gospel Mission', lat: 4.8014, lng: 7.1386 },
    { name: 'U & C Microfinance Bank Ltd Atm', lat: 4.807044, lng: 6.987612 },
    { name: 'Emole St intersection', lat: 4.8011, lng: 7.1394 },
    { name: 'Airtel Shop', lat: 4.806779, lng: 6.987327 },
    { name: 'Jonik Electronics and Furniture', lat: 4.796349, lng: 6.993293 },
    { name: 'StockPro Nigeria Limited', lat: 4.806821, lng: 6.987705 },
    { name: 'Assemblies Of God', lat: 4.8005, lng: 7.141 },
    { name: 'Ihunwo Orogbu Road', lat: 4.806862, lng: 6.988109 },
    { name: 'Love Walk Assembly', lat: 4.796496, lng: 6.993649 },
    { name: 'The Excellency', lat: 4.806455, lng: 6.988162 },
    { name: 'Blessed Ononuju', lat: 4.795922, lng: 6.993738 },
    { name: 'Evagold Global Concepts Limited', lat: 4.806484, lng: 6.98815 },
    { name: 'Anozle St intersection', lat: 4.7996, lng: 7.1434 },
    { name: 'UST JUNCTION', lat: 4.806131, lng: 6.988156 },
    { name: "Shepherdhills Int'l schools", lat: 4.7993, lng: 7.1442 },
    { name: 'UST Rd', lat: 4.805958, lng: 6.988182 },
    { name: 'TechHub', lat: 4.799, lng: 7.145 },
    { name: 'Jbrus Technical And Services', lat: 4.805715, lng: 6.988375 },
    { name: 'Prince Mega Stores Shopping mall', lat: 4.7987, lng: 7.1458 },
    { name: 'Favourite Exquisite Collectionsy', lat: 4.806004, lng: 6.988565 },
    { name: 'Maggie Fast Food and Restaurant', lat: 4.795433, lng: 6.994205 },
    { name: 'Sweet sixteen organic world', lat: 4.805418, lng: 6.988385 },
    { name: 'Opata St intersection', lat: 4.7981, lng: 7.1474 },
    { name: 'Olusegun Obasanjo Bypass', lat: 4.805806, lng: 6.988887 },
    { name: 'British-American Insurance Co', lat: 4.7978, lng: 7.1482 },
    { name: 'Goddey auto fancy', lat: 4.805204, lng: 6.989456 },
    { name: 'Lontor Brand Shop Port Harcourt', lat: 4.7975, lng: 7.149 },
    { name: '9mobile SIM Registration Centre Mile 3', lat: 4.80497, lng: 6.989263 },
    { name: 'Luxy Hotels Bar and Restaurant', lat: 4.7972, lng: 7.1498 },
    { name: 'Market Square', lat: 4.804867, lng: 6.989466 },
    { name: 'Niger-Bay Pharmacy', lat: 4.794684, lng: 6.994325 },
    { name: 'State Men', lat: 4.804799, lng: 6.989096 },
    { name: 'Izu-Tech Electrical Company Nigeria', lat: 4.7966, lng: 7.1514 },
    { name: 'Kristo Diaper Planet', lat: 4.804715, lng: 6.989143 },
    { name: 'Ken Joe Electrical Giant', lat: 4.7963, lng: 7.1522 },
    { name: "ATG SERVICE'S MILE 3 OFFICE", lat: 4.804565, lng: 6.989783 },
    { name: 'Chief Gilbert Amadi St intersection', lat: 4.796, lng: 7.153 },
    { name: 'ELECHHI ROAD', lat: 4.804097, lng: 6.989478 },
    { name: 'Buguma Street intersection', lat: 4.7957, lng: 7.1538 },
    { name: 'De Chico Group of Companies', lat: 4.803925, lng: 6.989618 },
    { name: 'Just Happy Foods', lat: 4.7954, lng: 7.1546 },
    { name: 'Wobo street', lat: 4.803582, lng: 6.989721 },
    { name: 'First GloryLand Bible Church', lat: 4.7951, lng: 7.1554 },
    { name: "Manager's bar and restaurant", lat: 4.803466, lng: 6.989732 },
    { name: 'Tianshi World Speciality Shop', lat: 4.7948, lng: 7.1562 },
    { name: 'PRESHEEN EXCELLENT VENTURE', lat: 4.803744, lng: 6.990425 },
    { name: 'DHL Service Point', lat: 4.7945, lng: 7.157 },
    { name: 'Arklink Investment Nigeria Limited', lat: 4.803398, lng: 6.990304 },
    { name: 'Mouka Foam Mattress store', lat: 4.7942, lng: 7.1578 },
    { name: 'Gold Foam', lat: 4.803042, lng: 6.989857 },
    { name: 'Heritage Bank', lat: 4.79367, lng: 6.995531 },
    { name: 'Bishop Okoye St', lat: 4.803045, lng: 6.990232 },
    { name: 'Favour Technical Tools And Safety', lat: 4.7936, lng: 7.1594 },
    { name: 'IKOKU junction/flyover', lat: 4.79903, lng: 6.991773 },
    { name: 'Rivers State Board of Internal Revenue', lat: 4.793668, lng: 6.996214 },
    { name: 'Woji-Umueme Rd', lat: 4.798702, lng: 6.99215 },
    { name: "St. Andrew's Church, Mile 1 Diobu", lat: 4.793, lng: 7.161 },
    { name: 'BrandingOds', lat: 4.798514, lng: 6.991938 },
    { name: 'Emelike St intersection', lat: 4.7927, lng: 7.1618 },
    { name: 'Destiny Assembly', lat: 4.79843, lng: 6.992419 },
    { name: 'Mile 1 Market', lat: 4.7924, lng: 7.1626 },
    { name: 'Zenith Bank Mile 2', lat: 4.797595, lng: 6.992507 },
    { name: 'Safari Fast Food', lat: 4.7921, lng: 7.1634 },
    { name: 'Gold Foam Depot', lat: 4.797463, lng: 6.99257 },
    { name: 'Icon Cosmetics Limited', lat: 4.7918, lng: 7.1642 },
    { name: 'MONIEPOINT SERVICES & POS SUPPLY CENTER MILE 2 OFFICE', lat: 4.797312, lng: 6.99267 },
    { name: 'Mile 1 Shopping Complex', lat: 4.792488, lng: 6.997787 },
    { name: 'School', lat: 4.797354, lng: 6.993228 },
    { name: 'SDD - Mile 1', lat: 4.792284, lng: 6.997777 },
    { name: 'HAAT GLOBAL INVESTMENT', lat: 4.795766, lng: 6.993615 },
    { name: "Saint Andrew's Anglican Church, Diobu", lat: 4.792113, lng: 6.996867 },
    { name: 'Mf Marta Foam', lat: 4.796171, lng: 6.993402 },
    { name: 'Rumuola St intersection', lat: 4.7903, lng: 7.1682 },
    { name: 'Shedrack Investment (Biggy)', lat: 4.79421, lng: 6.994746 },
    { name: 'Diobu Central Mosque', lat: 4.790957, lng: 6.998636 },
    { name: 'Mouka Foam Mile 1', lat: 4.793878, lng: 6.99508 },
    { name: 'Christian Judicial University', lat: 4.790786, lng: 6.998825 },
    { name: 'OSILIGHT EDUCATIONAL SERVICES LIMITED', lat: 4.79333, lng: 6.995521 },
    { name: 'Pan African Business School', lat: 4.790511, lng: 6.998747 },
    { name: "St Andrew's State School.", lat: 4.792984, lng: 6.996038 },
    { name: 'Access Bank Plc Ph, 50 Ikwerre Road', lat: 4.790526, lng: 6.999306 },
    { name: 'Lyrical Saike', lat: 4.793501, lng: 6.996175 },
    { name: 'Union Bank', lat: 4.790447, lng: 6.999621 },
    { name: "St. Andrew's State School Field", lat: 4.792493, lng: 6.996327 },
    { name: 'Elotex Pharmacy', lat: 4.7903, lng: 6.999789 },
    { name: 'Chuks Praise', lat: 4.791456, lng: 6.99763 },
    { name: 'RIVERS NYSC STATE SECRETARIAT', lat: 4.789904, lng: 6.999854 },
    { name: 'Eternal Grace Ventures Ltd', lat: 4.791734, lng: 6.998096 },
    { name: 'The Redeemed Christian Church Of God', lat: 4.788934, lng: 7.000857 },
    { name: 'Mile One Market', lat: 4.791819, lng: 6.998603 },
    { name: 'Port Harcourt Education', lat: 4.788649, lng: 7.000883 },
    { name: 'Mile One Market Port Harcourt', lat: 4.792128, lng: 6.998408 },
    { name: 'Conoil Station', lat: 4.788743, lng: 7.000964 },
    { name: 'Prince Mega Agency Cosmetic Giant 1', lat: 4.7879, lng: 7.1746 },
    { name: 'mile 1 bus stop', lat: 4.788272, lng: 7.00155 },
    { name: 'Cliff Studios', lat: 4.7876, lng: 7.1754 },
    { name: 'Sangana St', lat: 4.790891, lng: 7.001206 },
    { name: 'FCMB IKWERRE I BRANCH', lat: 4.7873, lng: 7.1762 },
    { name: 'JAMB Office Port Harcourt', lat: 4.79022, lng: 7.002834 },
    { name: 'Fotozila', lat: 4.787, lng: 7.177 },
    { name: 'Mile 1 Police Station', lat: 4.788986, lng: 7.001596 },
    { name: 'Marcon Steel Co', lat: 4.7867, lng: 7.1778 },
    { name: 'The Nigeria Police', lat: 4.788633, lng: 7.002852 },
    { name: 'Vassion Media', lat: 4.7864, lng: 7.1786 },
    { name: 'Nigeria Immigration Service Passport Office Mile 1', lat: 4.790251, lng: 7.002617 },
    { name: 'Abali Motor park', lat: 4.790016, lng: 7.002135 },
    { name: 'Opposite the Tide newspaper', lat: 4.787208, lng: 7.00244 },
    { name: 'Port Harcourt Railway Station', lat: 4.787951, lng: 7.002709 },
  ];

  // Merge all landmarks
  for (const landmark of chobaToRumuokoroLandmarks) {
    allLandmarks.set(landmark.name, landmark);
  }

  for (const landmark of rumuokoroToEliozuLandmarks) {
    allLandmarks.set(landmark.name, landmark);
  }

  for (const landmark of eliozuToAirforceLandmarks) {
    allLandmarks.set(landmark.name, landmark);
  }

  for (const landmark of rumuokoroToMile1Landmarks) {
    allLandmarks.set(landmark.name, landmark);
  }

  // Create location for each unique landmark
  let landmarkCount = 0;
  for (const [name, landmark] of allLandmarks) {
    try {
      // Check if landmark already exists as a location
      const existingLocation = await dataSource.query(
        `SELECT id FROM locations WHERE name = $1 LIMIT 1;`,
        [name],
      );

      if (existingLocation.length === 0) {
        const result = await dataSource.query(
          `INSERT INTO locations (name, city, state, country, latitude, longitude, description, "isVerified", "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
           RETURNING id;`,
          [
            name,
            'Port Harcourt',
            'Rivers',
            'Nigeria',
            landmark.lat,
            landmark.lng,
            `Landmark along Port Harcourt routes`,
            true,
            true,
          ],
        );
        locationIds[name] = result[0].id;
        landmarkCount++;
        console.log(`✅ Created landmark location: ${name}`);
      }
    } catch (error) {
      console.log(`⚠️  Skipped duplicate landmark: ${name}`);
    }
  }

  console.log(`\n✅ Created ${landmarkCount} landmark locations\n`);

  // ============================================
  // 2. CREATE ROUTE SEGMENTS (SHARED PATHS)
  // ============================================
  console.log('🛣️  Creating Route Segments...\n');

  const segments = [
    {
      name: 'Choba to Rumuokoro Direct',
      startLocation: 'Choba Junction',
      endLocation: 'Rumuokoro Junction',
      intermediateStops: [
        { name: 'Alakahia', order: 1, isOptional: false },
        { name: 'Rumuosi', order: 2, isOptional: false },
        { name: 'Rumuagholu', order: 3, isOptional: true },
        { name: 'Nkpolu', order: 4, isOptional: true },
      ],
      transportModes: ['taxi', 'bus'],
      distance: 7.2,
      estimatedDuration: 20,
      minFare: 400,
      maxFare: 600,
      instructions: `From Choba Junction, board any vehicle going to Rumuokoro, Eliozu or Eleme.

**At Choba:**
- Look for taxis or buses saying "Rumuokoro" or "Eliozu" or "Eleme"
- Tell conductor: "I dey go Rumuokoro"
- Vehicle will pass through Alakahia, Rumuosi, and Nkpolu

**What to Look For:**
- Big flyover (Rumuokoro Bridge)
- Lots of parked buses and taxis
- Rumuokoro Park Market near the junction
- Avigate will notify you when approaching

**Tip:** If going to Airforce or Eliozu, stay on the vehicle past Rumuokoro to save time and money.`,
      landmarks: chobaToRumuokoroLandmarks,
      isVerified: true,
    },
    {
      name: 'Rumuokoro to Eliozu Junction',
      startLocation: 'Rumuokoro Junction',
      endLocation: 'Eliozu Junction',
      intermediateStops: [
        { name: 'Alhajia Estate', order: 1, isOptional: true },
        { name: 'Peace Estate', order: 2, isOptional: true },
      ],
      transportModes: ['taxi', 'bus'],
      distance: 3.5,
      estimatedDuration: 10,
      minFare: 200,
      maxFare: 300,
      instructions: `From Rumuokoro to Eliozu Junction:

**At Rumuokoro:**
- Look for taxis or buses saying "Airforce" or ask people for "Airforce" vehicle
- You should be able get a direct taxi to Airforce
- Tell driver: "I dey go Airforce"
- Vehicle follows East-West Road

**Alternative Route:**
- If you can't find direct vehicle to Airforce, board any vehicle going to Eliozu
- Tell conductor: "I dey go Eliozu"
- Vehicle will pass through Alhajia Estate and Peace Estate

**What to Look For:**
- Big flyover at Eliozu Junction
- Skyfall Mega Lounge at the junction
- Transport companies like Chisco
- Avigate will notify you when approaching`,
      landmarks: rumuokoroToEliozuLandmarks,
      isVerified: true,
    },
    {
      name: 'Eliozu to Airforce Junction',
      startLocation: 'Eliozu Junction',
      endLocation: 'Airforce Junction',
      intermediateStops: [
        { name: 'Obasanjo Bypass', order: 1, isOptional: false },
        { name: 'Stadium Road', order: 2, isOptional: false },
      ],
      transportModes: ['taxi'],
      distance: 1.8,
      estimatedDuration: 5,
      minFare: 100,
      maxFare: 200,
      instructions: `From Eliozu Junction to Airforce:

**At Eliozu:**
- After dropping at Eliozu Junction/Flyover
- Find taxis shouting "Airforce"
- Short ride on Obasanjo Bypass to Stadium Road
- Vehicles fill up before leaving (5 passengers)

**Alternative - Continue from Rumuokoro:**
If you stayed on the Airforce vehicle from Rumuokoro:
- Stay in the vehicle
- No need to drop at Eliozu
- Direct to Airforce Junction

**At Airforce:**
- Look for Big Treat Shopping Mall
- Stadium Road intersection
- MTN Shop and various stores
- Avigate will notify you`,
      landmarks: eliozuToAirforceLandmarks,
      isVerified: true,
    },
    {
      name: 'Rumuokoro to Mile 1/Education (Direct Bus)',
      startLocation: 'Rumuokoro Junction',
      endLocation: 'Mile 1 Diobu',
      intermediateStops: [
        { name: 'Rumugbo Junction', order: 1, isOptional: false },
        { name: 'Nice Up/GTCO', order: 2, isOptional: false },
        { name: 'Mile 5 AP Filling Station', order: 3, isOptional: true },
        { name: 'Rumuepirikom', order: 4, isOptional: true },
        { name: 'Police Headquarters', order: 5, isOptional: true },
        { name: 'Rumubiakani/Wimpy Junction', order: 6, isOptional: true },
        { name: 'Rumueme', order: 7, isOptional: true },
        { name: 'Chida Bus Stop', order: 8, isOptional: true },
        { name: 'Mile 4', order: 9, isOptional: true },
        { name: 'Agip Roundabout', order: 10, isOptional: true },
        { name: 'Mile 3', order: 11, isOptional: false },
        { name: 'UST Roundabout', order: 12, isOptional: false },
        { name: 'Mile 2 Diobu', order: 13, isOptional: false },
      ],
      transportModes: ['bus'],
      distance: 15.8,
      estimatedDuration: 45,
      minFare: 300,
      maxFare: 500,
      instructions: `From Rumuokoro Junction to Mile 1/Education (Direct Bus Route):

**At Rumuokoro:**
- Look for buses saying "Mile 1" or "Education" or "Town"
- Board at SDD Rumuokoro Junction/Flyover area
- Tell conductor: "I dey go Mile 1" or "I dey go Education"
- This is a direct route - stay in vehicle throughout

**Major Stops Along the Way:**
1. Rumugbo Junction
2. Nice Up/GTCO area (Mile 5)
3. Rumuepirikom (Police Headquarters area)
4. Rumubiakani (Wimpy Junction)
5. Rumueme/Chida
6. Mile 4
7. Agip Roundabout (Mile 3)
8. UST Roundabout
9. Mile 2 Diobu (Azikiwe area)
10. Mile 1 Market/Education

**What to Look For at Mile 1:**
- Mile One Market (large market)
- Diobu Central Mosque
- Heritage Bank
- FCMB IKWERRE I BRANCH
- Vassion Media
- Many photo/frame shops
- Avigate will notify you when approaching

**Tips:**
- This route follows Ikwerre Road (A231) all the way
- Traffic can be heavy during rush hours (7-9am, 4-7pm)
- Keep valuables secure in busy market areas
- If going to Education specifically, tell conductor before Mile 1 Market`,
      landmarks: rumuokoroToMile1Landmarks,
      isVerified: true,
    },
  ];

  const segmentIds: Record<string, string> = {};

  for (const segment of segments) {
    const intermediateStopsWithIds = await Promise.all(
      segment.intermediateStops.map(async stop => {
        const locationResult = await dataSource.query(
          `SELECT id FROM locations WHERE name ILIKE $1 LIMIT 1;`,
          [`%${stop.name}%`],
        );

        return {
          locationId: locationResult[0]?.id || null,
          name: stop.name,
          order: stop.order,
          isOptional: stop.isOptional,
        };
      }),
    );

    const result = await dataSource.query(
      `INSERT INTO route_segments (
        name, "startLocationId", "endLocationId", "intermediateStops",
        "transportModes", distance, "estimatedDuration", "minFare", "maxFare",
        instructions, landmarks, "usageCount", "isActive", "isVerified",
        "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING id;`,
      [
        segment.name,
        locationIds[segment.startLocation],
        locationIds[segment.endLocation],
        JSON.stringify(intermediateStopsWithIds),
        segment.transportModes,
        segment.distance,
        segment.estimatedDuration,
        segment.minFare,
        segment.maxFare,
        segment.instructions,
        JSON.stringify(segment.landmarks),
        0,
        true,
        segment.isVerified,
      ],
    );

    segmentIds[segment.name] = result[0].id;
    console.log(`✅ Created segment: ${segment.name}`);
  }

  console.log(`\n✅ Created ${segments.length} route segments\n`);

  // ============================================
  // 3. CREATE COMPLETE ROUTES
  // ============================================
  console.log('🗺️  Creating Complete Routes...\n');

  const routes = [
    {
      name: 'Choba to Airforce via Rumuokoro and Eliozu',
      startLocation: 'Choba Junction',
      endLocation: 'Airforce Junction',
      description: 'Popular route from UNIPORT area to Airforce Base via Rumuokoro and Eliozu',
      segments: [
        'Choba to Rumuokoro Direct',
        'Rumuokoro to Eliozu Junction',
        'Eliozu to Airforce Junction',
      ],
      transportModes: ['taxi', 'bus'],
    },
    {
      name: 'Rumuokoro to Mile 1/Education Direct',
      startLocation: 'Rumuokoro Junction',
      endLocation: 'Mile 1 Diobu',
      description:
        'Direct bus route from Rumuokoro along Ikwerre Road to Mile 1/Education area, passing through major stops like Mile 5, Mile 4, Mile 3, UST, and Mile 2',
      segments: ['Rumuokoro to Mile 1/Education (Direct Bus)'],
      transportModes: ['bus'],
    },
    // ========================================
    // Multi-segment routes requiring transfers
    // ========================================
    {
      name: 'Choba to Mile 4 via Rumuokoro Transfer',
      startLocation: 'Choba Junction',
      endLocation: 'Mile 4',
      description:
        'Journey from Choba to Mile 4 requires transfer at Rumuokoro Junction. First vehicle to Rumuokoro, then board Mile 1/Town bus and drop at Mile 4.',
      segments: ['Choba to Rumuokoro Direct', 'Rumuokoro to Mile 1/Education (Direct Bus)'],
      transportModes: ['taxi', 'bus'],
    },
    {
      name: 'Choba to Mile 3 via Rumuokoro Transfer',
      startLocation: 'Choba Junction',
      endLocation: 'Mile 3',
      description:
        'Journey from Choba to Mile 3 requires transfer at Rumuokoro Junction. First vehicle to Rumuokoro, then board Mile 1/Town bus and drop at Mile 3.',
      segments: ['Choba to Rumuokoro Direct', 'Rumuokoro to Mile 1/Education (Direct Bus)'],
      transportModes: ['taxi', 'bus'],
    },
    {
      name: 'Choba to UST Roundabout via Rumuokoro Transfer',
      startLocation: 'Choba Junction',
      endLocation: 'UST Roundabout',
      description:
        'Journey from Choba to UST requires transfer at Rumuokoro Junction. First vehicle to Rumuokoro, then board Mile 1/Town bus and drop at UST.',
      segments: ['Choba to Rumuokoro Direct', 'Rumuokoro to Mile 1/Education (Direct Bus)'],
      transportModes: ['taxi', 'bus'],
    },
    {
      name: 'Choba to Mile 2 Diobu via Rumuokoro Transfer',
      startLocation: 'Choba Junction',
      endLocation: 'Mile 2 Diobu',
      description:
        'Journey from Choba to Mile 2 requires transfer at Rumuokoro Junction. First vehicle to Rumuokoro, then board Mile 1/Town bus and drop at Mile 2.',
      segments: ['Choba to Rumuokoro Direct', 'Rumuokoro to Mile 1/Education (Direct Bus)'],
      transportModes: ['taxi', 'bus'],
    },
    {
      name: 'Choba to Mile 1 via Rumuokoro Transfer',
      startLocation: 'Choba Junction',
      endLocation: 'Mile 1 Diobu',
      description:
        'Journey from Choba to Mile 1 requires transfer at Rumuokoro Junction. First vehicle to Rumuokoro, then board Mile 1/Town bus.',
      segments: ['Choba to Rumuokoro Direct', 'Rumuokoro to Mile 1/Education (Direct Bus)'],
      transportModes: ['taxi', 'bus'],
    },
    {
      name: 'Choba to Education via Rumuokoro Transfer',
      startLocation: 'Choba Junction',
      endLocation: 'Education Bus Stop',
      description:
        'Journey from Choba to Education requires transfer at Rumuokoro Junction. First vehicle to Rumuokoro, then board Mile 1/Town bus and continue to Education.',
      segments: ['Choba to Rumuokoro Direct', 'Rumuokoro to Mile 1/Education (Direct Bus)'],
      transportModes: ['taxi', 'bus'],
    },
  ];

  for (const route of routes) {
    // Calculate totals from segments
    let totalDistance = 0;
    let totalDuration = 0;
    let totalMinFare = 0;
    let totalMaxFare = 0;

    for (const segmentName of route.segments) {
      const segment = segments.find(s => s.name === segmentName);
      if (segment) {
        totalDistance += segment.distance;
        totalDuration += segment.estimatedDuration;
        totalMinFare += segment.minFare;
        totalMaxFare += segment.maxFare;
      }
    }

    const routeResult = await dataSource.query(
      `INSERT INTO routes (
        name, "startLocationId", "endLocationId", description,
        "transportModes", "estimatedDuration", distance, "minFare", "maxFare",
        "isVerified", "isActive", "popularityScore", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING id;`,
      [
        route.name,
        locationIds[route.startLocation],
        locationIds[route.endLocation],
        route.description,
        route.transportModes,
        totalDuration,
        totalDistance,
        totalMinFare,
        totalMaxFare,
        true,
        true,
        Math.floor(Math.random() * 50) + 50,
      ],
    );

    console.log(`✅ Created route: ${route.name}`);
  }

  console.log('\n🎉 Seeding Complete!\n');
  console.log('Summary:');
  console.log(`- Locations: ${Object.keys(locationIds).length}`);
  console.log(`- Segments: ${segments.length}`);
  console.log(`- Routes: ${routes.length}`);
}
