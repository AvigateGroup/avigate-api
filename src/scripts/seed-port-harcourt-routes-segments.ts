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
      latitude: 4.902556,
      longitude: 6.918031,
      description: 'Main entrance of UNIPORT',
      isVerified: true,
    },
    {
      name: 'Choba Junction',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.902222,
      longitude: 6.917778,
      description: 'Major transport hub near UNIPORT',
      isVerified: true,
    },
    // Intermediate stops: Choba to Rumuokoro
    {
      name: 'Alakahia',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.895833,
      longitude: 6.925556,
      description: 'Residential and commercial area between Choba and Rumuosi',
      isVerified: true,
    },
    {
      name: 'Rumuosi',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.883333,
      longitude: 6.941667,
      description: 'Community along Choba-Rumuokoro route with market and churches',
      isVerified: true,
    },
    {
      name: 'Rumuagholu',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.878056,
      longitude: 6.951389,
      description: 'Residential area between Rumuosi and Nkpolu',
      isVerified: true,
    },
    {
      name: 'Nkpolu',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.870556,
      longitude: 6.963889,
      description: 'Commercial area near Rumuokoro with Twin Towers Hospital',
      isVerified: true,
    },
    {
      name: 'Rumuokoro Junction',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.863889,
      longitude: 6.972222,
      description: 'Major junction with flyover on Ikwerre Road',
      isVerified: true,
    },
    // Intermediate stops: Rumuokoro to Eliozu
    {
      name: 'Alhajia Estate',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.858611,
      longitude: 6.983333,
      description: 'Residential estate between Rumuokoro and Eliozu',
      isVerified: true,
    },
    {
      name: 'Peace Estate',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.852778,
      longitude: 6.994444,
      description: 'Residential estate near Eliozu Junction',
      isVerified: true,
    },
    {
      name: 'Eliozu Junction',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.845556,
      longitude: 7.003889,
      description: 'Junction on East-West Road',
      isVerified: true,
    },
    // Intermediate stops: Eliozu to Airforce
    {
      name: 'Obasanjo Bypass',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.841111,
      longitude: 7.008333,
      description: 'Major bypass road connecting Eliozu to Airforce area',
      isVerified: true,
    },
    {
      name: 'Stadium Road',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.836667,
      longitude: 7.013889,
      description: 'Road leading to Liberation Stadium and Airforce Junction',
      isVerified: true,
    },
    {
      name: 'Airforce Junction',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.833333,
      longitude: 7.016667,
      description: 'Near Nigerian Air Force Base',
      isVerified: true,
    },
    // Intermediate stops: Rumuokoro to Mile 1/Education
    {
      name: 'Rumugbo Junction',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.858056,
      longitude: 6.978889,
      description: 'Junction on Ikwerre Road near psychiatric hospital',
      isVerified: true,
    },
    {
      name: 'Nice Up/GTCO',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.850556,
      longitude: 6.988611,
      description: 'Commercial area with GTBank and Nice Up Beauty Complex at Mile 5',
      isVerified: true,
    },
    {
      name: 'Mile 5 AP Filling Station',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.847778,
      longitude: 6.993333,
      description: 'AP Filling Station landmark at Mile 5',
      isVerified: true,
    },
    {
      name: 'Rumuepirikom',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.845000,
      longitude: 6.998611,
      description: 'Area near Police Headquarters on Ikwerre Road',
      isVerified: true,
    },
    {
      name: 'Police Headquarters',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.843889,
      longitude: 7.001111,
      description: 'Rivers State Police Headquarters area',
      isVerified: true,
    },
    {
      name: 'Rumubiakani/Wimpy Junction',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.841111,
      longitude: 7.005556,
      description: 'Junction near Wimpy area',
      isVerified: true,
    },
    {
      name: 'Rumueme',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.837778,
      longitude: 7.011667,
      description: 'Residential area with schools and town hall',
      isVerified: true,
    },
    {
      name: 'Chida Bus Stop',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.835000,
      longitude: 7.015000,
      description: 'Popular bus stop on Ikwerre Road',
      isVerified: true,
    },
    {
      name: 'Mile 4',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.832222,
      longitude: 7.018889,
      description: 'Commercial area at Mile 4 marker on Ikwerre Road',
      isVerified: true,
    },
    {
      name: 'Agip Roundabout',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.829444,
      longitude: 7.022778,
      description: 'Major roundabout at Mile 3 on Ikwerre Road',
      isVerified: true,
    },
    {
      name: 'Mile 3',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.829444,
      longitude: 7.022778,
      description: 'Mile 3 area with park and commercial activities',
      isVerified: true,
    },
    {
      name: 'UST Roundabout',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.825000,
      longitude: 7.027222,
      description: 'University of Port Harcourt Teaching Hospital roundabout',
      isVerified: true,
    },
    {
      name: 'Mile 2 Diobu',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.822222,
      longitude: 7.030556,
      description: 'Mile 2 area in Diobu with markets and transport services',
      isVerified: true,
    },
    {
      name: 'Mile 1 Diobu',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.819444,
      longitude: 7.033333,
      description: 'Major commercial area with Mile One Market',
      isVerified: true,
    },
    {
      name: 'Education Bus Stop',
      city: 'Port Harcourt',
      state: 'Rivers',
      country: 'Nigeria',
      latitude: 4.818889,
      longitude: 7.034444,
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
      ]
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

  const segmentsWithLandmarks = [
    {
      landmarks: [
        { name: 'Domino\'s Pizza Choba', lat: 4.902400, lng: 6.918200 },
        { name: 'YKC Junction', lat: 4.902100, lng: 6.918500 },
        { name: 'SYNLAB Nigeria', lat: 4.901800, lng: 6.918900 },
        { name: 'GIG Logistics', lat: 4.901500, lng: 6.919200 },
        { name: 'Total Petrol Station Choba', lat: 4.901200, lng: 6.919600 },
        { name: 'Faro Event Center', lat: 4.900800, lng: 6.920100 },
        { name: 'Supreme Delich Restaurant', lat: 4.895500, lng: 6.926000 },
        { name: 'Tokyo Royal Hotel', lat: 4.895200, lng: 6.926500 },
        { name: 'WHITE HOUSE LODGE', lat: 4.894800, lng: 6.927000 },
        { name: 'Aka Plaza Alakahia', lat: 4.894500, lng: 6.927500 },
        { name: 'GUO Logistics Choba', lat: 4.894000, lng: 6.928200 },
        { name: 'Ola banky fuel station', lat: 4.883000, lng: 6.942100 },
        { name: 'Mobil Filling Station', lat: 4.882700, lng: 6.942600 },
        { name: 'Bareke Memorial Hospital', lat: 4.882400, lng: 6.943100 },
        { name: 'Chilotem Electrical & Electronics', lat: 4.882100, lng: 6.943600 },
        { name: '9ja Farmers Market', lat: 4.881800, lng: 6.944200 },
        { name: 'Rumosi market', lat: 4.881500, lng: 6.944700 },
        { name: 'St. Gabriel Catholic Church', lat: 4.881200, lng: 6.945200 },
        { name: 'ASSEMBLIES OF GOD CHURCH', lat: 4.880800, lng: 6.945800 },
        { name: 'Gade Place Hotel', lat: 4.877700, lng: 6.951900 },
        { name: 'MetroFlex Gym Rumuosi', lat: 4.877400, lng: 6.952400 },
        { name: 'Playfield Park and Event Center', lat: 4.877100, lng: 6.953000 },
        { name: 'konga Express', lat: 4.876800, lng: 6.953600 },
        { name: 'NUELA\'S PLACE RUMUAGHOLU', lat: 4.876500, lng: 6.954200 },
        { name: 'Minita Road', lat: 4.876200, lng: 6.954800 },
        { name: 'Lechez Hotels & Suites', lat: 4.875800, lng: 6.955500 },
        { name: 'The Lord\'s Chosen Estate', lat: 4.875400, lng: 6.956200 },
        { name: 'Twin Towers Specialist Hospitals', lat: 4.874900, lng: 6.957000 },
        { name: 'Omega House Power Arena', lat: 4.870200, lng: 6.964400 },
        { name: 'Chicken Hills Nkpolu', lat: 4.869800, lng: 6.965000 },
        { name: 'St Jude\'s Catholic Church', lat: 4.869400, lng: 6.965600 },
        { name: 'Zenith Bank', lat: 4.868900, lng: 6.966300 },
        { name: 'Rumuokoro Park Market', lat: 4.864500, lng: 6.971500 },
        { name: 'Rumuokoro Motor Park', lat: 4.864200, lng: 6.972000 },
        { name: 'Rumuokoro Flyover', lat: 4.863889, lng: 6.972222 },
      ]
    },
    {
      landmarks: [
        { name: 'G. Agofure Motors', lat: 4.863500, lng: 6.973000 },
        { name: 'Sosils Logistics', lat: 4.863200, lng: 6.973800 },
        { name: 'Green Bands Pharmacy', lat: 4.862900, lng: 6.974600 },
        { name: 'Goodness and mercy mass transit', lat: 4.862600, lng: 6.975400 },
        { name: 'BB company', lat: 4.862300, lng: 6.976200 },
        { name: 'Ogename Pharmacy', lat: 4.862000, lng: 6.977000 },
        { name: 'TSK-G Pharmacy', lat: 4.861700, lng: 6.977800 },
        { name: 'Mbarie Services (NIG) LTD', lat: 4.861400, lng: 6.978600 },
        { name: 'Vet planet veterinary center', lat: 4.861100, lng: 6.979400 },
        { name: 'Bark Arena Pet Grooming Facility', lat: 4.860800, lng: 6.980200 },
        { name: 'Tech Mobile Integrated Service', lat: 4.860500, lng: 6.981000 },
        { name: 'GT Bank', lat: 4.860200, lng: 6.981800 },
        { name: 'IJMB', lat: 4.858300, lng: 6.984100 },
        { name: 'Winners Chapel', lat: 4.858000, lng: 6.984900 },
        { name: 'No Slack Motors', lat: 4.857700, lng: 6.985700 },
        { name: 'Royal Guest House', lat: 4.857400, lng: 6.986500 },
        { name: 'Wisdom Gate School (Campus 2)', lat: 4.857100, lng: 6.987300 },
        { name: 'The Young Shall Grow Motors Limited', lat: 4.856800, lng: 6.988100 },
        { name: 'Franksele Academy', lat: 4.856500, lng: 6.988900 },
        { name: 'Uni-Ike', lat: 4.856200, lng: 6.989700 },
        { name: 'Amanda\'s fashion collection', lat: 4.855900, lng: 6.990500 },
        { name: 'Megastar Technical & Construction Company', lat: 4.855600, lng: 6.991300 },
        { name: 'Mifoods', lat: 4.855300, lng: 6.992100 },
        { name: 'Chisco Bush Bar', lat: 4.855000, lng: 6.992900 },
        { name: 'Chisco', lat: 4.854700, lng: 6.993700 },
        { name: 'Kotec Brick Tiles', lat: 4.854400, lng: 6.994500 },
        { name: 'De Chico Group', lat: 4.854100, lng: 6.995300 },
        { name: 'CakesbySucre', lat: 4.853800, lng: 6.996100 },
        { name: 'BANDITOS LOUNGE SPORTS BAR', lat: 4.853500, lng: 6.996900 },
        { name: 'ShopBy Online Mall', lat: 4.852400, lng: 6.995200 },
        { name: 'Bellberry', lat: 4.852100, lng: 6.996000 },
        { name: 'TOC CANADA', lat: 4.851800, lng: 6.996800 },
        { name: 'Arecent Solutions', lat: 4.851500, lng: 6.997600 },
        { name: 'Clendac Oil', lat: 4.851200, lng: 6.998400 },
        { name: 'UZOGUD', lat: 4.850900, lng: 6.999200 },
        { name: 'Lawban Media and PR', lat: 4.850600, lng: 7.000000 },
        { name: 'Genton Integrated World Ltd', lat: 4.850300, lng: 7.000800 },
        { name: 'Shortlet Homes Port Harcourt', lat: 4.850000, lng: 7.001600 },
        { name: 'Grace Covenant Ministries', lat: 4.849700, lng: 7.002400 },
        { name: 'INEC', lat: 4.849400, lng: 7.003200 },
        { name: 'AEC AGROSYSTEMS', lat: 4.849100, lng: 7.004000 },
        { name: '619 LOUNGE & BAR', lat: 4.848800, lng: 7.004800 },
        { name: 'City Roller transport company', lat: 4.848500, lng: 7.005600 },
        { name: 'ROYAL LINK', lat: 4.848200, lng: 7.006400 },
        { name: 'Chisco Transport Nigeria Limited', lat: 4.847900, lng: 7.007200 },
        { name: 'Wholeman Hospital', lat: 4.847600, lng: 7.008000 },
        { name: 'Evangel Medical Laboratory', lat: 4.847300, lng: 7.008800 },
        { name: 'Tribel Global Motors', lat: 4.847000, lng: 7.009600 },
        { name: 'Rukpakwolusi', lat: 4.846700, lng: 7.010400 },
        { name: 'Nkpologwu Unity Hall', lat: 4.846400, lng: 7.011200 },
        { name: 'T.G.M MOSQUE', lat: 4.846100, lng: 7.012000 },
        { name: 'Anna Medical Centre', lat: 4.845800, lng: 7.012800 },
        { name: 'The Life Plus Community Church', lat: 4.845556, lng: 7.003889 },
        { name: 'Jehovah Rapha\'s Clinics', lat: 4.845400, lng: 7.004600 },
        { name: 'Desicon Engineering Limited', lat: 4.845100, lng: 7.005400 },
        { name: 'RE-BEST ENTERPRISE', lat: 4.844800, lng: 7.006200 },
        { name: 'Umenco Oil', lat: 4.844500, lng: 7.007000 },
        { name: 'The Lord\'s Chosen', lat: 4.844200, lng: 7.007800 },
        { name: 'Miracle Electrical Services Limited', lat: 4.843900, lng: 7.008600 },
        { name: 'Cossel Construction Company Nigeria', lat: 4.843600, lng: 7.009400 },
        { name: 'De-Amicable Global Communications', lat: 4.843300, lng: 7.010200 },
        { name: 'Echema Hotels', lat: 4.843000, lng: 7.011000 },
        { name: 'Skyfall Mega Lounge', lat: 4.845556, lng: 7.003889 },
      ]
    },
    {
      landmarks: [
        { name: 'Thrive Technologies Nig', lat: 4.845200, lng: 7.004500 },
        { name: 'WhypeMasters', lat: 4.844800, lng: 7.005300 },
        { name: 'Daba Ave', lat: 4.844400, lng: 7.006100 },
        { name: 'SUPERCITY MARKET', lat: 4.844000, lng: 7.006900 },
        { name: 'Mount On Ave', lat: 4.843600, lng: 7.007700 },
        { name: 'Nyeweibos Cl', lat: 4.843200, lng: 7.008500 },
        { name: 'Aku Road', lat: 4.842800, lng: 7.009300 },
        { name: 'Mercy Cl', lat: 4.842400, lng: 7.010100 },
        { name: 'Pipeline Rd', lat: 4.842000, lng: 7.010900 },
        { name: 'Wellness therapy', lat: 4.841600, lng: 7.011700 },
        { name: 'Apex Hilton Hotel', lat: 4.841111, lng: 7.008333 },
        { name: 'Kienkares International Fashion Accessories', lat: 4.840800, lng: 7.009100 },
        { name: 'Pacesetters Christian Assembly', lat: 4.840400, lng: 7.009900 },
        { name: 'Diplomat Ave', lat: 4.840000, lng: 7.010700 },
        { name: 'Brockville Montessori School', lat: 4.839600, lng: 7.011500 },
        { name: 'Gift Legate', lat: 4.839200, lng: 7.012300 },
        { name: 'Legal Clique Law Firm', lat: 4.838800, lng: 7.013100 },
        { name: 'Myrtle International School', lat: 4.838400, lng: 7.013900 },
        { name: 'SDD - GU Ake/Obasanjo Bypass', lat: 4.838000, lng: 7.014700 },
        { name: 'Gtext Holdings Port Harcourt', lat: 4.837600, lng: 7.015500 },
        { name: 'Krystal academy', lat: 4.837200, lng: 7.016300 },
        { name: 'Esthycollections', lat: 4.836800, lng: 7.017100 },
        { name: 'Global shaves', lat: 4.836667, lng: 7.013889 },
        { name: 'Dignity metal fabrication/Welding', lat: 4.836400, lng: 7.014700 },
        { name: 'Progressive brothers club of Port Harcourt', lat: 4.836000, lng: 7.015500 },
        { name: 'Toa Rd', lat: 4.835600, lng: 7.016300 },
        { name: 'Port Harcourt - Aba Expy', lat: 4.835200, lng: 7.017100 },
        { name: 'PA TABLE WATER COMPANY', lat: 4.834800, lng: 7.017900 },
        { name: 'Air Force', lat: 4.833333, lng: 7.016667 },
        { name: 'Stadium Rd', lat: 4.833900, lng: 7.017700 },
        { name: 'Big Treat Shopping mall', lat: 4.833500, lng: 7.018500 },
        { name: 'Happy Bite', lat: 4.833100, lng: 7.019300 },
        { name: 'MasParts Technology Apple Store', lat: 4.832700, lng: 7.020100 },
        { name: 'Arvel Travel and Tours', lat: 4.832300, lng: 7.020900 },
        { name: 'Oak Park and Garden', lat: 4.831900, lng: 7.021700 },
        { name: 'House of Bole Barbecue', lat: 4.831500, lng: 7.022500 },
        { name: 'The King\'s Assembly', lat: 4.831100, lng: 7.023300 },
        { name: 'Jumbo Sports Mart', lat: 4.830700, lng: 7.024100 },
        { name: 'Mystique Press Limited', lat: 4.830300, lng: 7.024900 },
        { name: 'Benjack Group', lat: 4.829900, lng: 7.025700 },
        { name: 'Onealpha Ryde', lat: 4.829500, lng: 7.026500 },
        { name: 'Red Star Express', lat: 4.829100, lng: 7.027300 },
        { name: 'MTN Shop-Benjack Port Harcourt', lat: 4.828700, lng: 7.028100 },
        { name: 'Prince Amadi Cl', lat: 4.828300, lng: 7.028900 },
        { name: 'Cherice Garden Hotel Annex', lat: 4.827900, lng: 7.029700 },
      ]
    },
  ];

  // Add landmarks from the long route (Rumuokoro to Mile 1)
  const longRouteLandmarks = [
    { name: 'SDD - Rumuokoro Junction', lat: 4.863889, lng: 6.972222 },
    { name: 'Emmanuel Anglican Church', lat: 4.863500, lng: 6.973000 },
    { name: 'FCMB IKWERRE II BRANCH', lat: 4.863200, lng: 6.973800 },
    { name: 'Wilson Pharmacy', lat: 4.862900, lng: 6.974600 },
    { name: 'Deli Spices Restaurant', lat: 4.862600, lng: 6.975400 },
    { name: 'Bet9ja', lat: 4.862300, lng: 6.976200 },
    { name: 'Access Bank', lat: 4.862000, lng: 6.977000 },
    { name: 'Anointed Treasure Ministries (ATM)', lat: 4.861700, lng: 6.977800 },
    { name: 'Bestman Adult Educational center', lat: 4.861400, lng: 6.978600 },
    { name: 'Bob Izua Motors', lat: 4.861100, lng: 6.979400 },
    { name: 'Origin Appliances', lat: 4.860800, lng: 6.980200 },
    { name: 'NEOLIFE Healthcare', lat: 4.860500, lng: 6.981000 },
    { name: 'FCMB RUMUOKORO BRANCH', lat: 4.860200, lng: 6.981800 },
    { name: 'Celestial Church Of Christ, Parish 2', lat: 4.859900, lng: 6.982600 },
    { name: 'Klein Graphics', lat: 4.859600, lng: 6.983400 },
    { name: 'RCCG Jesus Arena', lat: 4.859300, lng: 6.984200 },
    { name: 'Harrison Oil', lat: 4.859000, lng: 6.985000 },
    { name: 'Tamcy4Eva', lat: 4.858700, lng: 6.985800 },
    { name: 'Crystal Dew Integrated Services', lat: 4.858400, lng: 6.986600 },
    { name: 'Princekin Hotel', lat: 4.858100, lng: 6.987400 },
    { name: 'Mgbuike Hall', lat: 4.857800, lng: 6.988200 },
    { name: 'MagicGlow Beauty salon', lat: 4.857500, lng: 6.989000 },
    { name: 'Calabar Kitchens Delicious Food', lat: 4.857200, lng: 6.989800 },
    { name: 'MCC Operational Base', lat: 4.856900, lng: 6.990600 },
    { name: 'Chidi-Rich Integrated Business Limited', lat: 4.856600, lng: 6.991400 },
    { name: 'Evergreen Shopping Centre', lat: 4.856300, lng: 6.992200 },
    { name: 'Hikvision', lat: 4.856000, lng: 6.993000 },
    { name: 'Maichini Beauty Home', lat: 4.855700, lng: 6.993800 },
    { name: 'Evelyn Natural Hair Beauty Salon', lat: 4.855400, lng: 6.994600 },
    { name: 'L 37 Global Pharmacy', lat: 4.855100, lng: 6.995400 },
    { name: 'Ifex Express Limited', lat: 4.854800, lng: 6.996200 },
    { name: 'Foundation Marble & Granite Company Ltd', lat: 4.854500, lng: 6.997000 },
    { name: 'Worlu Street intersection', lat: 4.854200, lng: 6.997800 },
    { name: 'Eterna', lat: 4.853900, lng: 6.998600 },
    { name: 'The Europe Shop Intl Shopping mall', lat: 4.853600, lng: 6.999400 },
    { name: 'Lavished Grace Assembly', lat: 4.853300, lng: 7.000200 },
    { name: 'BLESSED FRANK SPARMARKET', lat: 4.853000, lng: 7.001000 },
    { name: 'Rumugbo Primary Health Centre', lat: 4.852700, lng: 7.001800 },
    { name: 'Rumugbo Civic Centre Hall', lat: 4.852400, lng: 7.002600 },
    { name: 'Church of Christ', lat: 4.852100, lng: 7.003400 },
    { name: 'David Veterinary Centre', lat: 4.851800, lng: 7.004200 },
    { name: 'Austino Technical Resources Limited', lat: 4.851500, lng: 7.005000 },
    { name: 'Everyday Supamakett Port Harcourt', lat: 4.851200, lng: 7.005800 },
    { name: 'Hisense', lat: 4.850900, lng: 7.006600 },
    { name: 'Psychiatric Hospital Lane', lat: 4.850600, lng: 7.007400 },
    { name: 'Remedles Herbal Store', lat: 4.850300, lng: 7.008200 },
    { name: 'Everyday Supermarket', lat: 4.850000, lng: 7.009000 },
    { name: 'Obiwali House', lat: 4.849700, lng: 7.009800 },
    { name: 'Nice Up Beauty Complex', lat: 4.849400, lng: 7.010600 },
    { name: 'Rico foods cereals and beverages', lat: 4.849100, lng: 7.011400 },
    { name: 'Holy Trinity Anglican Church Rumuapara', lat: 4.848800, lng: 7.012200 },
    { name: '9mobile SIM Registration Centre', lat: 4.848500, lng: 7.013000 },
    { name: 'Seventh-day Adventist Church Rumuokwuta', lat: 4.848200, lng: 7.013800 },
    { name: 'Auto Clinicar Services', lat: 4.847900, lng: 7.014600 },
    { name: 'Fountain of Power Christian Centre', lat: 4.847600, lng: 7.015400 },
    { name: 'Oak View Hotel and Suites', lat: 4.847300, lng: 7.016200 },
    { name: 'Kent Investment Co. Ltd', lat: 4.847000, lng: 7.017000 },
    { name: 'EverAfter', lat: 4.846700, lng: 7.017800 },
    { name: 'SUMEC FIRMAN', lat: 4.846400, lng: 7.018600 },
    { name: 'Bills Pharmacy Rumuokwuta', lat: 4.846100, lng: 7.019400 },
    { name: 'Orlu Market Road intersection', lat: 4.845800, lng: 7.020200 },
    { name: 'Success Super Stores', lat: 4.845500, lng: 7.021000 },
    { name: 'GTBank - GTExpress ATM', lat: 4.845200, lng: 7.021800 },
    { name: 'Quick Lube Automobile Services', lat: 4.844900, lng: 7.022600 },
    { name: 'De Label Beauty Gallery', lat: 4.844600, lng: 7.023400 },
    { name: 'Kingdom Life Centre', lat: 4.844300, lng: 7.024200 },
    { name: 'Multinet', lat: 4.844000, lng: 7.025000 },
    { name: 'EstateTown Hall', lat: 4.843700, lng: 7.025800 },
    { name: 'Kingdom Hall Of Jehovah\'s Witnesses', lat: 4.843400, lng: 7.026600 },
    { name: 'Nwakama Dredge Global', lat: 4.843100, lng: 7.027400 },
    { name: 'Jen-Edim Academic Dunamic Campus', lat: 4.842800, lng: 7.028200 },
    { name: 'FIRSTLOVE Assembly', lat: 4.842500, lng: 7.029000 },
    { name: 'GINACENT PHARMACY', lat: 4.842200, lng: 7.029800 },
    { name: 'Kala Street intersection', lat: 4.841900, lng: 7.030600 },
    { name: 'Dotnova Hotels Limited', lat: 4.841600, lng: 7.031400 },
    { name: 'Spring Hospital', lat: 4.841300, lng: 7.032200 },
    { name: 'Lash55 Glam', lat: 4.841000, lng: 7.033000 },
    { name: 'Rumukirikum Market', lat: 4.840700, lng: 7.033800 },
    { name: 'Deeper Life Bible Church, Epirikom', lat: 4.840400, lng: 7.034600 },
    { name: 'Onyiino Concepts', lat: 4.840100, lng: 7.035400 },
    { name: 'The Nigeria Police Divisional Headquarters', lat: 4.839800, lng: 7.036200 },
    { name: 'Total Petrol Station Mile 5', lat: 4.839500, lng: 7.037000 },
    { name: 'Salt and Pepper Restaurant and Bar', lat: 4.839200, lng: 7.037800 },
    { name: 'Alpha Crest Montessori Academy', lat: 4.838900, lng: 7.038600 },
    { name: 'Forte Oil', lat: 4.838600, lng: 7.039400 },
    { name: 'Rumuepirikom Civic Centre', lat: 4.838300, lng: 7.040200 },
    { name: 'Frankdona Global Resources', lat: 4.838000, lng: 7.041000 },
    { name: 'Game Villa Video game store', lat: 4.837700, lng: 7.041800 },
    { name: 'Saint Peter\'s Church, Rumuepirikom/Iwofe', lat: 4.837400, lng: 7.042600 },
    { name: 'NIMC ENROLLMENT CENTRE', lat: 4.837100, lng: 7.043400 },
    { name: 'Luxa Flair International Limited', lat: 4.836800, lng: 7.044200 },
    { name: 'Betking Shop wimpy junction', lat: 4.836500, lng: 7.045000 },
    { name: 'Mongoose-Life Community Church', lat: 4.836200, lng: 7.045800 },
    { name: 'Midline Pharmacy', lat: 4.835900, lng: 7.046600 },
    { name: 'RCCG, KINGDOM CHAPEL', lat: 4.835600, lng: 7.047400 },
    { name: 'Blessed Glow', lat: 4.835300, lng: 7.048200 },
    { name: 'Walmart organization', lat: 4.835000, lng: 7.049000 },
    { name: 'Rumuapiri Primary Health Centre', lat: 4.834700, lng: 7.049800 },
    { name: 'State Primary School Rumueme', lat: 4.834400, lng: 7.050600 },
    { name: 'Mgbuike Town Hall', lat: 4.834100, lng: 7.051400 },
    { name: 'Manuchim Plaza Shopping mall', lat: 4.833800, lng: 7.052200 },
    { name: 'Blessed Image and wealth', lat: 4.833500, lng: 7.053000 },
    { name: 'Union Bank ATM', lat: 4.833200, lng: 7.053800 },
    { name: 'Onatex Furniture Showroom', lat: 4.832900, lng: 7.054600 },
    { name: 'Nze Joe & sons furniture showroom', lat: 4.832600, lng: 7.055400 },
    { name: 'Edugreen Schools', lat: 4.832300, lng: 7.056200 },
    { name: 'Chida Rd intersection', lat: 4.832000, lng: 7.057000 },
    { name: 'Wellness Hub', lat: 4.831700, lng: 7.057800 },
    { name: 'Mile 4 Mega Shop', lat: 4.831400, lng: 7.058600 },
    { name: 'St. Jerome\'s Chaplaincy Port Harcourt', lat: 4.831100, lng: 7.059400 },
    { name: 'Faith City Chapel International', lat: 4.830800, lng: 7.060200 },
    { name: 'The Church of Christ, Mile 4, Rumueme', lat: 4.830500, lng: 7.061000 },
    { name: 'Honeysparkles Bakery & Salon', lat: 4.830200, lng: 7.061800 },
    { name: 'Chitex Palace', lat: 4.829900, lng: 7.062600 },
    { name: 'Gambeta Groupe Limited', lat: 4.829600, lng: 7.063400 },
    { name: 'CALL BOB NIGERIA Rent A Car', lat: 4.829300, lng: 7.064200 },
    { name: 'Tombia St intersection', lat: 4.829000, lng: 7.065000 },
    { name: '1001 Photography', lat: 4.828700, lng: 7.065800 },
    { name: 'RUMUEME CIVIC CENTRE', lat: 4.828400, lng: 7.066600 },
    { name: 'Chief Johnson St intersection', lat: 4.828100, lng: 7.067400 },
    { name: 'Dominion City Church', lat: 4.827800, lng: 7.068200 },
    { name: 'Wide Choice Supermarket', lat: 4.827500, lng: 7.069000 },
    { name: 'Mopelvis Pharmacy', lat: 4.827200, lng: 7.069800 },
    { name: 'Oro-Owo Community Town Hall', lat: 4.826900, lng: 7.070600 },
    { name: 'Henry Dc Medicals', lat: 4.826600, lng: 7.071400 },
    { name: 'NWANYI OKWUKWE PLAZA', lat: 4.826300, lng: 7.072200 },
    { name: 'Eco Bankport Harcourt', lat: 4.826000, lng: 7.073000 },
    { name: 'Oroworukwo Mini Health Centre', lat: 4.825700, lng: 7.073800 },
    { name: 'Rivers State College of Health Science', lat: 4.825400, lng: 7.074600 },
    { name: 'Model Girls secondary school', lat: 4.825100, lng: 7.075400 },
    { name: 'Kilimanjaro Restaurant Agip Road', lat: 4.824800, lng: 7.076200 },
    { name: 'Access Bank Plc Agip Road Branch', lat: 4.824500, lng: 7.077000 },
    { name: 'Chinda Oil', lat: 4.824200, lng: 7.077800 },
    { name: 'OCEANIC HOMES AND INTERIORS', lat: 4.823900, lng: 7.078600 },
    { name: 'Firstbank ATM', lat: 4.823600, lng: 7.079400 },
    { name: 'Buyrite Sanitary & Bathroom accessories', lat: 4.823300, lng: 7.080200 },
    { name: 'Frank Kelly Global', lat: 4.823000, lng: 7.081000 },
    { name: 'GTCO', lat: 4.822700, lng: 7.081800 },
    { name: 'Sherry Place', lat: 4.822400, lng: 7.082600 },
    { name: 'Isreal Hotels And Suites', lat: 4.822100, lng: 7.083400 },
    { name: 'Skene Motors Workshop', lat: 4.821800, lng: 7.084200 },
    { name: 'Delicious dishes', lat: 4.821500, lng: 7.085000 },
    { name: 'Greenland Doors And Building Tech', lat: 4.821200, lng: 7.085800 },
    { name: 'Nigeria Customs Service', lat: 4.820900, lng: 7.086600 },
    { name: 'Aba-Ceorg Road intersection', lat: 4.820600, lng: 7.087400 },
    { name: 'Fidelity Bank', lat: 4.820300, lng: 7.088200 },
    { name: 'Access Bank Plc Ph', lat: 4.820000, lng: 7.089000 },
    { name: 'Rivers State Environmental', lat: 4.819700, lng: 7.089800 },
    { name: 'Ring Petroleum', lat: 4.819400, lng: 7.090600 },
    { name: 'His Grace Aluminium Company Limited', lat: 4.819100, lng: 7.091400 },
    { name: 'Rice world store', lat: 4.818800, lng: 7.092200 },
    { name: 'Essential Services', lat: 4.818500, lng: 7.093000 },
    { name: 'University Of Portharcourt', lat: 4.818200, lng: 7.093800 },
    { name: 'Genesis Restaurant, UST Roundabout', lat: 4.817900, lng: 7.094600 },
    { name: 'College Of Continuing Education (Uniport)', lat: 4.817600, lng: 7.095400 },
    { name: 'State Primary School (Nkpolu)', lat: 4.817300, lng: 7.096200 },
    { name: 'Airtel Shop Cell phone store', lat: 4.817000, lng: 7.097000 },
    { name: 'Nkpolu Oroworukwo Shopping Plaza', lat: 4.816700, lng: 7.097800 },
    { name: 'Wechie St intersection', lat: 4.816400, lng: 7.098600 },
    { name: 'Praise restaurant and bar', lat: 4.816100, lng: 7.099400 },
    { name: 'The Beautifiers Gym', lat: 4.815800, lng: 7.100200 },
    { name: 'Mentlojane Super Store', lat: 4.815500, lng: 7.101000 },
    { name: 'CHRIST REALM ASSEMBLY', lat: 4.815200, lng: 7.101800 },
    { name: 'Lemekonsult Pharmacy', lat: 4.814900, lng: 7.102600 },
    { name: 'Fresco Stores', lat: 4.814600, lng: 7.103400 },
    { name: 'The Wisdom Center', lat: 4.814300, lng: 7.104200 },
    { name: 'CITY OF CHAMPIONS', lat: 4.814000, lng: 7.105000 },
    { name: 'Port Harcourt Medical Investigations Centre', lat: 4.813700, lng: 7.105800 },
    { name: 'Adventist Nursery Basic Education', lat: 4.813400, lng: 7.106600 },
    { name: 'Nike Art Gallery', lat: 4.813100, lng: 7.107400 },
    { name: 'Market Square Auto parts store', lat: 4.812800, lng: 7.108200 },
    { name: 'Elechi Road intersection', lat: 4.812500, lng: 7.109000 },
    { name: 'ANDY TECH', lat: 4.812200, lng: 7.109800 },
    { name: 'Blessed Kendo Electronics', lat: 4.811900, lng: 7.110600 },
    { name: 'SDD - Mile 3 Park', lat: 4.811600, lng: 7.111400 },
    { name: 'Wobo St intersection', lat: 4.811300, lng: 7.112200 },
    { name: 'MRS(Filling Station)', lat: 4.811000, lng: 7.113000 },
    { name: 'Tigerfoods', lat: 4.810700, lng: 7.113800 },
    { name: 'Maiduguri St intersection', lat: 4.810400, lng: 7.114600 },
    { name: 'Ojiegbu St intersection', lat: 4.810100, lng: 7.115400 },
    { name: 'Delta Express Ltd - Port Harcourt Mile 2 Terminal', lat: 4.809800, lng: 7.116200 },
    { name: 'Oando Station', lat: 4.809500, lng: 7.117000 },
    { name: 'The Church of Jesus Christ of Latter', lat: 4.809200, lng: 7.117800 },
    { name: 'Ejigini St intersection', lat: 4.808900, lng: 7.118600 },
    { name: 'IMO City Mass Transit', lat: 4.808600, lng: 7.119400 },
    { name: 'Chicken Republic-UST/IKOKU', lat: 4.808000, lng: 7.121000 },
    { name: 'Abissa St intersection', lat: 4.807700, lng: 7.121800 },
    { name: 'Odunze St intersection', lat: 4.807400, lng: 7.122600 },
    { name: 'G standard top Technical', lat: 4.807100, lng: 7.123400 },
    { name: 'Ikowku Oil Market', lat: 4.806800, lng: 7.124200 },
    { name: 'NairaBet(Ikoku)', lat: 4.806500, lng: 7.125000 },
    { name: 'School Rd intersection', lat: 4.806200, lng: 7.125800 },
    { name: 'Azikiwe St intersection', lat: 4.805900, lng: 7.126600 },
    { name: 'UGOXIAN TELECOMMUNIC', lat: 4.805600, lng: 7.127400 },
    { name: 'Diamond C&A', lat: 4.805300, lng: 7.128200 },
    { name: 'Emeke Japan International Company', lat: 4.805000, lng: 7.129000 },
    { name: 'SDD - Diobu', lat: 4.804700, lng: 7.129800 },
    { name: 'NNPC', lat: 4.804400, lng: 7.130600 },
    { name: 'Restopark Oil & Gas', lat: 4.804100, lng: 7.131400 },
    { name: 'Hyper Filling Station, Ikoku', lat: 4.803800, lng: 7.132200 },
    { name: 'Adelabu St intersection', lat: 4.803500, lng: 7.133000 },
    { name: 'Cudero Designs and Prints Limited', lat: 4.803200, lng: 7.133800 },
    { name: 'Meridian Hospital', lat: 4.802600, lng: 7.135400 },
    { name: 'St Thomas Anglican Church', lat: 4.802300, lng: 7.136200 },
    { name: 'HyperCITY Ikoku', lat: 4.802000, lng: 7.137000 },
    { name: 'RIVERS SPORTS SHOP PORT HARCOURT', lat: 4.801700, lng: 7.137800 },
    { name: 'Immaculate Gospel Mission', lat: 4.801400, lng: 7.138600 },
    { name: 'Emole St intersection', lat: 4.801100, lng: 7.139400 },
    { name: 'Jonik Electronics and Furniture', lat: 4.800800, lng: 7.140200 },
    { name: 'Assemblies Of God', lat: 4.800500, lng: 7.141000 },
    { name: 'Love Walk Assembly', lat: 4.800200, lng: 7.141800 },
    { name: 'Blessed Ononuju', lat: 4.799900, lng: 7.142600 },
    { name: 'Anozle St intersection', lat: 4.799600, lng: 7.143400 },
    { name: 'Shepherdhills Int\'l schools', lat: 4.799300, lng: 7.144200 },
    { name: 'TechHub', lat: 4.799000, lng: 7.145000 },
    { name: 'Prince Mega Stores Shopping mall', lat: 4.798700, lng: 7.145800 },
    { name: 'Maggie Fast Food and Restaurant', lat: 4.798400, lng: 7.146600 },
    { name: 'Opata St intersection', lat: 4.798100, lng: 7.147400 },
    { name: 'British-American Insurance Co', lat: 4.797800, lng: 7.148200 },
    { name: 'Lontor Brand Shop Port Harcourt', lat: 4.797500, lng: 7.149000 },
    { name: 'Luxy Hotels Bar and Restaurant', lat: 4.797200, lng: 7.149800 },
    { name: 'Niger-Bay Pharmacy', lat: 4.796900, lng: 7.150600 },
    { name: 'Izu-Tech Electrical Company Nigeria', lat: 4.796600, lng: 7.151400 },
    { name: 'Ken Joe Electrical Giant', lat: 4.796300, lng: 7.152200 },
    { name: 'Chief Gilbert Amadi St intersection', lat: 4.796000, lng: 7.153000 },
    { name: 'Buguma Street intersection', lat: 4.795700, lng: 7.153800 },
    { name: 'Just Happy Foods', lat: 4.795400, lng: 7.154600 },
    { name: 'First GloryLand Bible Church', lat: 4.795100, lng: 7.155400 },
    { name: 'Tianshi World Speciality Shop', lat: 4.794800, lng: 7.156200 },
    { name: 'DHL Service Point', lat: 4.794500, lng: 7.157000 },
    { name: 'Mouka Foam Mattress store', lat: 4.794200, lng: 7.157800 },
    { name: 'Heritage Bank', lat: 4.793900, lng: 7.158600 },
    { name: 'Favour Technical Tools And Safety', lat: 4.793600, lng: 7.159400 },
    { name: 'Rivers State Board of Internal Revenue', lat: 4.793300, lng: 7.160200 },
    { name: 'St. Andrew\'s Church, Mile 1 Diobu', lat: 4.793000, lng: 7.161000 },
    { name: 'Emelike St intersection', lat: 4.792700, lng: 7.161800 },
    { name: 'Mile 1 Market', lat: 4.792400, lng: 7.162600 },
    { name: 'Safari Fast Food', lat: 4.792100, lng: 7.163400 },
    { name: 'Icon Cosmetics Limited', lat: 4.791800, lng: 7.164200 },
    { name: 'Mile 1 Shopping Complex', lat: 4.791500, lng: 7.165000 },
    { name: 'SDD - Mile 1', lat: 4.790900, lng: 7.166600 },
    { name: 'Saint Andrew\'s Anglican Church, Diobu', lat: 4.790600, lng: 7.167400 },
    { name: 'Rumuola St intersection', lat: 4.790300, lng: 7.168200 },
    { name: 'Diobu Central Mosque', lat: 4.790000, lng: 7.169000 },
    { name: 'Christian Judicial University', lat: 4.789700, lng: 7.169800 },
    { name: 'Access Bank Plc Ph, 50 Ikwerre Road', lat: 4.789400, lng: 7.170600 },
    { name: 'Union Bank', lat: 4.789100, lng: 7.171400 },
    { name: 'Elotex Pharmacy', lat: 4.788800, lng: 7.172200 },
    { name: 'RIVERS NYSC STATE SECRETARIAT', lat: 4.788500, lng: 7.173000 },
    { name: 'Prince Mega Agency Cosmetic Giant 1', lat: 4.787900, lng: 7.174600 },
    { name: 'Cliff Studios', lat: 4.787600, lng: 7.175400 },
    { name: 'FCMB IKWERRE I BRANCH', lat: 4.787300, lng: 7.176200 },
    { name: 'Fotozila', lat: 4.787000, lng: 7.177000 },
    { name: 'Marcon Steel Co', lat: 4.786700, lng: 7.177800 },
    { name: 'Vassion Media', lat: 4.786400, lng: 7.178600 },
    { name: 'Conoil Station', lat: 4.786100, lng: 7.179400 },
    { name: 'Mile 1 Police Station', lat: 4.785800, lng: 7.180200 },
  ];

  // Merge all landmarks
  for (const segmentGroup of segmentsWithLandmarks) {
    for (const landmark of segmentGroup.landmarks) {
      allLandmarks.set(landmark.name, landmark);
    }
  }

  for (const landmark of longRouteLandmarks) {
    allLandmarks.set(landmark.name, landmark);
  }

  // Create location for each unique landmark
  let landmarkCount = 0;
  for (const [name, landmark] of allLandmarks) {
    try {
      // Check if landmark already exists as a location
      const existingLocation = await dataSource.query(
        `SELECT id FROM locations WHERE name = $1 LIMIT 1;`,
        [name]
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
            true, // isVerified
            true, // isActive
          ]
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
      landmarks: [
        { name: 'Domino\'s Pizza Choba', lat: 4.902400, lng: 6.918200 },
        { name: 'YKC Junction', lat: 4.902100, lng: 6.918500 },
        { name: 'SYNLAB Nigeria', lat: 4.901800, lng: 6.918900 },
        { name: 'GIG Logistics', lat: 4.901500, lng: 6.919200 },
        { name: 'Total Petrol Station Choba', lat: 4.901200, lng: 6.919600 },
        { name: 'Faro Event Center', lat: 4.900800, lng: 6.920100 },
        { name: 'Alakahia', lat: 4.895833, lng: 6.925556 },
        { name: 'Supreme Delich Restaurant', lat: 4.895500, lng: 6.926000 },
        { name: 'Tokyo Royal Hotel', lat: 4.895200, lng: 6.926500 },
        { name: 'WHITE HOUSE LODGE', lat: 4.894800, lng: 6.927000 },
        { name: 'Aka Plaza Alakahia', lat: 4.894500, lng: 6.927500 },
        { name: 'GUO Logistics Choba', lat: 4.894000, lng: 6.928200 },
        { name: 'Rumuosi', lat: 4.883333, lng: 6.941667 },
        { name: 'Ola banky fuel station', lat: 4.883000, lng: 6.942100 },
        { name: 'Mobil Filling Station', lat: 4.882700, lng: 6.942600 },
        { name: 'Bareke Memorial Hospital', lat: 4.882400, lng: 6.943100 },
        { name: 'Chilotem Electrical & Electronics', lat: 4.882100, lng: 6.943600 },
        { name: '9ja Farmers Market', lat: 4.881800, lng: 6.944200 },
        { name: 'Rumosi market', lat: 4.881500, lng: 6.944700 },
        { name: 'St. Gabriel Catholic Church', lat: 4.881200, lng: 6.945200 },
        { name: 'ASSEMBLIES OF GOD CHURCH', lat: 4.880800, lng: 6.945800 },
        { name: 'Rumuagholu', lat: 4.878056, lng: 6.951389 },
        { name: 'Gade Place Hotel', lat: 4.877700, lng: 6.951900 },
        { name: 'MetroFlex Gym Rumuosi', lat: 4.877400, lng: 6.952400 },
        { name: 'Playfield Park and Event Center', lat: 4.877100, lng: 6.953000 },
        { name: 'konga Express', lat: 4.876800, lng: 6.953600 },
        { name: 'NUELA\'S PLACE RUMUAGHOLU', lat: 4.876500, lng: 6.954200 },
        { name: 'Minita Road', lat: 4.876200, lng: 6.954800 },
        { name: 'Lechez Hotels & Suites', lat: 4.875800, lng: 6.955500 },
        { name: 'The Lord\'s Chosen Estate', lat: 4.875400, lng: 6.956200 },
        { name: 'Twin Towers Specialist Hospitals', lat: 4.874900, lng: 6.957000 },
        { name: 'Nkpolu', lat: 4.870556, lng: 6.963889 },
        { name: 'Omega House Power Arena', lat: 4.870200, lng: 6.964400 },
        { name: 'Chicken Hills Nkpolu', lat: 4.869800, lng: 6.965000 },
        { name: 'St Jude\'s Catholic Church', lat: 4.869400, lng: 6.965600 },
        { name: 'Zenith Bank', lat: 4.868900, lng: 6.966300 },
        { name: 'Rumuokoro Park Market', lat: 4.864500, lng: 6.971500 },
        { name: 'Rumuokoro Motor Park', lat: 4.864200, lng: 6.972000 },
        { name: 'Rumuokoro Flyover', lat: 4.863889, lng: 6.972222 }
      ],
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
- Look for taxis or buses saying "Eliozu" or "Airforce"
- Tell conductor: "I dey go Eliozu"
- Vehicle follows East-West Road

**What to Look For:**
- Big flyover at Eliozu Junction
- Skyfall Mega Lounge at the junction
- Transport companies like Chisco
- Avigate will notify you when approaching`,
      landmarks: [
        { name: 'G. Agofure Motors', lat: 4.863500, lng: 6.973000 },
        { name: 'Sosils Logistics', lat: 4.863200, lng: 6.973800 },
        { name: 'Green Bands Pharmacy', lat: 4.862900, lng: 6.974600 },
        { name: 'Goodness and mercy mass transit', lat: 4.862600, lng: 6.975400 },
        { name: 'BB company', lat: 4.862300, lng: 6.976200 },
        { name: 'Ogename Pharmacy', lat: 4.862000, lng: 6.977000 },
        { name: 'TSK-G Pharmacy', lat: 4.861700, lng: 6.977800 },
        { name: 'Mbarie Services (NIG) LTD', lat: 4.861400, lng: 6.978600 },
        { name: 'Vet planet veterinary center', lat: 4.861100, lng: 6.979400 },
        { name: 'Bark Arena Pet Grooming Facility', lat: 4.860800, lng: 6.980200 },
        { name: 'Tech Mobile Integrated Service', lat: 4.860500, lng: 6.981000 },
        { name: 'GT Bank', lat: 4.860200, lng: 6.981800 },
        { name: 'Alhajia Estate', lat: 4.858611, lng: 6.983333 },
        { name: 'IJMB', lat: 4.858300, lng: 6.984100 },
        { name: 'Winners Chapel', lat: 4.858000, lng: 6.984900 },
        { name: 'No Slack Motors', lat: 4.857700, lng: 6.985700 },
        { name: 'Royal Guest House', lat: 4.857400, lng: 6.986500 },
        { name: 'Wisdom Gate School (Campus 2)', lat: 4.857100, lng: 6.987300 },
        { name: 'The Young Shall Grow Motors Limited', lat: 4.856800, lng: 6.988100 },
        { name: 'Franksele Academy', lat: 4.856500, lng: 6.988900 },
        { name: 'Uni-Ike', lat: 4.856200, lng: 6.989700 },
        { name: 'Amanda\'s fashion collection', lat: 4.855900, lng: 6.990500 },
        { name: 'Megastar Technical & Construction Company', lat: 4.855600, lng: 6.991300 },
        { name: 'Mifoods', lat: 4.855300, lng: 6.992100 },
        { name: 'Chisco Bush Bar', lat: 4.855000, lng: 6.992900 },
        { name: 'Chisco', lat: 4.854700, lng: 6.993700 },
        { name: 'Kotec Brick Tiles', lat: 4.854400, lng: 6.994500 },
        { name: 'De Chico Group', lat: 4.854100, lng: 6.995300 },
        { name: 'CakesbySucre', lat: 4.853800, lng: 6.996100 },
        { name: 'BANDITOS LOUNGE SPORTS BAR', lat: 4.853500, lng: 6.996900 },
        { name: 'Peace Estate', lat: 4.852778, lng: 6.994444 },
        { name: 'ShopBy Online Mall', lat: 4.852400, lng: 6.995200 },
        { name: 'Bellberry', lat: 4.852100, lng: 6.996000 },
        { name: 'TOC CANADA', lat: 4.851800, lng: 6.996800 },
        { name: 'Arecent Solutions', lat: 4.851500, lng: 6.997600 },
        { name: 'Clendac Oil', lat: 4.851200, lng: 6.998400 },
        { name: 'UZOGUD', lat: 4.850900, lng: 6.999200 },
        { name: 'Lawban Media and PR', lat: 4.850600, lng: 7.000000 },
        { name: 'Genton Integrated World Ltd', lat: 4.850300, lng: 7.000800 },
        { name: 'Shortlet Homes Port Harcourt', lat: 4.850000, lng: 7.001600 },
        { name: 'Grace Covenant Ministries', lat: 4.849700, lng: 7.002400 },
        { name: 'INEC', lat: 4.849400, lng: 7.003200 },
        { name: 'AEC AGROSYSTEMS', lat: 4.849100, lng: 7.004000 },
        { name: '619 LOUNGE & BAR', lat: 4.848800, lng: 7.004800 },
        { name: 'City Roller transport company', lat: 4.848500, lng: 7.005600 },
        { name: 'ROYAL LINK', lat: 4.848200, lng: 7.006400 },
        { name: 'Chisco Transport Nigeria Limited', lat: 4.847900, lng: 7.007200 },
        { name: 'Wholeman Hospital', lat: 4.847600, lng: 7.008000 },
        { name: 'Evangel Medical Laboratory', lat: 4.847300, lng: 7.008800 },
        { name: 'Tribel Global Motors', lat: 4.847000, lng: 7.009600 },
        { name: 'Rukpakwolusi', lat: 4.846700, lng: 7.010400 },
        { name: 'Nkpologwu Unity Hall', lat: 4.846400, lng: 7.011200 },
        { name: 'T.G.M MOSQUE', lat: 4.846100, lng: 7.012000 },
        { name: 'Anna Medical Centre', lat: 4.845800, lng: 7.012800 },
        { name: 'The Life Plus Community Church', lat: 4.845556, lng: 7.003889 },
        { name: 'Jehovah Rapha\'s Clinics', lat: 4.845400, lng: 7.004600 },
        { name: 'Desicon Engineering Limited', lat: 4.845100, lng: 7.005400 },
        { name: 'RE-BEST ENTERPRISE', lat: 4.844800, lng: 7.006200 },
        { name: 'Umenco Oil', lat: 4.844500, lng: 7.007000 },
        { name: 'The Lord\'s Chosen', lat: 4.844200, lng: 7.007800 },
        { name: 'Miracle Electrical Services Limited', lat: 4.843900, lng: 7.008600 },
        { name: 'Cossel Construction Company Nigeria', lat: 4.843600, lng: 7.009400 },
        { name: 'De-Amicable Global Communications', lat: 4.843300, lng: 7.010200 },
        { name: 'Echema Hotels', lat: 4.843000, lng: 7.011000 },
        { name: 'Skyfall Mega Lounge', lat: 4.845556, lng: 7.003889 }
      ],
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

**Alternative - Continue from Choba:**
If you stayed on the Airforce vehicle from Choba/Rumuokoro:
- Stay in the vehicle
- No need to drop at Eliozu
- Direct to Airforce Junction

**At Airforce:**
- Look for Big Treat Shopping Mall
- Stadium Road intersection
- MTN Shop and various stores
- Avigate will notify you`,
      landmarks: [
        { name: 'Thrive Technologies Nig', lat: 4.845200, lng: 7.004500 },
        { name: 'Skyfall Mega Lounge', lat: 4.845556, lng: 7.003889 },
        { name: 'WhypeMasters', lat: 4.844800, lng: 7.005300 },
        { name: 'Daba Ave', lat: 4.844400, lng: 7.006100 },
        { name: 'SUPERCITY MARKET', lat: 4.844000, lng: 7.006900 },
        { name: 'Mount On Ave', lat: 4.843600, lng: 7.007700 },
        { name: 'Nyeweibos Cl', lat: 4.843200, lng: 7.008500 },
        { name: 'Aku Road', lat: 4.842800, lng: 7.009300 },
        { name: 'Mercy Cl', lat: 4.842400, lng: 7.010100 },
        { name: 'Pipeline Rd', lat: 4.842000, lng: 7.010900 },
        { name: 'Wellness therapy', lat: 4.841600, lng: 7.011700 },
        { name: 'Apex Hilton Hotel', lat: 4.841111, lng: 7.008333 },
        { name: 'Kienkares International Fashion Accessories', lat: 4.840800, lng: 7.009100 },
        { name: 'Pacesetters Christian Assembly', lat: 4.840400, lng: 7.009900 },
        { name: 'Diplomat Ave', lat: 4.840000, lng: 7.010700 },
        { name: 'Brockville Montessori School', lat: 4.839600, lng: 7.011500 },
        { name: 'Gift Legate', lat: 4.839200, lng: 7.012300 },
        { name: 'Legal Clique Law Firm', lat: 4.838800, lng: 7.013100 },
        { name: 'Myrtle International School', lat: 4.838400, lng: 7.013900 },
        { name: 'SDD - GU Ake/Obasanjo Bypass', lat: 4.838000, lng: 7.014700 },
        { name: 'Gtext Holdings Port Harcourt', lat: 4.837600, lng: 7.015500 },
        { name: 'Krystal academy', lat: 4.837200, lng: 7.016300 },
        { name: 'Esthycollections', lat: 4.836800, lng: 7.017100 },
        { name: 'Global shaves', lat: 4.836667, lng: 7.013889 },
        { name: 'Dignity metal fabrication/Welding', lat: 4.836400, lng: 7.014700 },
        { name: 'Progressive brothers club of Port Harcourt', lat: 4.836000, lng: 7.015500 },
        { name: 'Toa Rd', lat: 4.835600, lng: 7.016300 },
        { name: 'Port Harcourt - Aba Expy', lat: 4.835200, lng: 7.017100 },
        { name: 'PA TABLE WATER COMPANY', lat: 4.834800, lng: 7.017900 },
        { name: 'Air Force', lat: 4.833333, lng: 7.016667 },
        { name: 'Stadium Rd', lat: 4.833900, lng: 7.017700 },
        { name: 'Big Treat Shopping mall', lat: 4.833500, lng: 7.018500 },
        { name: 'Happy Bite', lat: 4.833100, lng: 7.019300 },
        { name: 'MasParts Technology Apple Store', lat: 4.832700, lng: 7.020100 },
        { name: 'Arvel Travel and Tours', lat: 4.832300, lng: 7.020900 },
        { name: 'Oak Park and Garden', lat: 4.831900, lng: 7.021700 },
        { name: 'House of Bole Barbecue', lat: 4.831500, lng: 7.022500 },
        { name: 'The King\'s Assembly', lat: 4.831100, lng: 7.023300 },
        { name: 'Jumbo Sports Mart', lat: 4.830700, lng: 7.024100 },
        { name: 'Mystique Press Limited', lat: 4.830300, lng: 7.024900 },
        { name: 'Benjack Group', lat: 4.829900, lng: 7.025700 },
        { name: 'Onealpha Ryde', lat: 4.829500, lng: 7.026500 },
        { name: 'Red Star Express', lat: 4.829100, lng: 7.027300 },
        { name: 'MTN Shop-Benjack Port Harcourt', lat: 4.828700, lng: 7.028100 },
        { name: 'Prince Amadi Cl', lat: 4.828300, lng: 7.028900 },
        { name: 'Cherice Garden Hotel Annex', lat: 4.827900, lng: 7.029700 }
      ],
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
      landmarks: [
        { name: 'SDD - Rumuokoro Junction', lat: 4.863889, lng: 6.972222 },
        { name: 'Emmanuel Anglican Church', lat: 4.863500, lng: 6.973000 },
        { name: 'FCMB IKWERRE II BRANCH', lat: 4.863200, lng: 6.973800 },
        { name: 'Wilson Pharmacy', lat: 4.862900, lng: 6.974600 },
        { name: 'Deli Spices Restaurant', lat: 4.862600, lng: 6.975400 },
        { name: 'Bet9ja', lat: 4.862300, lng: 6.976200 },
        { name: 'Access Bank', lat: 4.862000, lng: 6.977000 },
        { name: 'Anointed Treasure Ministries (ATM)', lat: 4.861700, lng: 6.977800 },
        { name: 'Bestman Adult Educational center', lat: 4.861400, lng: 6.978600 },
        { name: 'Bob Izua Motors', lat: 4.861100, lng: 6.979400 },
        { name: 'Origin Appliances', lat: 4.860800, lng: 6.980200 },
        { name: 'NEOLIFE Healthcare', lat: 4.860500, lng: 6.981000 },
        { name: 'FCMB RUMUOKORO BRANCH', lat: 4.860200, lng: 6.981800 },
        { name: 'Celestial Church Of Christ, Parish 2', lat: 4.859900, lng: 6.982600 },
        { name: 'Klein Graphics', lat: 4.859600, lng: 6.983400 },
        { name: 'RCCG Jesus Arena', lat: 4.859300, lng: 6.984200 },
        { name: 'Harrison Oil', lat: 4.859000, lng: 6.985000 },
        { name: 'Tamcy4Eva', lat: 4.858700, lng: 6.985800 },
        { name: 'Crystal Dew Integrated Services', lat: 4.858400, lng: 6.986600 },
        { name: 'Princekin Hotel', lat: 4.858100, lng: 6.987400 },
        { name: 'Mgbuike Hall', lat: 4.857800, lng: 6.988200 },
        { name: 'MagicGlow Beauty salon', lat: 4.857500, lng: 6.989000 },
        { name: 'Calabar Kitchens Delicious Food', lat: 4.857200, lng: 6.989800 },
        { name: 'MCC Operational Base', lat: 4.856900, lng: 6.990600 },
        { name: 'Chidi-Rich Integrated Business Limited', lat: 4.856600, lng: 6.991400 },
        { name: 'Evergreen Shopping Centre', lat: 4.856300, lng: 6.992200 },
        { name: 'Hikvision', lat: 4.856000, lng: 6.993000 },
        { name: 'Maichini Beauty Home', lat: 4.855700, lng: 6.993800 },
        { name: 'Evelyn Natural Hair Beauty Salon', lat: 4.855400, lng: 6.994600 },
        { name: 'L 37 Global Pharmacy', lat: 4.855100, lng: 6.995400 },
        { name: 'Ifex Express Limited', lat: 4.854800, lng: 6.996200 },
        { name: 'Foundation Marble & Granite Company Ltd', lat: 4.854500, lng: 6.997000 },
        { name: 'Worlu Street intersection', lat: 4.854200, lng: 6.997800 },
        { name: 'Eterna', lat: 4.853900, lng: 6.998600 },
        { name: 'The Europe Shop Intl Shopping mall', lat: 4.853600, lng: 6.999400 },
        { name: 'Lavished Grace Assembly', lat: 4.853300, lng: 7.000200 },
        { name: 'BLESSED FRANK SPARMARKET', lat: 4.853000, lng: 7.001000 },
        { name: 'Rumugbo Primary Health Centre', lat: 4.852700, lng: 7.001800 },
        { name: 'Rumugbo Civic Centre Hall', lat: 4.852400, lng: 7.002600 },
        { name: 'Church of Christ', lat: 4.852100, lng: 7.003400 },
        { name: 'David Veterinary Centre', lat: 4.851800, lng: 7.004200 },
        { name: 'Austino Technical Resources Limited', lat: 4.851500, lng: 7.005000 },
        { name: 'Everyday Supamakett Port Harcourt', lat: 4.851200, lng: 7.005800 },
        { name: 'Rumugbo Junction', lat: 4.858056, lng: 6.978889 },
        { name: 'Hisense', lat: 4.850900, lng: 7.006600 },
        { name: 'Psychiatric Hospital Lane', lat: 4.850600, lng: 7.007400 },
        { name: 'Remedles Herbal Store', lat: 4.850300, lng: 7.008200 },
        { name: 'Everyday Supermarket', lat: 4.850000, lng: 7.009000 },
        { name: 'Obiwali House', lat: 4.849700, lng: 7.009800 },
        { name: 'Nice Up Beauty Complex', lat: 4.849400, lng: 7.010600 },
        { name: 'Rico foods cereals and beverages', lat: 4.849100, lng: 7.011400 },
        { name: 'Holy Trinity Anglican Church Rumuapara', lat: 4.848800, lng: 7.012200 },
        { name: '9mobile SIM Registration Centre', lat: 4.848500, lng: 7.013000 },
        { name: 'Seventh-day Adventist Church Rumuokwuta', lat: 4.848200, lng: 7.013800 },
        { name: 'Auto Clinicar Services', lat: 4.847900, lng: 7.014600 },
        { name: 'Fountain of Power Christian Centre', lat: 4.847600, lng: 7.015400 },
        { name: 'Oak View Hotel and Suites', lat: 4.847300, lng: 7.016200 },
        { name: 'Kent Investment Co. Ltd', lat: 4.847000, lng: 7.017000 },
        { name: 'EverAfter', lat: 4.846700, lng: 7.017800 },
        { name: 'SUMEC FIRMAN', lat: 4.846400, lng: 7.018600 },
        { name: 'Bills Pharmacy Rumuokwuta', lat: 4.846100, lng: 7.019400 },
        { name: 'Orlu Market Road intersection', lat: 4.845800, lng: 7.020200 },
        { name: 'Success Super Stores', lat: 4.845500, lng: 7.021000 },
        { name: 'Nice Up', lat: 4.850556, lng: 6.988611 },
        { name: 'GTCO', lat: 4.850556, lng: 6.988611 },
        { name: 'GTBank - GTExpress ATM', lat: 4.845200, lng: 7.021800 },
        { name: 'Quick Lube Automobile Services', lat: 4.844900, lng: 7.022600 },
        { name: 'AP Filling Station (Mile 5)', lat: 4.847778, lng: 6.993333 },
        { name: 'De Label Beauty Gallery', lat: 4.844600, lng: 7.023400 },
        { name: 'Kingdom Life Centre', lat: 4.844300, lng: 7.024200 },
        { name: 'Multinet', lat: 4.844000, lng: 7.025000 },
        { name: 'EstateTown Hall', lat: 4.843700, lng: 7.025800 },
        { name: 'Kingdom Hall Of Jehovah\'s Witnesses', lat: 4.843400, lng: 7.026600 },
        { name: 'Nwakama Dredge Global', lat: 4.843100, lng: 7.027400 },
        { name: 'Jen-Edim Academic Dunamic Campus', lat: 4.842800, lng: 7.028200 },
        { name: 'FIRSTLOVE Assembly', lat: 4.842500, lng: 7.029000 },
        { name: 'GINACENT PHARMACY', lat: 4.842200, lng: 7.029800 },
        { name: 'Kala Street intersection', lat: 4.841900, lng: 7.030600 },
        { name: 'Dotnova Hotels Limited', lat: 4.841600, lng: 7.031400 },
        { name: 'Spring Hospital', lat: 4.841300, lng: 7.032200 },
        { name: 'Model Primary Health Center, Rumuepirikom', lat: 4.845000, lng: 6.998611 },
        { name: 'Police Headquarters', lat: 4.843889, lng: 7.001111 },
        { name: 'Lash55 Glam', lat: 4.841000, lng: 7.033000 },
        { name: 'Rumukirikum Market', lat: 4.840700, lng: 7.033800 },
        { name: 'Deeper Life Bible Church, Epirikom', lat: 4.840400, lng: 7.034600 },
        { name: 'Onyiino Concepts', lat: 4.840100, lng: 7.035400 },
        { name: 'The Nigeria Police Divisional Headquarters', lat: 4.839800, lng: 7.036200 },
        { name: 'Total Petrol Station Mile 5', lat: 4.839500, lng: 7.037000 },
        { name: 'Salt and Pepper Restaurant and Bar', lat: 4.839200, lng: 7.037800 },
        { name: 'Alpha Crest Montessori Academy', lat: 4.838900, lng: 7.038600 },
        { name: 'Forte Oil', lat: 4.838600, lng: 7.039400 },
        { name: 'Rumuepirikom Civic Centre', lat: 4.838300, lng: 7.040200 },
        { name: 'Frankdona Global Resources', lat: 4.838000, lng: 7.041000 },
        { name: 'Game Villa Video game store', lat: 4.837700, lng: 7.041800 },
        { name: 'Saint Peter\'s Church, Rumuepirikom/Iwofe', lat: 4.837400, lng: 7.042600 },
        { name: 'NIMC ENROLLMENT CENTRE', lat: 4.837100, lng: 7.043400 },
        { name: 'Luxa Flair International Limited', lat: 4.836800, lng: 7.044200 },
        { name: 'Betking Shop wimpy junction', lat: 4.836500, lng: 7.045000 },
        { name: 'Mongoose-Life Community Church', lat: 4.836200, lng: 7.045800 },
        { name: 'Midline Pharmacy', lat: 4.835900, lng: 7.046600 },
        { name: 'RCCG, KINGDOM CHAPEL', lat: 4.835600, lng: 7.047400 },
        { name: 'Blessed Glow', lat: 4.835300, lng: 7.048200 },
        { name: 'Walmart organization', lat: 4.835000, lng: 7.049000 },
        { name: 'Rumuapiri Primary Health Centre', lat: 4.834700, lng: 7.049800 },
        { name: 'State Primary School Rumueme', lat: 4.834400, lng: 7.050600 },
        { name: 'Mgbuike Town Hall', lat: 4.834100, lng: 7.051400 },
        { name: 'Manuchim Plaza Shopping mall', lat: 4.833800, lng: 7.052200 },
        { name: 'Blessed Image and wealth', lat: 4.833500, lng: 7.053000 },
        { name: 'Union Bank ATM', lat: 4.833200, lng: 7.053800 },
        { name: 'Onatex Furniture Showroom', lat: 4.832900, lng: 7.054600 },
        { name: 'Nze Joe & sons furniture showroom', lat: 4.832600, lng: 7.055400 },
        { name: 'Edugreen Schools', lat: 4.832300, lng: 7.056200 },
        { name: 'Chida Bus Stop', lat: 4.835000, lng: 7.015000 },
        { name: 'Chida Rd intersection', lat: 4.832000, lng: 7.057000 },
        { name: 'Wellness Hub', lat: 4.831700, lng: 7.057800 },
        { name: 'Mile 4 Mega Shop', lat: 4.831400, lng: 7.058600 },
        { name: 'St. Jerome\'s Chaplaincy Port Harcourt', lat: 4.831100, lng: 7.059400 },
        { name: 'Faith City Chapel International', lat: 4.830800, lng: 7.060200 },
        { name: 'The Church of Christ, Mile 4, Rumueme', lat: 4.830500, lng: 7.061000 },
        { name: 'Honeysparkles Bakery & Salon', lat: 4.830200, lng: 7.061800 },
        { name: 'Chitex Palace', lat: 4.829900, lng: 7.062600 },
        { name: 'Gambeta Groupe Limited', lat: 4.829600, lng: 7.063400 },
        { name: 'CALL BOB NIGERIA Rent A Car', lat: 4.829300, lng: 7.064200 },
        { name: 'Tombia St intersection', lat: 4.829000, lng: 7.065000 },
        { name: '1001 Photography', lat: 4.828700, lng: 7.065800 },
        { name: 'RUMUEME CIVIC CENTRE', lat: 4.828400, lng: 7.066600 },
        { name: 'Chief Johnson St intersection', lat: 4.828100, lng: 7.067400 },
        { name: 'Dominion City Church', lat: 4.827800, lng: 7.068200 },
        { name: 'Wide Choice Supermarket', lat: 4.827500, lng: 7.069000 },
        { name: 'Mopelvis Pharmacy', lat: 4.827200, lng: 7.069800 },
        { name: 'Oro-Owo Community Town Hall', lat: 4.826900, lng: 7.070600 },
        { name: 'Henry Dc Medicals', lat: 4.826600, lng: 7.071400 },
        { name: 'NWANYI OKWUKWE PLAZA', lat: 4.826300, lng: 7.072200 },
        { name: 'Eco Bankport Harcourt', lat: 4.826000, lng: 7.073000 },
        { name: 'Oroworukwo Mini Health Centre', lat: 4.825700, lng: 7.073800 },
        { name: 'Rivers State College of Health Science', lat: 4.825400, lng: 7.074600 },
        { name: 'Model Girls secondary school', lat: 4.825100, lng: 7.075400 },
        { name: 'Kilimanjaro Restaurant Agip Road', lat: 4.824800, lng: 7.076200 },
        { name: 'Agip Rd intersection (Roundabout)', lat: 4.829444, lng: 7.022778 },
        { name: 'Access Bank Plc Agip Road Branch', lat: 4.824500, lng: 7.077000 },
        { name: 'Chinda Oil', lat: 4.824200, lng: 7.077800 },
        { name: 'OCEANIC HOMES AND INTERIORS', lat: 4.823900, lng: 7.078600 },
        { name: 'Firstbank ATM', lat: 4.823600, lng: 7.079400 },
        { name: 'Buyrite Sanitary & Bathroom accessories', lat: 4.823300, lng: 7.080200 },
        { name: 'Frank Kelly Global', lat: 4.823000, lng: 7.081000 },
        { name: 'GTCO', lat: 4.822700, lng: 7.081800 },
        { name: 'Sherry Place', lat: 4.822400, lng: 7.082600 },
        { name: 'Isreal Hotels And Suites', lat: 4.822100, lng: 7.083400 },
        { name: 'Skene Motors Workshop', lat: 4.821800, lng: 7.084200 },
        { name: 'Delicious dishes', lat: 4.821500, lng: 7.085000 },
        { name: 'Greenland Doors And Building Tech', lat: 4.821200, lng: 7.085800 },
        { name: 'Nigeria Customs Service', lat: 4.820900, lng: 7.086600 },
        { name: 'Aba-Ceorg Road intersection', lat: 4.820600, lng: 7.087400 },
        { name: 'Fidelity Bank', lat: 4.820300, lng: 7.088200 },
        { name: 'Access Bank Plc Ph', lat: 4.820000, lng: 7.089000 },
        { name: 'Rivers State Environmental', lat: 4.819700, lng: 7.089800 },
        { name: 'Ring Petroleum', lat: 4.819400, lng: 7.090600 },
        { name: 'His Grace Aluminium Company Limited', lat: 4.819100, lng: 7.091400 },
        { name: 'Rice world store', lat: 4.818800, lng: 7.092200 },
        { name: 'Essential Services', lat: 4.818500, lng: 7.093000 },
        { name: 'University Of Portharcourt', lat: 4.818200, lng: 7.093800 },
        { name: 'Genesis Restaurant, UST Roundabout', lat: 4.817900, lng: 7.094600 },
        { name: 'College Of Continuing Education (Uniport)', lat: 4.817600, lng: 7.095400 },
        { name: 'State Primary School (Nkpolu)', lat: 4.817300, lng: 7.096200 },
        { name: 'Airtel Shop Cell phone store', lat: 4.817000, lng: 7.097000 },
        { name: 'Nkpolu Oroworukwo Shopping Plaza', lat: 4.816700, lng: 7.097800 },
        { name: 'Wechie St intersection', lat: 4.816400, lng: 7.098600 },
        { name: 'Praise restaurant and bar', lat: 4.816100, lng: 7.099400 },
        { name: 'The Beautifiers Gym', lat: 4.815800, lng: 7.100200 },
        { name: 'Mentlojane Super Store', lat: 4.815500, lng: 7.101000 },
        { name: 'CHRIST REALM ASSEMBLY', lat: 4.815200, lng: 7.101800 },
        { name: 'UST Rd (UST Roundabout)', lat: 4.825000, lng: 7.027222 },
        { name: 'Lemekonsult Pharmacy', lat: 4.814900, lng: 7.102600 },
        { name: 'Fresco Stores', lat: 4.814600, lng: 7.103400 },
        { name: 'The Wisdom Center', lat: 4.814300, lng: 7.104200 },
        { name: 'CITY OF CHAMPIONS', lat: 4.814000, lng: 7.105000 },
        { name: 'Port Harcourt Medical Investigations Centre', lat: 4.813700, lng: 7.105800 },
        { name: 'Adventist Nursery Basic Education', lat: 4.813400, lng: 7.106600 },
        { name: 'Nike Art Gallery', lat: 4.813100, lng: 7.107400 },
        { name: 'Market Square Auto parts store', lat: 4.812800, lng: 7.108200 },
        { name: 'Elechi Road intersection', lat: 4.812500, lng: 7.109000 },
        { name: 'ANDY TECH', lat: 4.812200, lng: 7.109800 },
        { name: 'Blessed Kendo Electronics', lat: 4.811900, lng: 7.110600 },
        { name: 'SDD - Mile 3 Park', lat: 4.811600, lng: 7.111400 },
        { name: 'Wobo St intersection', lat: 4.811300, lng: 7.112200 },
        { name: 'MRS(Filling Station)', lat: 4.811000, lng: 7.113000 },
        { name: 'Tigerfoods', lat: 4.810700, lng: 7.113800 },
        { name: 'Maiduguri St intersection', lat: 4.810400, lng: 7.114600 },
        { name: 'Ojiegbu St intersection', lat: 4.810100, lng: 7.115400 },
        { name: 'Delta Express Ltd - Port Harcourt Mile 2 Terminal', lat: 4.809800, lng: 7.116200 },
        { name: 'Oando Station', lat: 4.809500, lng: 7.117000 },
        { name: 'The Church of Jesus Christ of Latter', lat: 4.809200, lng: 7.117800 },
        { name: 'Ejigini St intersection', lat: 4.808900, lng: 7.118600 },
        { name: 'IMO City Mass Transit', lat: 4.808600, lng: 7.119400 },
        { name: 'Austino Technical Resources Limited', lat: 4.808300, lng: 7.120200 },
        { name: 'Chicken Republic-UST/IKOKU', lat: 4.808000, lng: 7.121000 },
        { name: 'Abissa St intersection', lat: 4.807700, lng: 7.121800 },
        { name: 'Odunze St intersection', lat: 4.807400, lng: 7.122600 },
        { name: 'G standard top Technical', lat: 4.807100, lng: 7.123400 },
        { name: 'Ikowku Oil Market', lat: 4.806800, lng: 7.124200 },
        { name: 'NairaBet(Ikoku)', lat: 4.806500, lng: 7.125000 },
        { name: 'School Rd intersection', lat: 4.806200, lng: 7.125800 },
        { name: 'Azikiwe St intersection', lat: 4.805900, lng: 7.126600 },
        { name: 'UGOXIAN TELECOMMUNIC', lat: 4.805600, lng: 7.127400 },
        { name: 'Diamond C&A', lat: 4.805300, lng: 7.128200 },
        { name: 'Emeke Japan International Company', lat: 4.805000, lng: 7.129000 },
        { name: 'SDD - Diobu', lat: 4.804700, lng: 7.129800 },
        { name: 'NNPC', lat: 4.804400, lng: 7.130600 },
        { name: 'Restopark Oil & Gas', lat: 4.804100, lng: 7.131400 },
        { name: 'Hyper Filling Station, Ikoku', lat: 4.803800, lng: 7.132200 },
        { name: 'Adelabu St intersection', lat: 4.803500, lng: 7.133000 },
        { name: 'Cudero Designs and Prints Limited', lat: 4.803200, lng: 7.133800 },
        { name: 'Zenith Bank', lat: 4.802900, lng: 7.134600 },
        { name: 'Meridian Hospital', lat: 4.802600, lng: 7.135400 },
        { name: 'St Thomas Anglican Church', lat: 4.802300, lng: 7.136200 },
        { name: 'HyperCITY Ikoku', lat: 4.802000, lng: 7.137000 },
        { name: 'RIVERS SPORTS SHOP PORT HARCOURT', lat: 4.801700, lng: 7.137800 },
        { name: 'Immaculate Gospel Mission', lat: 4.801400, lng: 7.138600 },
        { name: 'Emole St intersection', lat: 4.801100, lng: 7.139400 },
        { name: 'Jonik Electronics and Furniture', lat: 4.800800, lng: 7.140200 },
        { name: 'Assemblies Of God', lat: 4.800500, lng: 7.141000 },
        { name: 'Love Walk Assembly', lat: 4.800200, lng: 7.141800 },
        { name: 'Blessed Ononuju', lat: 4.799900, lng: 7.142600 },
        { name: 'Anozle St intersection', lat: 4.799600, lng: 7.143400 },
        { name: 'Shepherdhills Int\'l schools', lat: 4.799300, lng: 7.144200 },
        { name: 'TechHub', lat: 4.799000, lng: 7.145000 },
        { name: 'Prince Mega Stores Shopping mall', lat: 4.798700, lng: 7.145800 },
        { name: 'Maggie Fast Food and Restaurant', lat: 4.798400, lng: 7.146600 },
        { name: 'Opata St intersection', lat: 4.798100, lng: 7.147400 },
        { name: 'British-American Insurance Co', lat: 4.797800, lng: 7.148200 },
        { name: 'Lontor Brand Shop Port Harcourt', lat: 4.797500, lng: 7.149000 },
        { name: 'Luxy Hotels Bar and Restaurant', lat: 4.797200, lng: 7.149800 },
        { name: 'Niger-Bay Pharmacy', lat: 4.796900, lng: 7.150600 },
        { name: 'Izu-Tech Electrical Company Nigeria', lat: 4.796600, lng: 7.151400 },
        { name: 'Ken Joe Electrical Giant', lat: 4.796300, lng: 7.152200 },
        { name: 'Chief Gilbert Amadi St intersection', lat: 4.796000, lng: 7.153000 },
        { name: 'Buguma Street intersection', lat: 4.795700, lng: 7.153800 },
        { name: 'Just Happy Foods', lat: 4.795400, lng: 7.154600 },
        { name: 'First GloryLand Bible Church', lat: 4.795100, lng: 7.155400 },
        { name: 'Tianshi World Speciality Shop', lat: 4.794800, lng: 7.156200 },
        { name: 'DHL Service Point', lat: 4.794500, lng: 7.157000 },
        { name: 'Mouka Foam Mattress store', lat: 4.794200, lng: 7.157800 },
        { name: 'Heritage Bank', lat: 4.793900, lng: 7.158600 },
        { name: 'Favour Technical Tools And Safety', lat: 4.793600, lng: 7.159400 },
        { name: 'Rivers State Board of Internal Revenue', lat: 4.793300, lng: 7.160200 },
        { name: 'St. Andrew\'s Church, Mile 1 Diobu', lat: 4.793000, lng: 7.161000 },
        { name: 'Emelike St intersection', lat: 4.792700, lng: 7.161800 },
        { name: 'Mile 1 Market', lat: 4.792400, lng: 7.162600 },
        { name: 'Safari Fast Food', lat: 4.792100, lng: 7.163400 },
        { name: 'Icon Cosmetics Limited', lat: 4.791800, lng: 7.164200 },
        { name: 'Mile 1 Shopping Complex', lat: 4.791500, lng: 7.165000 },
        { name: '9mobile SIM Registration Centre', lat: 4.791200, lng: 7.165800 },
        { name: 'SDD - Mile 1', lat: 4.790900, lng: 7.166600 },
        { name: 'Saint Andrew\'s Anglican Church, Diobu', lat: 4.790600, lng: 7.167400 },
        { name: 'Mile One Market Port Harcourt', lat: 4.819444, lng: 7.033333 },
        { name: 'Rumuola St intersection', lat: 4.790300, lng: 7.168200 },
        { name: 'Diobu Central Mosque', lat: 4.790000, lng: 7.169000 },
        { name: 'Christian Judicial University', lat: 4.789700, lng: 7.169800 },
        { name: 'Access Bank Plc Ph, 50 Ikwerre Road', lat: 4.789400, lng: 7.170600 },
        { name: 'Union Bank', lat: 4.789100, lng: 7.171400 },
        { name: 'Elotex Pharmacy', lat: 4.788800, lng: 7.172200 },
        { name: 'RIVERS NYSC STATE SECRETARIAT', lat: 4.788500, lng: 7.173000 },
        { name: 'Chisco Transport Nigeria Limited', lat: 4.788200, lng: 7.173800 },
        { name: 'Prince Mega Agency Cosmetic Giant 1', lat: 4.787900, lng: 7.174600 },
        { name: 'Cliff Studios', lat: 4.787600, lng: 7.175400 },
        { name: 'FCMB IKWERRE I BRANCH', lat: 4.787300, lng: 7.176200 },
        { name: 'Fotozila', lat: 4.787000, lng: 7.177000 },
        { name: 'Marcon Steel Co', lat: 4.786700, lng: 7.177800 },
        { name: 'Vassion Media', lat: 4.786400, lng: 7.178600 },
        { name: 'Conoil Station', lat: 4.786100, lng: 7.179400 },
        { name: 'Mile 1 Police Station', lat: 4.785800, lng: 7.180200 }
      ],
      isVerified: true,
    },
  ];

  const segmentIds: Record<string, string> = {};

  for (const segment of segments) {
    const intermediateStopsWithIds = await Promise.all(
      segment.intermediateStops.map(async stop => {
        // Try to find location for intermediate stop
        const locationResult = await dataSource.query(
          `SELECT id FROM locations WHERE name ILIKE $1 LIMIT 1;`,
          [`%${stop.name}%`]
        );
        
        return {
          locationId: locationResult[0]?.id || null,
          name: stop.name,
          order: stop.order,
          isOptional: stop.isOptional,
        };
      })
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
      ]
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
      description: 'Direct bus route from Rumuokoro along Ikwerre Road to Mile 1/Education area, passing through major stops like Mile 5, Mile 4, Mile 3, UST, and Mile 2',
      segments: [
        'Rumuokoro to Mile 1/Education (Direct Bus)',
      ],
      transportModes: ['bus'],
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
      ]
    );

    console.log(`✅ Created route: ${route.name}`);
  }

  console.log('\n🎉 Seeding Complete!\n');
  console.log('Summary:');
  console.log(`- Locations: ${Object.keys(locationIds).length}`);
  console.log(`- Segments: ${segments.length}`);
  console.log(`- Routes: ${routes.length}`);
}