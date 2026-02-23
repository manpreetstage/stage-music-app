#!/usr/bin/env node

/**
 * Auto-generate CSV from filenames
 * Usage: node generate-csv.js
 */

const fs = require('fs');
const path = require('path');

const AUDIO_FOLDER = './bulk-songs/';
const OUTPUT_FILE = 'auto-generated.csv';

console.log('🔍 Scanning bulk-songs/ folder...\n');

// Check if folder exists
if (!fs.existsSync(AUDIO_FOLDER)) {
    console.error('❌ Error: bulk-songs/ folder not found');
    console.log('   Create it first: mkdir bulk-songs');
    process.exit(1);
}

// Read files
const files = fs.readdirSync(AUDIO_FOLDER);
const audioFiles = files.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'].includes(ext);
});

if (audioFiles.length === 0) {
    console.error('❌ No audio files found in bulk-songs/');
    console.log('   Supported formats: .mp3, .wav, .m4a, .aac, .flac, .ogg');
    process.exit(1);
}

console.log(`✅ Found ${audioFiles.length} audio files\n`);

// Generate CSV
const csv = ['title,singer,audio_file,cover_file,music_director,composer,lyricist,company,language'];

audioFiles.forEach((filename, index) => {
    // Extract title from filename (remove extension)
    const title = path.basename(filename, path.extname(filename))
        .replace(/_/g, ' ')  // Replace underscores with spaces
        .replace(/-/g, ' ')  // Replace hyphens with spaces
        .trim();

    // Try to detect singer from filename patterns
    // Example: "Nidiya - Vishal Mishra.mp3" → singer = "Vishal Mishra"
    let singer = 'Unknown Artist';
    if (title.includes(' - ')) {
        const parts = title.split(' - ');
        singer = parts[1] || 'Unknown Artist';
    }

    // Guess cover file (same name but .jpg/.png)
    const baseName = path.basename(filename, path.extname(filename));
    const possibleCovers = [
        `${baseName}.jpg`,
        `${baseName}.jpeg`,
        `${baseName}.png`,
        `${baseName}.webp`
    ];

    let coverFile = '';
    if (fs.existsSync('./bulk-covers/')) {
        const coverFiles = fs.readdirSync('./bulk-covers/');
        for (const possible of possibleCovers) {
            if (coverFiles.some(f => f.toLowerCase() === possible.toLowerCase())) {
                coverFile = possible;
                break;
            }
        }
    }

    // Add row
    csv.push(`${title},${singer},${filename},${coverFile},,,,,,Hindi`);

    // Show progress
    if ((index + 1) % 50 === 0 || index === audioFiles.length - 1) {
        console.log(`   📝 Processed: ${index + 1}/${audioFiles.length}`);
    }
});

// Write CSV file
fs.writeFileSync(OUTPUT_FILE, csv.join('\n'));

console.log(`\n✅ CSV file generated: ${OUTPUT_FILE}`);
console.log(`   Total songs: ${audioFiles.length}`);
console.log(`\n📝 Next steps:`);
console.log(`   1. Open ${OUTPUT_FILE} in Excel/Google Sheets`);
console.log(`   2. Update singer names and other details`);
console.log(`   3. Save the file`);
console.log(`   4. Run: node bulk-upload.js ${OUTPUT_FILE}`);
console.log(`\n💡 Tip: If filenames are like "Title - Artist.mp3",`);
console.log(`   the artist will be auto-detected!\n`);

// Show sample rows
console.log('📄 Sample rows from CSV:');
console.log('─'.repeat(70));
const sampleRows = csv.slice(0, 6);  // Header + 5 rows
sampleRows.forEach(row => {
    const cols = row.split(',');
    if (cols[0] === 'title') {
        console.log('| Title | Singer | File |');
        console.log('─'.repeat(70));
    } else {
        console.log(`| ${cols[0].substring(0, 20).padEnd(20)} | ${cols[1].substring(0, 15).padEnd(15)} | ${cols[2].substring(0, 20)} |`);
    }
});
console.log('─'.repeat(70));
console.log(`... and ${audioFiles.length - 5} more songs\n`);
