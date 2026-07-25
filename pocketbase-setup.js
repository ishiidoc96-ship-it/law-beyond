// PocketBase Collection Setup Script
// Run this ONCE after starting PocketBase to create all collections
// Usage: node pocketbase-setup.js

const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const PB_EMAIL = process.env.PB_EMAIL || 'admin@example.com';
const PB_PASSWORD = process.env.PB_PASSWORD || 'password123';

async function setup() {
  const pb = new PocketBase(PB_URL);

  console.log('Connecting to PocketBase at', PB_URL);

  // Authenticate as admin
  try {
    await pb.admins.authWithPassword(PB_EMAIL, PB_PASSWORD);
    console.log('Authenticated as admin');
  } catch (e) {
    console.error('Failed to authenticate. Make sure PocketBase is running and admin account exists.');
    console.error('Create admin: ./pocketbase.exe admin create');
    process.exit(1);
  }

  // ── Helper to create collection safely ──
  async function createCollection(name, options) {
    try {
      await pb.collections.get(name);
      console.log(`  Collection "${name}" already exists, skipping`);
    } catch {
      await pb.collections.create(options);
      console.log(`  Created collection "${name}"`);
    }
  }

  console.log('\nCreating collections...');

  // ── PROFILES ──
  await createCollection('profiles', {
    name: 'profiles',
    type: 'base',
    fields: [
      { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', maxSelect: 1, cascadeDelete: true },
      { name: 'full_name', type: 'text' },
      { name: 'email', type: 'text' },
      { name: 'avatar_url', type: 'text' },
      { name: 'university', type: 'text' },
      { name: 'course', type: 'text' },
      { name: 'year_of_study', type: 'text' },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_profiles_user ON profiles (user)'],
    rules: {
      view: '@request.auth.id != ""',
      create: '@request.auth.id = user',
      update: '@request.auth.id = user',
      delete: '@request.auth.id = user',
    },
  });

  // ── TASKS ──
  await createCollection('tasks', {
    name: 'tasks',
    type: 'base',
    fields: [
      { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true },
      { name: 'title', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'due_date', type: 'date' },
      { name: 'priority', type: 'select', options: { values: ['high', 'medium', 'low'] }, required: true },
      { name: 'completed', type: 'bool', required: true },
    ],
    indexes: ['CREATE INDEX idx_tasks_user ON tasks (user)'],
    rules: {
      view: '@request.auth.id = user',
      create: '@request.auth.id = user',
      update: '@request.auth.id = user',
      delete: '@request.auth.id = user',
    },
  });

  // ── HABITS ──
  await createCollection('habits', {
    name: 'habits',
    type: 'base',
    fields: [
      { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true },
      { name: 'name', type: 'text', required: true },
      { name: 'category', type: 'text' },
      { name: 'icon', type: 'text', required: true },
      { name: 'target_per_day', type: 'number', required: true },
    ],
    indexes: ['CREATE INDEX idx_habits_user ON habits (user)'],
    rules: {
      view: '@request.auth.id = user',
      create: '@request.auth.id = user',
      update: '@request.auth.id = user',
      delete: '@request.auth.id = user',
    },
  });

  // ── HABIT COMPLETIONS ──
  await createCollection('habit_completions', {
    name: 'habit_completions',
    type: 'base',
    fields: [
      { name: 'habit', type: 'relation', required: true, collectionId: '', cascadeDelete: true },
      { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true },
      { name: 'completed_date', type: 'date', required: true },
    ],
    indexes: [
      'CREATE INDEX idx_hc_habit ON habit_completions (habit)',
      'CREATE INDEX idx_hc_user ON habit_completions (user)',
      'CREATE INDEX idx_hc_date ON habit_completions (completed_date)',
    ],
    rules: {
      view: '@request.auth.id = user',
      create: '@request.auth.id = user',
      update: '@request.auth.id = user',
      delete: '@request.auth.id = user',
    },
  });

  // ── JOURNAL ENTRIES ──
  await createCollection('journal_entries', {
    name: 'journal_entries',
    type: 'base',
    fields: [
      { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true },
      { name: 'title', type: 'text', required: true },
      { name: 'content', type: 'text' },
      { name: 'mood', type: 'text' },
    ],
    indexes: ['CREATE INDEX idx_je_user ON journal_entries (user)'],
    rules: {
      view: '@request.auth.id = user',
      create: '@request.auth.id = user',
      update: '@request.auth.id = user',
      delete: '@request.auth.id = user',
    },
  });

  // ── TRANSACTIONS ──
  await createCollection('transactions', {
    name: 'transactions',
    type: 'base',
    fields: [
      { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true },
      { name: 'title', type: 'text', required: true },
      { name: 'amount', type: 'number', required: true },
      { name: 'type', type: 'select', options: { values: ['income', 'expense'] }, required: true },
      { name: 'category', type: 'text', required: true },
      { name: 'date', type: 'date', required: true },
    ],
    indexes: ['CREATE INDEX idx_tx_user ON transactions (user)'],
    rules: {
      view: '@request.auth.id = user',
      create: '@request.auth.id = user',
      update: '@request.auth.id = user',
      delete: '@request.auth.id = user',
    },
  });

  // ── ASSIGNMENTS ──
  await createCollection('assignments', {
    name: 'assignments',
    type: 'base',
    fields: [
      { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true },
      { name: 'title', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'due_date', type: 'date' },
      { name: 'priority', type: 'select', options: { values: ['high', 'medium', 'low'] }, required: true },
      { name: 'completed', type: 'bool', required: true },
    ],
    indexes: ['CREATE INDEX idx_assign_user ON assignments (user)'],
    rules: {
      view: '@request.auth.id = user',
      create: '@request.auth.id = user',
      update: '@request.auth.id = user',
      delete: '@request.auth.id = user',
    },
  });

  // ── USER STREAKS ──
  await createCollection('user_streaks', {
    name: 'user_streaks',
    type: 'base',
    fields: [
      { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', unique: true, cascadeDelete: true },
      { name: 'current_streak', type: 'number', required: true },
      { name: 'longest_streak', type: 'number', required: true },
      { name: 'last_post_date', type: 'date' },
      { name: 'freeze_available', type: 'number', required: true },
      { name: 'freezes_used', type: 'number', required: true },
      { name: 'last_freeze_used_at', type: 'date' },
      { name: 'streak_started_at', type: 'date' },
      { name: 'today_posted', type: 'bool', required: true },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_us_user ON user_streaks (user)',
    ],
    rules: {
      view: '@request.auth.id != ""',
      create: '@request.auth.id = user',
      update: '@request.auth.id = user',
      delete: '@request.auth.id = user',
    },
  });

  // ── STREAK POSTS ──
  await createCollection('streak_posts', {
    name: 'streak_posts',
    type: 'base',
    fields: [
      { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true },
      { name: 'media_url', type: 'text', required: true },
      { name: 'media_type', type: 'select', options: { values: ['image', 'video'] }, required: true },
      { name: 'caption', type: 'text' },
      { name: 'filter_name', type: 'text' },
      { name: 'music_track', type: 'text' },
      { name: 'location', type: 'text' },
      { name: 'streak_day', type: 'number' },
    ],
    indexes: [
      'CREATE INDEX idx_sp_user ON streak_posts (user)',
      'CREATE INDEX idx_sp_created ON streak_posts (-created)',
    ],
    rules: {
      view: '@request.auth.id != ""',
      create: '@request.auth.id = user',
      update: '@request.auth.id = user',
      delete: '@request.auth.id = user',
    },
  });

  // ── STREAK LIKES ──
  await createCollection('streak_likes', {
    name: 'streak_likes',
    type: 'base',
    fields: [
      { name: 'post', type: 'relation', required: true, collectionId: '', cascadeDelete: true },
      { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_sl_unique ON streak_likes (post, user)',
      'CREATE INDEX idx_sl_post ON streak_likes (post)',
    ],
    rules: {
      view: '@request.auth.id != ""',
      create: '@request.auth.id = user',
      delete: '@request.auth.id = user',
    },
  });

  // ── STREAK COMMENTS ──
  await createCollection('streak_comments', {
    name: 'streak_comments',
    type: 'base',
    fields: [
      { name: 'post', type: 'relation', required: true, collectionId: '', cascadeDelete: true },
      { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true },
      { name: 'content', type: 'text', required: true },
    ],
    indexes: [
      'CREATE INDEX idx_sc_post ON streak_comments (post)',
      'CREATE INDEX idx_sc_user ON streak_comments (user)',
    ],
    rules: {
      view: '@request.auth.id != ""',
      create: '@request.auth.id = user',
      update: '@request.auth.id = user',
      delete: '@request.auth.id = user',
    },
  });

  // ── STREAK FREEZES ──
  await createCollection('streak_freezes', {
    name: 'streak_freezes',
    type: 'base',
    fields: [
      { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true },
      { name: 'streak_at_freeze', type: 'number', required: true },
      { name: 'reason', type: 'text', required: true },
    ],
    indexes: ['CREATE INDEX idx_sf_user ON streak_freezes (user)'],
    rules: {
      view: '@request.auth.id = user',
      create: '@request.auth.id = user',
    },
  });

  // ── STREAK RESTORES ──
  await createCollection('streak_restores', {
    name: 'streak_restores',
    type: 'base',
    fields: [
      { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true },
      { name: 'streak_restored_to', type: 'number', required: true },
      { name: 'reason', type: 'text', required: true },
    ],
    indexes: ['CREATE INDEX idx_sr_user ON streak_restores (user)'],
    rules: {
      view: '@request.auth.id = user',
      create: '@request.auth.id = user',
    },
  });

  // ── STREAK ACHIEVEMENTS ──
  await createCollection('streak_achievements', {
    name: 'streak_achievements',
    type: 'base',
    fields: [
      { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true },
      { name: 'achievement_type', type: 'text', required: true },
      { name: 'title', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'icon', type: 'text' },
      { name: 'unlocked_at', type: 'date', required: true },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_sa_unique ON streak_achievements (user, achievement_type)',
    ],
    rules: {
      view: '@request.auth.id = user',
      create: '@request.auth.id = user',
    },
  });

  // ── FRIEND REQUESTS ──
  await createCollection('friend_requests', {
    name: 'friend_requests',
    type: 'base',
    fields: [
      { name: 'sender', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true },
      { name: 'receiver', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true },
      { name: 'status', type: 'select', options: { values: ['pending', 'accepted', 'rejected'] }, required: true },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_fr_unique ON friend_requests (sender, receiver)',
      'CREATE INDEX idx_fr_receiver ON friend_requests (receiver)',
    ],
    rules: {
      view: '@request.auth.id = sender || @request.auth.id = receiver',
      create: '@request.auth.id = sender',
      update: '@request.auth.id = receiver',
      delete: '@request.auth.id = sender || @request.auth.id = receiver',
    },
  });

  // ── FRIENDS ──
  await createCollection('friends', {
    name: 'friends',
    type: 'base',
    fields: [
      { name: 'user1', type: 'relation', required: true, collectionId: '_pb_users_auth_' },
      { name: 'user2', type: 'relation', required: true, collectionId: '_pb_users_auth_' },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_friends_unique ON friends (user1, user2)',
      'CREATE INDEX idx_friends_user1 ON friends (user1)',
      'CREATE INDEX idx_friends_user2 ON friends (user2)',
    ],
    rules: {
      view: '@request.auth.id = user1 || @request.auth.id = user2',
      create: '@request.auth.id != ""',
      delete: '@request.auth.id = user1 || @request.auth.id = user2',
    },
  });

  // ── PUSH SUBSCRIPTIONS ──
  await createCollection('push_subscriptions', {
    name: 'push_subscriptions',
    type: 'base',
    fields: [
      { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true },
      { name: 'endpoint', type: 'text', required: true },
      { name: 'p256dh', type: 'text', required: true },
      { name: 'auth_key', type: 'text', required: true },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_ps_unique ON push_subscriptions (user, endpoint)',
    ],
    rules: {
      view: '@request.auth.id = user',
      create: '@request.auth.id = user',
      update: '@request.auth.id = user',
      delete: '@request.auth.id = user',
    },
  });

  // ── NOTIFICATIONS ──
  await createCollection('notifications', {
    name: 'notifications',
    type: 'base',
    fields: [
      { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true },
      { name: 'type', type: 'text', required: true },
      { name: 'title', type: 'text', required: true },
      { name: 'body', type: 'text', required: true },
      { name: 'link', type: 'text' },
      { name: 'actor', type: 'relation', collectionId: '_pb_users_auth_' },
      { name: 'read', type: 'bool', required: true },
    ],
    indexes: [
      'CREATE INDEX idx_notif_user ON notifications (user)',
      'CREATE INDEX idx_notif_read ON notifications (read)',
    ],
    rules: {
      view: '@request.auth.id = user',
      update: '@request.auth.id = user',
      create: 'true',
    },
  });

  // ── FEEDBACK ──
  await createCollection('feedback', {
    name: 'feedback',
    type: 'base',
    fields: [
      { name: 'user', type: 'relation', collectionId: '_pb_users_auth_' },
      { name: 'name', type: 'text', required: true },
      { name: 'email', type: 'text', required: true },
      { name: 'message', type: 'text', required: true },
      { name: 'rating', type: 'number' },
      { name: 'user_agent', type: 'text' },
      { name: 'url', type: 'text' },
    ],
    indexes: [
      'CREATE INDEX idx_fb_created ON feedback (-created)',
    ],
    rules: {
      view: '@request.auth.id != ""',
      create: 'true',
    },
  });

  // Now update habit_completions and streak_likes with correct collection IDs
  console.log('\nFixing relation fields...');
  try {
    const hcCollection = await pb.collections.get('habit_completions');
    const habitsCollection = await pb.collections.get('habits');
    const slCollection = await pb.collections.get('streak_likes');
    const spCollection = await pb.collections.get('streak_posts');
    const scCollection = await pb.collections.get('streak_comments');

    // Update habit_completions.habit relation
    const hcFields = hcCollection.fields.map(f => {
      if (f.name === 'habit') return { ...f, collectionId: habitsCollection.id };
      return f;
    });
    await pb.collections.update('habit_completions', { fields: hcFields });

    // Update streak_likes.post relation
    const slFields = slCollection.fields.map(f => {
      if (f.name === 'post') return { ...f, collectionId: spCollection.id };
      return f;
    });
    await pb.collections.update('streak_likes', { fields: slFields });

    // Update streak_comments.post relation
    const scFields = scCollection.fields.map(f => {
      if (f.name === 'post') return { ...f, collectionId: spCollection.id };
      return f;
    });
    await pb.collections.update('streak_comments', { fields: scFields });

    console.log('  Fixed relation fields');
  } catch (e) {
    console.error('  Error fixing relations:', e.message);
  }

  console.log('\n✅ Setup complete!');
  console.log('You can now start the app with: npm run dev');
  console.log('PocketBase admin UI: http://127.0.0.1:8090/_/admin');
}

setup().catch(e => {
  console.error('Setup failed:', e);
  process.exit(1);
});
