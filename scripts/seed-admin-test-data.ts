/**
 * Seeder: Creates test users with threads and posts for admin panel testing.
 * 
 * Usage: npx tsx scripts/seed-admin-test-data.ts
 * 
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env (bypasses RLS).
 * Creates:
 *  - 10 test users (various roles, statuses)
 *  - Threads and posts per user
 *  - Some suspensions for testing /admin/suspensions
 *  - Some verification requests for testing /admin
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const TEST_PASSWORD = 'TestPass123!';

const testUsers = [
  { email: 'admin_test@test.com', username: 'AdminTester', role: 'admin', is_verified: true, bio: 'Admin account for testing moderation tools.' },
  { email: 'mod_test@test.com', username: 'ModTester', role: 'mod', is_verified: true, bio: 'Moderator account for testing mod actions.' },
  { email: 'user_maria@test.com', username: 'MariaGomez', role: 'user', is_verified: true, bio: 'Soy Maria, me encanta participar en foros.' },
  { email: 'user_carlos@test.com', username: 'CarlosRuiz', role: 'user', is_verified: false, bio: 'Carlos aquí, nuevo en el foro.' },
  { email: 'user_ana@test.com', username: 'AnaLopez', role: 'user', is_verified: true, bio: 'Ana, activa en la comunidad desde hace tiempo.' },
  { email: 'user_pedro@test.com', username: 'PedroSanchez', role: 'user', is_verified: false, bio: 'Pedro, recién registrado.' },
  { email: 'user_laura@test.com', username: 'LauraMartin', role: 'user', is_verified: false, bio: 'Laura, buscando información.' },
  { email: 'user_diego@test.com', username: 'DiegoTorres', role: 'user', is_verified: true, bio: 'Diego Torres, usuario VIP.' },
  { email: 'user_sofia@test.com', username: 'SofiaHerrera', role: 'user', is_verified: false, bio: 'Hola, soy Sofía.' },
  { email: 'user_banned@test.com', username: 'BannedUser', role: 'user', is_verified: false, bio: 'This user will be suspended for testing.' },
];

const sampleThreads = [
  { title: '¿Cuál es el mejor restaurante de tu ciudad?', content: 'Quiero conocer recomendaciones de restaurantes de diferentes ciudades. ¡Compartan sus favoritos!' },
  { title: 'Tips para nuevos miembros del foro', content: 'Hola a todos, abro este hilo para compartir consejos para los nuevos miembros que se unen al foro.' },
  { title: 'Debate: ¿Trabajo remoto o presencial?', content: '¿Qué prefieren, trabajar desde casa o ir a la oficina? Compartan sus experiencias y argumentos.' },
  { title: 'Recomendaciones de películas 2026', content: '¿Qué películas han visto últimamente que valgan la pena? Dejen sus recomendaciones aquí.' },
  { title: 'Problemas con la verificación', content: 'Tengo dudas sobre el proceso de verificación. ¿Alguien puede explicar los pasos?' },
  { title: 'Saludos desde Buenos Aires', content: '¡Hola comunidad! Me presento, soy nuevo en el foro y me uno desde Buenos Aires, Argentina.' },
  { title: '¿Cómo mejorar la seguridad de tu cuenta?', content: 'Les comparto algunos tips para mantener su cuenta segura: contraseñas fuertes, 2FA, etc.' },
  { title: 'Música que están escuchando', content: '¿Qué están escuchando estos días? Compartan artistas, álbumes o playlists.' },
  { title: 'Experiencias viajando por Europa', content: 'Abro este hilo para que compartan sus experiencias viajando por Europa. Rutas, consejos, presupuestos.' },
  { title: 'Reglas del foro - Léanlas antes de postear', content: 'Este hilo contiene las reglas básicas del foro. Por favor léanlas antes de participar. Respeto y buena convivencia ante todo.' },
];

const sampleReplies = [
  'Totalmente de acuerdo con lo que dices. Muy buen punto.',
  '¡Excelente aporte! Gracias por compartir esta información.',
  'No estoy seguro de estar de acuerdo, pero respeto tu opinión.',
  'Yo tuve una experiencia similar, les cuento: fue bastante interesante.',
  'Gracias por abrir este hilo, justo lo que necesitaba.',
  '¿Alguien tiene más información sobre esto? Me interesa mucho.',
  'Muy buena recomendación, lo voy a probar.',
  'Creo que hay mejores opciones, pero esta no está mal.',
  '+1 a esto. Completamente de acuerdo.',
  'Interesante perspectiva, no lo había pensado así.',
  'Les comparto mi experiencia personal con este tema...',
  'Buen hilo, siguiendo para ver más respuestas.',
  '¿Pueden dar más detalles? Me gustaría entender mejor.',
  'Esto me pasó a mí también, aquí les cuento cómo lo resolví.',
  'Muy útil esta información, la voy a guardar.',
];

async function createTestUser(userData: typeof testUsers[0]): Promise<string | null> {
  // Check if user already exists by username
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', userData.username)
    .maybeSingle();

  if (existingProfile) {
    console.log(`  ⏭  User @${userData.username} already exists, skipping.`);
    return existingProfile.id;
  }

  // Also check if email is already registered in auth
  const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 1, page: 1 });
  
  // Try creating the auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { username: userData.username },
  });

  if (authError) {
    // If user already exists in auth but not in profiles, try to find them
    if (authError.message.includes('already') || authError.status === 422) {
      console.log(`  ⚠️  Auth user ${userData.email} already exists, looking up...`);
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existing = listData?.users?.find(u => u.email === userData.email);
      if (existing) {
        await supabase.from('profiles').upsert({
          id: existing.id,
          username: userData.username,
          role: userData.role,
          is_verified: userData.is_verified,
          bio: userData.bio,
        });
        console.log(`  ✅ Recovered @${userData.username} from existing auth user`);
        return existing.id;
      }
    }
    console.error(`  ❌ Error creating auth user ${userData.email}: [${authError.status}] ${authError.message}`);
    
    // Fallback: create profile directly with a generated UUID (won't have auth login but useful for data)
    const fallbackId = crypto.randomUUID();
    const { error: insertErr } = await supabase.from('profiles').insert({
      id: fallbackId,
      username: userData.username,
      role: userData.role,
      is_verified: userData.is_verified,
      bio: userData.bio,
      is_vip: userData.username === 'DiegoTorres',
      location_country: 'España',
      location_city: ['Madrid', 'Barcelona', 'Sevilla', 'Valencia', 'Bilbao'][Math.floor(Math.random() * 5)],
    });
    
    if (insertErr) {
      console.error(`  ❌ Fallback profile insert also failed for ${userData.username}:`, insertErr.message);
      return null;
    }
    console.log(`  ⚠️  Created @${userData.username} as profile-only (no auth login)`);
    return fallbackId;
  }

  const userId = authData.user.id;

  // Small delay to let the trigger create the profile
  await new Promise(resolve => setTimeout(resolve, 500));

  // Update profile with additional fields
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      username: userData.username,
      role: userData.role,
      is_verified: userData.is_verified,
      bio: userData.bio,
      is_vip: userData.username === 'DiegoTorres',
      location_country: 'España',
      location_city: ['Madrid', 'Barcelona', 'Sevilla', 'Valencia', 'Bilbao'][Math.floor(Math.random() * 5)],
    })
    .eq('id', userId);

  if (profileError) {
    console.error(`  ❌ Error updating profile for ${userData.username}:`, profileError.message);
    return null;
  }

  console.log(`  ✅ Created @${userData.username} (${userData.role}, verified: ${userData.is_verified})`);
  return userId;
}

async function getForumId(): Promise<string | null> {
  // Try to find the 'general' forum first
  const { data } = await supabase
    .from('forums')
    .select('id')
    .eq('slug', 'general')
    .maybeSingle();

  if (data) return data.id;

  // Fallback: get any public forum
  const { data: anyForum } = await supabase
    .from('forums')
    .select('id')
    .eq('is_private', false)
    .limit(1)
    .maybeSingle();

  return anyForum?.id || null;
}

async function createThreadWithPosts(
  forumId: string,
  authorId: string,
  threadData: typeof sampleThreads[0],
  replyAuthors: string[]
): Promise<string | null> {
  // Create thread
  const { data: thread, error: threadError } = await supabase
    .from('threads')
    .insert({
      forum_id: forumId,
      author_id: authorId,
      title: threadData.title,
    })
    .select('id')
    .single();

  if (threadError) {
    console.error(`  ❌ Error creating thread "${threadData.title}":`, threadError.message);
    return null;
  }

  // Create first post (OP)
  const { error: opError } = await supabase
    .from('posts')
    .insert({
      thread_id: thread.id,
      author_id: authorId,
      content: `<p>${threadData.content}</p>`,
      is_first_post: true,
    });

  if (opError) {
    console.error(`  ❌ Error creating OP for "${threadData.title}":`, opError.message);
    return thread.id;
  }

  // Create 2-5 random replies
  const numReplies = 2 + Math.floor(Math.random() * 4);
  for (let i = 0; i < numReplies; i++) {
    const replyAuthorId = replyAuthors[Math.floor(Math.random() * replyAuthors.length)];
    const replyContent = sampleReplies[Math.floor(Math.random() * sampleReplies.length)];

    await supabase.from('posts').insert({
      thread_id: thread.id,
      author_id: replyAuthorId,
      content: `<p>${replyContent}</p>`,
      is_first_post: false,
    });
  }

  // Update thread reply count
  await supabase
    .from('threads')
    .update({ 
      replies_count: numReplies,
      last_post_at: new Date().toISOString(),
    })
    .eq('id', thread.id);

  console.log(`  📝 Thread: "${threadData.title}" (${numReplies} replies)`);
  return thread.id;
}

async function createSuspensions(userIds: Record<string, string>, adminId: string) {
  console.log('\n📋 Creating test suspensions...');

  const suspensions = [
    {
      user_id: userIds['BannedUser'],
      suspended_by: adminId,
      reason: 'Spam repetitivo en múltiples hilos',
      description: 'El usuario publicó spam en 5 hilos diferentes.',
      is_permanent: true,
      suspension_type: 'permanent',
      is_active: true,
    },
    {
      user_id: userIds['PedroSanchez'],
      suspended_by: adminId,
      reason: 'Lenguaje inapropiado',
      description: 'Insultos a otros usuarios en el hilo de debate.',
      is_permanent: false,
      suspension_type: 'temporary',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
    },
    {
      user_id: userIds['SofiaHerrera'],
      suspended_by: adminId,
      reason: 'Publicidad no autorizada',
      description: 'Publicó enlaces de publicidad sin permiso.',
      is_permanent: false,
      suspension_type: 'temporary',
      expires_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // already expired
      is_active: false,
      lifted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      lifted_by: adminId,
    },
  ];

  for (const suspension of suspensions) {
    if (!suspension.user_id) continue;

    const { error } = await supabase.from('user_suspensions').insert(suspension);
    if (error) {
      console.error(`  ❌ Error creating suspension:`, error.message);
    } else {
      console.log(`  🔒 Suspension for user ${suspension.reason} (active: ${suspension.is_active})`);
    }
  }

  // Mark suspended users in profiles
  if (userIds['BannedUser']) {
    await supabase.from('profiles').update({ is_suspended: true, suspended_until: null }).eq('id', userIds['BannedUser']);
  }
  if (userIds['PedroSanchez']) {
    await supabase.from('profiles').update({ 
      is_suspended: true, 
      suspended_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }).eq('id', userIds['PedroSanchez']);
  }
}

async function createVerificationRequests(userIds: Record<string, string>) {
  console.log('\n🔑 Creating test verification requests...');

  const requests = [
    {
      user_id: userIds['CarlosRuiz'],
      code: 'TSR-ABC123',
      photo_url: 'https://example.com/verification/carlos.jpg',
      status: 'pending',
      verification_type: 'escort',
      contact_info: 'telegram: @carlos_test',
    },
    {
      user_id: userIds['LauraMartin'],
      code: 'TSR-DEF456',
      photo_url: null,
      status: 'pending',
      verification_type: 'moderator',
      full_name: 'Laura Martín García',
      motivation: 'Quiero ayudar a mantener el foro limpio y organizado.',
      experience: 'He moderado grupos de Telegram de +500 miembros.',
      languages: ['Español', 'Inglés'],
      availability: 'Lunes a Viernes, 18:00-22:00',
      contact_info: 'email: laura@test.com',
    },
    {
      user_id: userIds['SofiaHerrera'],
      code: 'TSR-GHI789',
      photo_url: 'https://example.com/verification/sofia.jpg',
      status: 'rejected',
      verification_type: 'escort',
      rejection_reason: 'La foto no cumple con los requisitos. El código no es legible.',
    },
  ];

  for (const req of requests) {
    if (!req.user_id) continue;

    const { error } = await supabase.from('verifications').insert(req);
    if (error) {
      console.error(`  ❌ Error creating verification:`, error.message);
    } else {
      console.log(`  📋 Verification request (${req.verification_type}, status: ${req.status})`);
    }
  }
}

async function main() {
  console.log('🚀 Starting admin test data seeder...\n');
  console.log('👤 Creating test users...');

  const userIds: Record<string, string> = {};

  for (const userData of testUsers) {
    const id = await createTestUser(userData);
    if (id) userIds[userData.username] = id;
  }

  const forumId = await getForumId();
  if (!forumId) {
    console.error('\n❌ No public forum found. Run the base seeder first (npm run seed).');
    process.exit(1);
  }

  console.log(`\n📂 Using forum ID: ${forumId}`);
  console.log('\n📝 Creating threads and posts...');

  const allUserIds = Object.values(userIds);
  const regularUsers = Object.entries(userIds)
    .filter(([name]) => !['AdminTester', 'ModTester', 'BannedUser'].includes(name))
    .map(([, id]) => id);

  // Each regular user creates 1-2 threads
  let threadIdx = 0;
  for (const [username, userId] of Object.entries(userIds)) {
    if (['AdminTester', 'ModTester', 'BannedUser'].includes(username)) continue;
    if (threadIdx >= sampleThreads.length) break;

    await createThreadWithPosts(forumId, userId, sampleThreads[threadIdx], allUserIds);
    threadIdx++;

    // Some users create a second thread
    if (Math.random() > 0.5 && threadIdx < sampleThreads.length) {
      await createThreadWithPosts(forumId, userId, sampleThreads[threadIdx], allUserIds);
      threadIdx++;
    }
  }

  // Admin creates the "rules" thread
  if (userIds['AdminTester'] && threadIdx < sampleThreads.length) {
    const rulesThread = sampleThreads.find(t => t.title.includes('Reglas'));
    if (rulesThread) {
      await createThreadWithPosts(forumId, userIds['AdminTester'], rulesThread, allUserIds);
    }
  }

  // Update posts_count for each user
  console.log('\n📊 Updating user post counts...');
  for (const [username, userId] of Object.entries(userIds)) {
    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId);

    await supabase.from('profiles').update({ posts_count: count || 0 }).eq('id', userId);
    console.log(`  📊 @${username}: ${count || 0} posts`);
  }

  // Create suspensions
  if (userIds['AdminTester']) {
    await createSuspensions(userIds, userIds['AdminTester']);
  }

  // Create verification requests
  await createVerificationRequests(userIds);

  console.log('\n✅ Admin test data seeding complete!');
  console.log('\n📋 Test accounts (password for all: TestPass123!):');
  for (const u of testUsers) {
    console.log(`  ${u.role.padEnd(5)} | ${u.email.padEnd(28)} | @${u.username}`);
  }
}

main().catch(console.error);
