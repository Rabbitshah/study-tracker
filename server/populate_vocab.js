require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./src/config/db');

async function main() {
  const userId = 'd89fc05c-07f3-4058-a299-9074917379c8';
  
  const vocabFile = fs.readFileSync(
    path.join(__dirname, '../client/src/utils/greVocabData.js'),
    'utf8'
  );
  
  // Transform ES module to CommonJS for require
  const jsContent = vocabFile.replace('export const greVocabData =', 'module.exports =');
  const tempPath = path.join(__dirname, '_temp_vocab.js');
  fs.writeFileSync(tempPath, jsContent, 'utf8');
  const greVocabData = require(tempPath);
  fs.unlinkSync(tempPath);
  
  const wordsToInsert = [];
  
  // All words from Group 1
  for (const item of greVocabData['Group 1']) {
    wordsToInsert.push({ group: 'Group 1', word: item[0] });
  }
  
  // Group 2 words up to and including "avaricious"
  for (const item of greVocabData['Group 2']) {
    const word = item[0];
    wordsToInsert.push({ group: 'Group 2', word });
    if (word.toLowerCase() === 'avaricious') {
      break;
    }
  }
  
  console.log(`Inserting ${wordsToInsert.length} learned words for user ${userId}...`);
  
  for (const entry of wordsToInsert) {
    await pool.query(
      `INSERT INTO learned_vocab (user_id, group_name, word)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, group_name, word) DO NOTHING`,
      [userId, entry.group, entry.word]
    );
    console.log(`  ✓ ${entry.group} | ${entry.word}`);
  }
  
  const { rows } = await pool.query(
    `SELECT COUNT(*) FROM learned_vocab WHERE user_id = $1`,
    [userId]
  );
  console.log(`\nDone. Total words stored in DB: ${rows[0].count}`);
  
  pool.end();
}

main().catch(err => {
  console.error('Error:', err.message);
  pool.end();
  process.exit(1);
});
