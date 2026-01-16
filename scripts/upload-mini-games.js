/**
 * Upload Mini-Game HTML Files to Firebase Storage
 * 
 * This script uploads the mini-game HTML files to Firebase Storage
 * so they can be loaded by the MiniGameWebView component.
 * 
 * Usage:
 *   node scripts/upload-mini-games.js
 * 
 * Prerequisites:
 *   - Firebase Admin SDK credentials (service account key)
 *   - Or run from Firebase CLI with proper authentication
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');
const path = require('path');

// Configuration
const BUCKET_NAME = 'hoodgames-61259.firebasestorage.app';
const MINI_GAMES_DIR = path.join(__dirname, '..', 'mini-games');
const STORAGE_PATH = 'mini-games';

// Mini-game files to upload
const MINI_GAME_FILES = [
  'tap_count.html',
  'hold_duration.html',
  'rhythm_tap.html',
];

async function uploadMiniGames() {
  console.log('🎮 Mini-Game Upload Script');
  console.log('==========================\n');

  // Check if service account key exists
  const serviceAccountPath = path.join(__dirname, '..', 'service-account-key.json');
  
  if (!fs.existsSync(serviceAccountPath)) {
    console.log('⚠️  Service account key not found at:', serviceAccountPath);
    console.log('\n📋 MANUAL UPLOAD INSTRUCTIONS:');
    console.log('================================\n');
    console.log('Since no service account key is available, please upload manually:\n');
    console.log('1. Go to Firebase Console: https://console.firebase.google.com');
    console.log('2. Select your project: hoodgames-61259');
    console.log('3. Navigate to Storage');
    console.log('4. Create a folder called "mini-games"');
    console.log('5. Upload the following files from the mini-games/ directory:\n');
    
    MINI_GAME_FILES.forEach(file => {
      const filePath = path.join(MINI_GAMES_DIR, file);
      if (fs.existsSync(filePath)) {
        console.log(`   ✅ ${file}`);
      } else {
        console.log(`   ❌ ${file} (NOT FOUND)`);
      }
    });
    
    console.log('\n6. After uploading, make sure each file has public read access');
    console.log('   or configure Storage rules to allow authenticated reads.\n');
    
    console.log('📍 Expected Storage URLs after upload:');
    MINI_GAME_FILES.forEach(file => {
      console.log(`   https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/mini-games%2F${file}?alt=media`);
    });
    
    return;
  }

  // Initialize Firebase Admin
  try {
    const serviceAccount = require(serviceAccountPath);
    
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: BUCKET_NAME,
    });

    const bucket = getStorage().bucket();

    console.log('📤 Uploading mini-game files to Firebase Storage...\n');

    for (const file of MINI_GAME_FILES) {
      const localPath = path.join(MINI_GAMES_DIR, file);
      const storagePath = `${STORAGE_PATH}/${file}`;

      if (!fs.existsSync(localPath)) {
        console.log(`❌ File not found: ${localPath}`);
        continue;
      }

      try {
        await bucket.upload(localPath, {
          destination: storagePath,
          metadata: {
            contentType: 'text/html',
            cacheControl: 'public, max-age=3600', // Cache for 1 hour
          },
        });

        // Make the file publicly accessible
        await bucket.file(storagePath).makePublic();

        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${storagePath}`;
        console.log(`✅ Uploaded: ${file}`);
        console.log(`   URL: ${publicUrl}\n`);
      } catch (uploadError) {
        console.error(`❌ Failed to upload ${file}:`, uploadError.message);
      }
    }

    console.log('🎉 Upload complete!');
    console.log('\n📍 Firebase Storage URLs (for MiniGameWebView):');
    MINI_GAME_FILES.forEach(file => {
      console.log(`   https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/mini-games%2F${file}?alt=media`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the upload
uploadMiniGames();
