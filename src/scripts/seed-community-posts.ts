// src/scripts/seed-community-posts.ts
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

// Load environment variables
config();

async function seedCommunityPosts() {
  // Create a new DataSource instance
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: String(process.env.DATABASE_PASSWORD || ''),
    database: process.env.DATABASE_NAME,
    synchronize: false,
    logging: true,
  });

  console.log('🌱 Starting Community Posts Seed...\n');

  try {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connected!\n');

    // Get existing users to use as authors
    console.log('👥 Fetching existing users...');
    const users = await dataSource.query(`
      SELECT id, "firstName", "lastName", email, "reputationScore"
      FROM users
      WHERE "isActive" = true
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);

    if (users.length === 0) {
      console.log('⚠️  No users found. Please run seed-admin-and-users.ts first.');
      return;
    }

    console.log(`✅ Found ${users.length} users\n`);

    // Get some locations if they exist
    const locations = await dataSource.query(`
      SELECT id, name
      FROM locations
      WHERE "isActive" = true
      LIMIT 20
    `);

    console.log(`✅ Found ${locations.length} locations\n`);

    // Community posts data
    const communityPosts = [
      {
        postType: 'traffic_update',
        title: 'Heavy Traffic at Choba Roundabout',
        content:
          'There is currently heavy traffic at Choba roundabout heading towards UniPort. Alternative route via Alakahia is flowing smoothly. Expect about 25-30 minutes delay if you take the main route.',
        authorIndex: 0,
        upvotes: 15,
        downvotes: 1,
        isVerified: true,
        createdDaysAgo: 0,
      },
      {
        postType: 'route_alert',
        title: 'Road Closure on Aba Road',
        content:
          'Aba Road is currently closed from Garrison junction to Stadium due to ongoing construction work. All vehicles are being diverted through Ikwerre Road. Plan your journey accordingly.',
        authorIndex: 1,
        upvotes: 28,
        downvotes: 2,
        isVerified: true,
        createdDaysAgo: 1,
      },
      {
        postType: 'safety_concern',
        title: 'Poor Lighting at Mile 3 Park',
        content:
          'The street lights at Mile 3 motor park have not been working for the past week. Please be extra careful when traveling at night. Report any suspicious activity to security.',
        authorIndex: 0,
        upvotes: 42,
        downvotes: 0,
        isVerified: true,
        createdDaysAgo: 2,
      },
      {
        postType: 'tip',
        title: 'Best Time to Travel to Rumuokoro',
        content:
          'If you\'re heading to Rumuokoro during weekdays, avoid 7-9 AM and 5-7 PM. The best time is between 10 AM - 3 PM. You\'ll save at least 20 minutes on your journey!',
        authorIndex: 2,
        upvotes: 67,
        downvotes: 3,
        isVerified: true,
        createdDaysAgo: 3,
      },
      {
        postType: 'general',
        title: 'New Transport Service Started!',
        content:
          'A new shuttle service has started operating between Eliozu and Rumuola. The fare is ₦200 and they run from 6 AM to 10 PM. Very comfortable buses with AC!',
        authorIndex: 1,
        upvotes: 89,
        downvotes: 5,
        isVerified: false,
        createdDaysAgo: 1,
      },
      {
        postType: 'traffic_update',
        title: 'Traffic Smooth on East-West Road',
        content:
          'Good news! The East-West road is flowing smoothly this morning. No traffic jams reported. Great time to travel if you\'re heading towards Eleme or Onne.',
        authorIndex: 3,
        upvotes: 23,
        downvotes: 1,
        isVerified: false,
        createdDaysAgo: 0,
      },
      {
        postType: 'route_alert',
        title: 'Fuel Scarcity Affecting Transport',
        content:
          'Due to fuel scarcity, some keke and okada riders are charging extra ₦50-100. Bus fares have also increased slightly. This is affecting routes to Rumuokwuta and Rumurolu.',
        authorIndex: 2,
        upvotes: 51,
        downvotes: 8,
        isVerified: true,
        createdDaysAgo: 1,
      },
      {
        postType: 'safety_concern',
        title: 'Watch Out for Potholes on Ikwerre Road',
        content:
          'There are several deep potholes on Ikwerre Road near the Eneka junction. Drivers should be very careful, especially at night. Two vehicles had tire damage there yesterday.',
        authorIndex: 0,
        upvotes: 34,
        downvotes: 1,
        isVerified: true,
        createdDaysAgo: 1,
      },
      {
        postType: 'tip',
        title: 'Cheaper Fare: Share a Keke Instead of Okada',
        content:
          'Pro tip: If you\'re traveling from Choba to Alakahia, sharing a keke with 3 other people costs ₦100 per person, while okada charges ₦200-250. Save your money!',
        authorIndex: 1,
        upvotes: 95,
        downvotes: 2,
        isVerified: false,
        createdDaysAgo: 4,
      },
      {
        postType: 'general',
        title: 'Rainy Season: Expect Delays',
        content:
          'With rainy season here, expect delays on most routes especially in the mornings and evenings. Carry an umbrella and plan to leave earlier than usual. Stay safe everyone!',
        authorIndex: 3,
        upvotes: 78,
        downvotes: 1,
        isVerified: false,
        createdDaysAgo: 2,
      },
      {
        postType: 'traffic_update',
        title: 'Market Day Traffic at Mile 1',
        content:
          'Today is market day at Mile 1. Expect heavy traffic around the market area from 8 AM to 5 PM. Consider using alternative routes through Azikiwe Road if possible.',
        authorIndex: 2,
        upvotes: 29,
        downvotes: 0,
        isVerified: true,
        createdDaysAgo: 0,
      },
      {
        postType: 'tip',
        title: 'Save Money on Regular Routes',
        content:
          'If you use the same route daily (like Eliozu to Town), consider getting the driver\'s number. Many drivers give discounts to regular customers. I save about ₦500 weekly this way!',
        authorIndex: 0,
        upvotes: 112,
        downvotes: 4,
        isVerified: false,
        createdDaysAgo: 5,
      },
      {
        postType: 'safety_concern',
        title: 'Be Careful Late Night at Rumola Junction',
        content:
          'Please avoid traveling alone late at night around Rumola junction. There have been reports of bag snatching. If you must travel late, use a cab and share your trip details with someone.',
        authorIndex: 1,
        upvotes: 67,
        downvotes: 0,
        isVerified: true,
        createdDaysAgo: 3,
      },
      {
        postType: 'route_alert',
        title: 'Police Checkpoint at Garrison',
        content:
          'There\'s a police checkpoint at Garrison junction this morning. All vehicles are being stopped for routine checks. If you\'re in a hurry, use the Ikokwu bypass route.',
        authorIndex: 3,
        upvotes: 18,
        downvotes: 2,
        isVerified: false,
        createdDaysAgo: 0,
      },
      {
        postType: 'general',
        title: 'Thank You to All Avigate Users!',
        content:
          'I just want to say thank you to everyone contributing route information and helping others. This app has made my daily commute so much easier. Let\'s keep helping each other!',
        authorIndex: 2,
        upvotes: 156,
        downvotes: 1,
        isVerified: false,
        createdDaysAgo: 1,
      },
    ];

    console.log(`📝 Creating ${communityPosts.length} community posts...\n`);

    let createdCount = 0;

    for (const post of communityPosts) {
      const author = users[post.authorIndex % users.length];
      const location = locations.length > 0 ? locations[Math.floor(Math.random() * locations.length)] : null;

      // Calculate created date
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - post.createdDaysAgo);
      createdAt.setHours(createdAt.getHours() - Math.floor(Math.random() * 12));

      const result = await dataSource.query(
        `
        INSERT INTO community_posts (
          "authorId",
          "postType",
          title,
          content,
          "locationId",
          images,
          upvotes,
          downvotes,
          "isVerified",
          "isActive",
          "createdAt",
          "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11
        )
        RETURNING id
      `,
        [
          author.id,
          post.postType,
          post.title,
          post.content,
          location?.id || null,
          [],
          post.upvotes,
          post.downvotes,
          post.isVerified,
          true,
          createdAt,
        ],
      );

      createdCount++;
      console.log(
        `✅ Created ${post.postType} post: "${post.title}" by ${author.firstName} ${author.lastName}`,
      );

      // Add some random comments to highly upvoted posts
      if (post.upvotes > 50 && users.length > 2) {
        const commentsCount = Math.floor(Math.random() * 5) + 2; // 2-6 comments

        // Note: You would need to create a comments table and add comments here
        // For now, we'll skip this as the comments table structure wasn't provided
      }
    }

    console.log(`\n✅ Created ${createdCount} community posts!`);
    console.log('\n📊 Summary by Post Type:');

    const summary = await dataSource.query(`
      SELECT "postType", COUNT(*) as count
      FROM community_posts
      GROUP BY "postType"
      ORDER BY count DESC
    `);

    summary.forEach((item: any) => {
      console.log(`   ${item.postType}: ${item.count} posts`);
    });

    console.log('\n✅ Community posts seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('\n🔌 Database connection closed');
    }
  }
}

seedCommunityPosts();
