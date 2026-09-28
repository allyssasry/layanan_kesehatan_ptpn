const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let envContent = '';
try {
  envContent = fs.readFileSync('.env.local', 'utf-8');
} catch (e) {
  envContent = fs.readFileSync('.env', 'utf-8');
}

const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function cleanPenyakit() {
  console.log('Fetching mini_mcu_records...');
  const { data, error } = await supabase
    .from('mini_mcu_records')
    .select('id, diagnosa, penyakit, penyakit_text');

  if (error) {
    console.error('Error fetching records:', error);
    return;
  }

  console.log(`Total mini_mcu_records: ${data.length}`);

  let updatedCount = 0;
  const batchSize = 50;

  for (let i = 0; i < data.length; i += batchSize) {
    const chunk = data.slice(i, i + batchSize);
    await Promise.all(
      chunk.map(async (row) => {
        // Clear penyakit and set penyakit_text to 'Tidak memiliki penyakit'
        const { error: updateErr } = await supabase
          .from('mini_mcu_records')
          .update({
            penyakit: [],
            penyakit_text: 'Tidak memiliki penyakit',
          })
          .eq('id', row.id);

        if (updateErr) {
          console.error(`Failed to update id ${row.id}:`, updateErr.message);
        } else {
          updatedCount++;
        }
      })
    );
    console.log(`Updated ${updatedCount}/${data.length} records...`);
  }

  console.log('Successfully cleaned all mini_mcu_records penyakit fields!');
}

cleanPenyakit();
