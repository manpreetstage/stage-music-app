#!/usr/bin/env node

/**
 * Stage Music - Enhanced Bulk Upload Script v2
 * Supports both SINGLE SONGS and ALBUMS
 *
 * CSV Format:
 * - If album_name is blank → Upload as single song
 * - If album_name is filled → Group as album
 *
 * Usage: node bulk-upload-v2.js songs.csv
 */

require('dotenv').config();
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const db = new sqlite3.Database('./stage_music.db');

// Configuration
const AUDIO_FOLDER = './bulk-songs/';
const COVER_FOLDER = './bulk-covers/';
const BATCH_SIZE = 5;

// Statistics
const stats = {
    totalSongs: 0,
    singleSongs: 0,
    albumSongs: 0,
    albumCount: 0,
    success: 0,
    failed: 0,
    startTime: Date.now()
};

const failedSongs = [];

/**
 * Upload file to S3
 */
async function uploadToS3(localPath, s3Key, contentType) {
    try {
        const fileContent = fs.readFileSync(localPath);
        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: s3Key,
            Body: fileContent,
            ContentType: contentType
        };
        const result = await s3.upload(params).promise();
        return result.Location;
    } catch (error) {
        throw new Error(`S3 upload failed: ${error.message}`);
    }
}

/**
 * Get content type from file extension
 */
function getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const types = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.flac': 'audio/flac',
        '.ogg': 'audio/ogg',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    };
    return types[ext] || 'application/octet-stream';
}

/**
 * Find audio file
 */
function findAudioFile(filename) {
    const files = fs.readdirSync(AUDIO_FOLDER);
    const match = files.find(f => f.toLowerCase() === filename.toLowerCase());
    return match ? path.join(AUDIO_FOLDER, match) : null;
}

/**
 * Find cover file
 */
function findCoverFile(filename) {
    if (!fs.existsSync(COVER_FOLDER)) return null;
    const files = fs.readdirSync(COVER_FOLDER);
    const match = files.find(f => f.toLowerCase() === filename.toLowerCase());
    return match ? path.join(COVER_FOLDER, match) : null;
}

/**
 * Create album in database
 */
