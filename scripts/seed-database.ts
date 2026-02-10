import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { seedData } from '../lib/seed-data';

config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedDatabase() {
  console.log('Starting database seed...');

  try {
    // Check if categories already exist
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id')
      .limit(1);

    if (existingCategories && existingCategories.length > 0) {
      console.log('Categories already exist, skipping seed.');
      return;
    }

    // Insert categories
    console.log('Inserting categories...');
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .insert(seedData.categories)
      .select();

    if (categoriesError) {
      console.error('Error inserting categories:', categoriesError);
      return;
    }

    console.log(`Inserted ${categories?.length} categories`);

    // Insert forums for each category
    for (const category of categories || []) {
      const categorySlug = category.slug as keyof typeof seedData.forums;
      const forumsList = seedData.forums[categorySlug];

      if (forumsList && forumsList.length > 0) {
        console.log(`Inserting forums for ${category.name}...`);

        const forumsToInsert = forumsList.map(forum => ({
          category_id: category.id,
          name: forum.name,
          slug: forum.slug,
          description: forum.description || '',
          country_code: forum.country_code || null,
          city: forum.city || null,
          display_order: forum.display_order,
          is_private: category.is_private,
        }));

        const { data: forums, error: forumsError } = await supabase
          .from('forums')
          .insert(forumsToInsert)
          .select();

        if (forumsError) {
          console.error(`Error inserting forums for ${category.name}:`, forumsError);
        } else {
          console.log(`Inserted ${forums?.length} forums for ${category.name}`);
        }
      }
    }

    console.log('Database seed completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seedDatabase();
