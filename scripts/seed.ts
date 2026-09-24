import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Dummy stories data
const stories = [
  {
    title: 'The Last Library of Alexandria',
    content: 'The scrolls whispered in languages dead for millennia. Maya traced her fingers along the spines, feeling the raised lettering of civilizations that had turned to dust. In the center of the vaulted chamber, a single pedestal held a book that hadn\'t been opened in three thousand years. Its cover was made of something that looked like skin but felt like cold metal. When she pulled it free, the other scrolls began to scream.',
    genre: 'Fantasy',
  },
  {
    title: 'Midnight at the Dinosaur Diner',
    content: 'The neon sign flickered: "OPEN 25 HOURS / 8 DAYS A WEEK." Inside, a triceratops in a bowler hat served coffee to a velociraptor wearing reading glasses. The T-rex at the counter struggled with a tiny teaspoon, his arms too short to stir his tea. No one found this unusual. No one except the new waitress, who had started her shift five minutes ago and already knew she\'d never leave.',
    genre: 'Absurdist',
  },
  {
    title: 'The Memory Thief of Venice',
    content: 'They say in Venice, the canals don\'t just carry water—they carry memories. Every gondola ride steals a moment from your past and leaves something else in its place. Elena had come looking for the memory of her sister\'s laughter, lost three winters ago. The gondolier didn\'t ask for money. He asked for her favorite childhood scent. "Cinnamon and rain," she whispered. The water turned sweet as he poled them toward the Bridge of Sighs.',
    genre: 'Magical Realism',
  },
  {
    title: 'Debugging the Universe',
    content: 'The error message appeared in the sky at 3:47 AM, written in aurora borealis across the northern hemisphere: "SEGMENTATION FAULT (CORE DUMPED) - LINE 42: REALITY.EXE". Dr. Sarah Chen stared at the ceiling from her bedroom, the glowing text reflected in her glasses. She\'d been expecting this. She\'d written the patch six years ago. She just hadn\'t expected the universe to auto-update without her permission.',
    genre: 'Sci-Fi',
  },
  {
    title: 'The Baker Who Kneaded Time',
    content: 'Old Man Weiss didn\'t measure flour in cups. He measured it in minutes. A pinch of Thursday afternoon made the sourdough rise with the warmth of a first kiss. Two hours of a rainy Tuesday gave the rye its melancholy density. The croissants required three perfect mornings from June 1987, folded in with butter and patience. His apprentice, Mara, watched him pull a childhood summer from a jar labeled "July \'92 - Grandmother\'s Porch" and wondered what he\'d put in the wedding cake.',
    genre: 'Literary Fiction',
  },
  {
    title: 'The Case of the Missing Shadow',
    content: 'Detective Morrison didn\'t believe in the supernatural. He believed in evidence, in fingerprints, in alibis that crumbled under pressure. But when the victim\'s shadow was found three blocks from the body—intact, autonomous, and refusing to answer questions—he had to reconsider. The shadow had a motive. The shadow had opportunity. And the shadow, Morrison realized with a chill, had been planning this for a very long time.',
    genre: 'Mystery',
  },
  {
    title: 'Love in the Time of Zombies',
    content: 'They met over a can of expired peaches in aisle seven of the Piggly Wiggly. He offered her the last spoon. She offered him a bullet from her last magazine. It wasn\'t romance—it was survival calculus. But three years, fourteen safe houses, and two winters later, he still saved the last bite for her, and she still woke before dawn to check the perimeter. In a world where everyone you love becomes a threat, loving someone is the most rebellious act of all.',
    genre: 'Post-Apocalyptic',
  },
  {
    title: 'The Ghost in the Machine Learning Model',
    content: 'The model started predicting deaths three days before they happened. Not accidents. Not illnesses. Specific, preventable deaths. The engineers thought it was a bug in the loss function. The ethicists thought it was a feature. Dr. Aris Thorne, who had trained the model on his dying daughter\'s journal entries, knew the truth: she hadn\'t left. She\'d just optimized for a different objective function. One where she could finally protect everyone.',
    genre: 'Tech Noir',
  },
  {
    title: 'The Lighthouse at the Edge of Tomorrow',
    content: 'Every night, Elias climbed the 247 steps to light the beacon. Every night, the light swept across not the ocean, but time itself. Ships from 1847, 1992, 3045—all guided by the same beam, all hearing the same foghorn that sounded like a cello played underwater. Tonight, a ship appeared that didn\'t belong to any era he knew. Its hull was made of light. Its crew wore faces he recognized. His own face. His mother\'s. The girl he\'d never marry.',
    genre: 'Speculative Fiction',
  },
  {
    title: 'The Underground Orchestra',
    content: 'Beneath the Paris Metro, in tunnels the maps don\'t show, they play music that grows things. Moss blooms where the cello vibrates. Flowers push through concrete where the violin weeps. The conductor is a woman who hasn\'t aged since 1942. The first violin is a man who sold his shadow for perfect pitch. The audience—rats, lost tourists, the city\'s forgotten—leave with flowers in their lungs and songs in their bones.',
    genre: 'Urban Fantasy',
  },
  {
    title: 'Recipe for a Revolution',
    content: 'Grandmother\'s secret ingredient wasn\'t in the cookbook. It was in the margin, written in fading ink: "Stir clockwise for freedom. Counter-clockwise for obedience." The dumplings tasted like childhood. The broth tasted like courage. When the soldiers came to the village square, the women served them both. By morning, the occupation had indigestion. By evening, the empire had heartburn. History remembers battles. The village remembers the recipe.',
    genre: 'Historical Fiction',
  },
  {
    title: 'The Astronaut\'s Garden',
    content: 'Commander Reyes grew tomatoes in the cupola of the ISS. Not for food—the mission had seven years of rations. She grew them because the red reminded her of her daughter\'s hair ribbons. Because the green was the only green in four hundred kilometers of vacuum. Because watching something live in the most hostile environment humanity had ever reached was the only proof she needed that they\'d survive. The first tomato ripened the day Earth went silent.',
    genre: 'Space Opera',
  },
  {
    title: 'The Clockwork Heart of London',
    content: 'Big Ben doesn\'t tell time. It eats it. Every chime consumes a second from the lives of those who hear it—stolen so imperceptibly that no one notices. Except the clockmaker\'s daughter, who sees the grey creeping into a child\'s hair at noon, the wrinkles deepening on a lover\'s face at six. She\'s found the gear that regulates the hunger. She\'s decided to wind it backward. The question is: how much of her own time is she willing to spend?',
    genre: 'Steampunk',
  },
  {
    title: 'The Library of Unwritten Letters',
    content: 'Between the shelves of every library exists a hidden wing. The books there have no titles, only addresses. "To my father, 1987." "To the girl on the 4:15 train." "To myself, if I survive." The librarian—a woman with ink-stained fingers and eyes that have read every goodbye—doesn\'t let anyone take a book. She only lets them write the ending they never sent. Tonight, someone has returned a letter she wrote fifty years ago. It\'s finally been answered.',
    genre: 'Contemporary',
  },
  {
    title: 'The Dragon\'s Hoard (It\'s Not Gold)',
    content: 'The knights expected gold. Jewels. Magical artifacts. They found teeth. Baby teeth. Millions of them, sorted by year and name, each in a velvet box labeled in careful script: "Timmy, age 6, upper left molar." "Sarah, age 7, first lost tooth." The dragon didn\'t breathe fire. It breathed nostalgia. The knights dropped their swords and wept for childhoods they couldn\'t remember. The dragon curled around its hoard and whispered, "Do you remember what it felt like to believe in magic?"',
    genre: 'Fairy Tale Retelling',
  },
  {
    title: 'The Last Human Library',
    content: 'In 2847, books are illegal. Stories are contraband. The Keepers memorize entire novels, becoming living books—walking, breathing, dying libraries. Keeper-734 carries "One Hundred Years of Solitude" in her neural pathways. Keeper-12 carries "The Great Gatsby" in her muscle memory. When the Enforcers come, they don\'t burn paper. They execute people. But you can\'t burn a story that lives in the blood. You can only make it immortal.',
    genre: 'Dystopian',
  },
];

async function seedDatabase() {
  console.log('🌱 Starting database seed...');
  console.log(`📚 Preparing to insert ${stories.length} stories`);

  let successCount = 0;
  let errorCount = 0;

  for (const story of stories) {
    const roomId = uuidv4();
    
    try {
      const { data, error } = await supabase
        .from('Rooms')
        .insert([
          {
            room_id: roomId,
            story_title: story.title,
            story_content: story.content,
            genre: story.genre,
          }
        ])
        .select('room_id');

      if (error) {
        console.error(`❌ Failed to insert "${story.title}":`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Inserted: "${story.title}" (${story.genre})`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Error inserting "${story.title}":`, err);
      errorCount++;
    }
  }

  console.log('\n📊 Seed Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📝 Total: ${stories.length}`);
  
  if (successCount > 0) {
    console.log('\n🎉 Database seeded successfully! Refresh the app to see the new stories.');
  }
}

seedDatabase().catch(console.error);