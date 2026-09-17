import fs from "fs";
import path from "path";

// Paths configuration
const sourceFile = new URL("sections.json", import.meta.url).pathname;
const outputDir = new URL("sections", import.meta.url).pathname;

const BATCH_SIZE = 40;

function splitSections() {
    // 1. Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 2. Read and parse the original sections.json
    if (!fs.existsSync(sourceFile)) {
        console.error(`Source file not found at: ${sourceFile}`);
        process.exit(1);
    }

    const rawData = fs.readFileSync(sourceFile, "utf-8");
    const sections = JSON.parse(rawData);

    // Sort keys numerically to ensure sequential batching
    const keys = Object.keys(sections).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    let batchIndex = 1;
    let currentBatch = {};
    let countInBatch = 0;

    // 3. Group sections into chunks of 40 and write to disk
    for (const key of keys) {
        currentBatch[key] = sections[key];
        countInBatch++;

        if (countInBatch === BATCH_SIZE) {
            const fileName = `batch${batchIndex}.json`;
            fs.writeFileSync(
                path.join(outputDir, fileName),
                JSON.stringify(currentBatch, null, 2),
                "utf-8"
            );
            console.log(`Created: ${fileName} (${countInBatch} sections)`);

            batchIndex++;
            currentBatch = {};
            countInBatch = 0;
        }
    }

    // Write any remaining sections in the final batch
    if (countInBatch > 0) {
        const fileName = `batch${batchIndex}.json`;
        fs.writeFileSync(
            path.join(outputDir, fileName),
            JSON.stringify(currentBatch, null, 2),
            "utf-8"
        );
        console.log(`Created: ${fileName} (${countInBatch} sections)`);
    }

    console.log(`\nSuccessfully split ${keys.length} sections into ${batchIndex} batches.`);
}

splitSections();