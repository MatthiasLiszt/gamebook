import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
}

rl.question('Which batch would you like to clean? (e.g., 1 or 2): ', (batchInput) => {
  const batchNum = batchInput.trim();

  if (!batchNum) {
    console.error('Batch number is required.');
    rl.close();
    return;
  }

  const sectionPath = path.resolve(`./src/data/sections/batch${batchNum}.json`);
  const localePath = path.resolve(`./locales/en/sections/batch${batchNum}.json`);

  const sectionOutputPath = path.resolve(`./src/data/sections/batch${batchNum}_cleaned.json`);
  const localeOutputPath = path.resolve(`./locales/en/sections/batch${batchNum}_cleaned.json`);

  if (!fs.existsSync(sectionPath) || !fs.existsSync(localePath)) {
    console.error(`Error: Missing batch files in src/data/sections or locales/en/sections.`);
    rl.close();
    return;
  }

  const rawSections = JSON.parse(fs.readFileSync(sectionPath, 'utf-8'));
  const rawLocales = JSON.parse(fs.readFileSync(localePath, 'utf-8'));

  const newSections = JSON.parse(JSON.stringify(rawSections));
  const newLocales = JSON.parse(JSON.stringify(rawLocales));

  for (const [sectionId, sectionObj] of Object.entries(newSections)) {
    if (!newLocales[sectionId]) {
      newLocales[sectionId] = {};
    }

    if (Array.isArray(sectionObj.choice) && sectionObj.choice.length > 0) {
      newLocales[sectionId].choices = newLocales[sectionId].choices || {};

      sectionObj.choice.forEach((choiceItem, idx) => {
        if (choiceItem.text) {
          const rawText = choiceItem.text;

          // GUARD: If the text in data/sections is already a key reference, stop processing!
          if (rawText.startsWith('choice_')) {
            console.warn(`Warning: Section ${sectionId} choice ${idx + 1} already contains a key reference ("${rawText}"). Please restore the original English source file.`);
            return;
          }

          const slug = slugify(rawText) || `option_${idx + 1}`;
          const choiceKey = `choice_${sectionId}_${slug}`;

          // Write actual raw English text into locales
          newLocales[sectionId].choices[choiceKey] = rawText;

          // Replace inline choice text with key reference in section data
          choiceItem.text = choiceKey;
        }
      });
    }
  }

  fs.writeFileSync(sectionOutputPath, JSON.stringify(newSections, null, 2), 'utf-8');
  fs.writeFileSync(localeOutputPath, JSON.stringify(newLocales, null, 2), 'utf-8');

  console.log(`\nDone! Created output files.`);
  rl.close();
});