async function createAlbum(albumName, artist, coverUrl, language, company) {
    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO albums (title, artist, cover_image, language, company, user_id)
                     VALUES (?, ?, ?, ?, ?, 1)`;

        db.run(sql, [albumName, artist, coverUrl, language || 'Hindi', company || ''], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

/**
 * Upload single song
 */
async function uploadSingleSong(songData, index) {
    const {
        title, singer, audio_file, cover_file,
        music_director, composer, company, lyricist, language
    } = songData;

    try {
        console.log(`\n[${index + 1}] 🎵 Single Song: ${title} - ${singer}`);

        // Find audio file
        const audioPath = findAudioFile(audio_file);
        if (!audioPath) throw new Error(`Audio not found: ${audio_file}`);

        console.log(`   📤 Uploading audio...`);
        const timestamp = Date.now();
        const audioExt = path.extname(audio_file);
        const audioS3Key = `songs/${timestamp}-${Math.round(Math.random() * 1E9)}${audioExt}`;
        const audioUrl = await uploadToS3(audioPath, audioS3Key, getContentType(audio_file));
        console.log(`   ✅ Audio uploaded`);

        // Upload cover if provided
        let coverUrl = null;
        if (cover_file) {
            const coverPath = findCoverFile(cover_file);
            if (coverPath) {
                console.log(`   📤 Uploading cover...`);
                const coverExt = path.extname(cover_file);
                const coverS3Key = `covers/${timestamp}-${Math.round(Math.random() * 1E9)}${coverExt}`;
                coverUrl = await uploadToS3(coverPath, coverS3Key, getContentType(cover_file));
                console.log(`   ✅ Cover uploaded`);
            }
        }

        // Insert into database
        const sql = `INSERT INTO songs (
            title, singer, music_director, composer, company, lyrics,
            audio_file, cover_image, language
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        await new Promise((resolve, reject) => {
            db.run(sql, [
                title, singer,
                music_director || '', composer || '', company || '', lyricist || '',
                audioUrl, coverUrl, language || 'Hindi'
            ], function(err) {
                if (err) reject(err);
                else {
                    console.log(`   💾 Database updated (Song ID: ${this.lastID})`);
                    resolve();
                }
            });
        });

        stats.success++;
        stats.singleSongs++;
        return { success: true };

    } catch (error) {
        stats.failed++;
        failedSongs.push({ title, singer, error: error.message });
        console.error(`   ❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Upload album with multiple songs
 */
async function uploadAlbum(albumName, albumSongs) {
    try {
        console.log(`\n📀 Album: ${albumName} (${albumSongs.length} songs)`);
        console.log(`   Artist: ${albumSongs[0].singer}`);

        // Get album cover (use first song's cover)
        const firstSong = albumSongs[0];
        let albumCoverUrl = null;

        if (firstSong.cover_file) {
            const coverPath = findCoverFile(firstSong.cover_file);
            if (coverPath) {
                console.log(`   📤 Uploading album cover...`);
                const timestamp = Date.now();
                const coverExt = path.extname(firstSong.cover_file);
                const coverS3Key = `covers/${timestamp}-album-${Math.round(Math.random() * 1E9)}${coverExt}`;
                albumCoverUrl = await uploadToS3(coverPath, coverS3Key, getContentType(firstSong.cover_file));
                console.log(`   ✅ Album cover uploaded`);
            }
        }

        // Create album in database
        console.log(`   📝 Creating album...`);
        const albumId = await createAlbum(
            albumName,
            firstSong.singer,
            albumCoverUrl,
            firstSong.language,
            firstSong.company
        );
        console.log(`   ✅ Album created (ID: ${albumId})`);

        // Upload each song
        let songNumber = 1;
        for (const songData of albumSongs) {
            try {
                console.log(`\n   [${songNumber}/${albumSongs.length}] ${songData.title}`);

                // Find audio
                const audioPath = findAudioFile(songData.audio_file);
                if (!audioPath) throw new Error(`Audio not found: ${songData.audio_file}`);

                console.log(`      📤 Uploading...`);
                const timestamp = Date.now();
                const audioExt = path.extname(songData.audio_file);
                const audioS3Key = `songs/${timestamp}-${Math.round(Math.random() * 1E9)}${audioExt}`;
                const audioUrl = await uploadToS3(audioPath, audioS3Key, getContentType(songData.audio_file));
                console.log(`      ✅ Uploaded`);

                // Insert song with album_id
                const sql = `INSERT INTO songs (
                    title, singer, music_director, composer, company, lyrics,
                    audio_file, cover_image, language, album_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                await new Promise((resolve, reject) => {
                    db.run(sql, [
                        songData.title, songData.singer,
                        songData.music_director || '', songData.composer || '',
                        songData.company || '', songData.lyricist || '',
                        audioUrl, albumCoverUrl, songData.language || 'Hindi',
                        albumId
                    ], function(err) {
                        if (err) reject(err);
                        else {
                            console.log(`      💾 Song saved (ID: ${this.lastID})`);
                            resolve();
                        }
                    });
                });

                stats.success++;
                stats.albumSongs++;
                songNumber++;

            } catch (error) {
                stats.failed++;
                failedSongs.push({
                    album: albumName,
                    title: songData.title,
                    error: error.message
                });
                console.error(`      ❌ Error: ${error.message}`);
            }
        }

        console.log(`\n   ✅ Album "${albumName}" complete!`);
        stats.albumCount++;
        return { success: true };

    } catch (error) {
        console.error(`   ❌ Album error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Parse CSV file
 */
async function parseCSV(csvPath) {
    return new Promise((resolve, reject) => {
        const songs = [];
        const fileStream = fs.createReadStream(csvPath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let isFirstLine = true;
        let headers = [];

        rl.on('line', (line) => {
            if (isFirstLine) {
                headers = line.split(',').map(h => h.trim());
                isFirstLine = false;
            } else if (line.trim()) {
                const values = line.split(',').map(v => v.trim());
                const song = {};
                headers.forEach((header, i) => {
                    song[header] = values[i] || '';
                });
                songs.push(song);
            }
        });

        rl.on('close', () => resolve(songs));
        rl.on('error', reject);
    });
}

/**
 * Group songs by album
 */
function groupSongsAndAlbums(songs) {
    const singles = [];
    const albumsMap = new Map();

    songs.forEach(song => {
        if (song.album_name && song.album_name.trim()) {
            // Album song
            const albumName = song.album_name.trim();
            if (!albumsMap.has(albumName)) {
                albumsMap.set(albumName, []);
            }
            albumsMap.get(albumName).push(song);
        } else {
            // Single song
            singles.push(song);
        }
    });

    return { singles, albums: Array.from(albumsMap.entries()) };
}

/**
 * Main function
 */
async function main() {
    try {
        console.log('\n' + '='.repeat(70));
        console.log('   🎵 Stage Music - Enhanced Bulk Upload v2 🎵');
        console.log('   Supports: Single Songs + Albums');
        console.log('='.repeat(70) + '\n');

        // Check CSV file
        const csvFile = process.argv[2];
        if (!csvFile) {
            console.error('❌ Error: CSV file not provided');
            console.log('\nUsage: node bulk-upload-v2.js songs.csv');
            console.log('\nCSV Format:');
            console.log('title,singer,audio_file,cover_file,album_name,music_director,composer,lyricist,company,language');
            console.log('Song1,Artist,song1.mp3,cover.jpg,,Director,Composer,Lyricist,Label,Hindi   ← Single song');
            console.log('Song2,Artist,song2.mp3,cover.jpg,Album Name,Director,Composer,Lyricist,Label,Hindi  ← Album song');
            process.exit(1);
        }

        if (!fs.existsSync(csvFile)) {
            console.error(`❌ CSV file not found: ${csvFile}`);
            process.exit(1);
        }

        if (!fs.existsSync(AUDIO_FOLDER)) {
            console.error(`❌ Audio folder not found: ${AUDIO_FOLDER}`);
            process.exit(1);
        }

        // Verify S3
        console.log('🔍 Verifying S3 connection...');
        await s3.headBucket({ Bucket: process.env.AWS_S3_BUCKET }).promise();
        console.log('✅ S3 bucket accessible\n');

        // Parse CSV
        console.log('📄 Reading CSV file...');
        const allSongs = await parseCSV(csvFile);
        stats.totalSongs = allSongs.length;
        console.log(`✅ Found ${allSongs.length} songs\n`);

        // Group singles and albums
        const { singles, albums } = groupSongsAndAlbums(allSongs);

        console.log('📊 Upload Summary:');
        console.log(`   🎵 Single Songs: ${singles.length}`);
        console.log(`   📀 Albums: ${albums.length} (${albums.reduce((sum, [_, songs]) => sum + songs.length, 0)} songs)`);
        console.log('');

        // Show sample
        if (singles.length > 0) {
            console.log('📝 Sample Single Song:');
            console.log(`   Title: ${singles[0].title}`);
            console.log(`   Singer: ${singles[0].singer}\n`);
        }

        if (albums.length > 0) {
            console.log('📝 Sample Album:');
            console.log(`   Album: ${albums[0][0]}`);
            console.log(`   Songs: ${albums[0][1].length}\n`);
        }

        // Confirm
        console.log('⚠️  Ready to upload. Press Ctrl+C to cancel, or wait 5 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('🚀 Starting upload...\n');
        console.log('='.repeat(70));

        // Upload single songs
        if (singles.length > 0) {
            console.log('\n📍 UPLOADING SINGLE SONGS\n');
            for (let i = 0; i < singles.length; i++) {
                await uploadSingleSong(singles[i], i);
            }
        }

        // Upload albums
        if (albums.length > 0) {
            console.log('\n\n📍 UPLOADING ALBUMS\n');
            for (const [albumName, albumSongs] of albums) {
                await uploadAlbum(albumName, albumSongs);
            }
        }

        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('📊 Final Summary:');
        console.log('='.repeat(70));
        console.log(`✅ Total Success: ${stats.success} songs`);
        console.log(`   🎵 Single Songs: ${stats.singleSongs}`);
        console.log(`   📀 Album Songs: ${stats.albumSongs} (${stats.albumCount} albums)`);
        console.log(`❌ Failed: ${stats.failed} songs`);
        console.log(`⏱️  Time taken: ${((Date.now() - stats.startTime) / 1000).toFixed(1)}s`);
        console.log('='.repeat(70));

        // Failed songs
        if (failedSongs.length > 0) {
            console.log('\n❌ Failed Songs:');
            failedSongs.forEach((song, i) => {
                if (song.album) {
                    console.log(`   ${i + 1}. [Album: ${song.album}] ${song.title}`);
                } else {
                    console.log(`   ${i + 1}. ${song.title} - ${song.singer}`);
                }
                console.log(`      Error: ${song.error}`);
            });

            fs.writeFileSync('failed-songs.json', JSON.stringify(failedSongs, null, 2));
            console.log(`\n💾 Failed songs saved to: failed-songs.json`);
        }

        console.log('\n✅ Bulk upload complete!\n');
        db.close();

    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        db.close();
        process.exit(1);
    }
}

main();
