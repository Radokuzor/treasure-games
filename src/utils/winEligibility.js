import { doc, getDoc, setDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { getDeviceId } from './deviceId';

/**
 * Get today's date string in YYYY-MM-DD format
 */
const getTodayString = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

/**
 * Check if a user/device is eligible to win today
 * Supports separate limits for physical and battle royale games
 * Users can win max 1 physical game + 1 battle royale game per day (2 total)
 * 
 * @param {Firestore} db - Firestore database instance
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} gameType - 'physical' or 'battle_royale' (defaults to 'physical' for backwards compatibility)
 * @returns {Promise<{eligible: boolean, reason?: string, deviceId: string, message?: string}>}
 */
export const checkWinEligibility = async (db, userId, gameType = 'physical') => {
  try {
    const deviceId = await getDeviceId();
    const today = getTodayString();

    // Check user's document for last win
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // New user, definitely eligible
      return { eligible: true, deviceId };
    }

    const userData = userDoc.data();

    // Check based on game type
    if (gameType === 'battle_royale') {
      // Check if user already won a battle royale today
      // Check both lastBattleRoyaleWinDate and lastTournamentWin.wonAt date
      const lastWinDate = userData.lastBattleRoyaleWinDate;
      const lastTournamentWin = userData.lastTournamentWin;
      let lastWinDateString = null;
      
      if (lastTournamentWin?.wonAt) {
        // Convert wonAt to date string (handle both Timestamp and Date objects)
        const wonAtDate = lastTournamentWin.wonAt?.toDate?.() || new Date(lastTournamentWin.wonAt);
        lastWinDateString = wonAtDate.toISOString().split('T')[0];
      }
      
      if (lastWinDate === today || lastWinDateString === today) {
        return {
          eligible: false,
          reason: 'user_won_battle_royale_today',
          deviceId,
          message: "🏆 You've already won a tournament today! Play for fun, but prizes go to other players.",
        };
      }

      // Check device-level battle royale wins
      const deviceWinRef = doc(db, 'dailyWins', `${today}_${deviceId}_battle_royale`);
      const deviceWinDoc = await getDoc(deviceWinRef);

      if (deviceWinDoc.exists()) {
        const deviceWinData = deviceWinDoc.data();
        if (deviceWinData.userId !== userId) {
          return {
            eligible: false,
            reason: 'device_won_battle_royale_today',
            deviceId,
            message: "📱 This device already has a Battle Royale winner today. Try again tomorrow!",
          };
        }
      }
    } else {
      // Physical game - check if user already won a physical game today
      if (userData.lastPhysicalWinDate === today) {
        return {
          eligible: false,
          reason: 'user_won_physical_today',
          deviceId,
          message: "🏆 You've already won a physical game today! Play for fun, but prizes go to other players.",
        };
      }

      // Check device-level physical wins
      const deviceWinRef = doc(db, 'dailyWins', `${today}_${deviceId}_physical`);
      const deviceWinDoc = await getDoc(deviceWinRef);

      if (deviceWinDoc.exists()) {
        const deviceWinData = deviceWinDoc.data();
        if (deviceWinData.userId !== userId) {
          return {
            eligible: false,
            reason: 'device_won_physical_today',
            deviceId,
            message: "📱 This device already has a physical game winner today. Try again tomorrow!",
          };
        }
      }
    }

    return { eligible: true, deviceId };
  } catch (error) {
    console.error('Error checking win eligibility:', error);
    // On error, allow them to play (fail open for better UX)
    // The server-side rules should be the final check
    return { eligible: true, deviceId: 'error', error: error.message };
  }
};

/**
 * Record a daily win for a user and device
 * Call this AFTER successfully recording the user as a winner
 * Tracks wins separately by game type (physical vs battle_royale)
 * 
 * @param {Firestore} db - Firestore database instance
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} gameId - The game ID they won
 * @param {string} gameName - The game name
 * @param {number} prizeAmount - The prize amount
 * @param {string} gameType - 'physical' or 'battle_royale' (defaults to 'physical')
 */
export const recordDailyWin = async (db, userId, gameId, gameName, prizeAmount, gameType = 'physical') => {
  try {
    const deviceId = await getDeviceId();
    const today = getTodayString();

    // Update user's last win info based on game type
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    const winDateField = gameType === 'battle_royale' ? 'lastBattleRoyaleWinDate' : 'lastPhysicalWinDate';
    
    const updateData = {
      [winDateField]: today,
      lastWinDeviceId: deviceId,
      lastWinGameId: gameId,
      lastWinGameName: gameName,
      lastWinAmount: prizeAmount,
      lastWinAt: serverTimestamp(),
      lastWinGameType: gameType,
      totalWins: increment(1),
      totalEarnings: increment(prizeAmount),
    };

    if (userDoc.exists()) {
      await updateDoc(userRef, updateData);
    } else {
      // Create user doc if it doesn't exist
      await setDoc(userRef, {
        ...updateData,
        totalWins: 1,
        totalEarnings: prizeAmount,
        createdAt: serverTimestamp(),
      });
    }

    // Also record in dailyWins collection (for device-level tracking)
    // Include game type in the document ID for separate tracking
    const deviceWinRef = doc(db, 'dailyWins', `${today}_${deviceId}_${gameType}`);
    await setDoc(deviceWinRef, {
      userId,
      deviceId,
      gameId,
      gameName,
      prizeAmount,
      gameType,
      date: today,
      wonAt: serverTimestamp(),
    });

    console.log(`✅ Daily ${gameType} win recorded for user:`, userId, 'device:', deviceId);
    return true;
  } catch (error) {
    console.error('Error recording daily win:', error);
    // Don't throw - the win was already recorded in the game
    // This is just for tracking purposes
    return false;
  }
};

/**
 * Get user's win stats
 * 
 * @param {Firestore} db - Firestore database instance
 * @param {string} userId - The user's Firebase Auth UID
 * @returns {Promise<{totalWins: number, totalEarnings: number, lastWinDate: string|null}>}
 */
export const getUserWinStats = async (db, userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return { totalWins: 0, totalEarnings: 0, lastWinDate: null };
    }

    const userData = userDoc.data();
    return {
      totalWins: userData.totalWins || 0,
      totalEarnings: userData.totalEarnings || 0,
      lastWinDate: userData.lastWinDate || null,
      lastWinGameName: userData.lastWinGameName || null,
    };
  } catch (error) {
    console.error('Error getting user win stats:', error);
    return { totalWins: 0, totalEarnings: 0, lastWinDate: null };
  }
};

/**
 * Process battle royale winners when competition ends
 * Awards prizes to top ELIGIBLE players based on prize distribution
 * Skips ineligible players (already won today) and moves to next eligible
 * 
 * @param {Firestore} db - Firestore database instance
 * @param {Object} game - The game document data
 * @param {Function} sendNotification - Optional function to send push notifications
 * @returns {Promise<Array>} Array of winner objects with prize amounts
 */
/**
 * Process tournament winners when competition ends
 * Awards prizes to top players based on prize distribution
 * 
 * @param {Firestore} db - Firestore database instance
 * @param {Object} game - The game document data
 * @param {Function} sendNotification - Optional function to send push notifications
 * @returns {Promise<Array>} Array of winner objects with prize amounts
 */
export const processBattleRoyaleWinners = async (db, game, sendNotification = null) => {
  try {
    console.log('🏆 Processing tournament winners for game:', game?.id, game?.name);
    
    // CRITICAL FIX: Check if already processed
    if (game.tournamentWinners && game.tournamentWinners.length > 0) {
      console.log('⚠️ Winners already processed for this game, returning existing winners');
      return game.tournamentWinners;
    }
    
    if (!game || !game.leaderboard || game.leaderboard.length === 0) {
      console.log('ℹ️ No leaderboard entries to process - game had no players');
      return [];
    }

    const prizeAmount = Number(game.prizeAmount) || 0;
    const prizeDistribution = game.virtualGame?.prizeDistribution || { 1: 100, 2: 60, 3: 30 };
    const winnerSlots = Number(game.winnerSlots) || 3;

    console.log('🏆 Prize info:', { prizeAmount, prizeDistribution, winnerSlots });
    console.log('🏆 Leaderboard entries:', game.leaderboard.length);

    // Sort leaderboard by score
    const sortedLeaderboard = [...game.leaderboard].sort((a, b) => {
      if (game.virtualGame?.type === 'tap_count') {
        return a.score - b.score; // Lower is better
      }
      return b.score - a.score; // Higher is better
    });

    console.log('🏆 Sorted leaderboard (top 5):', sortedLeaderboard.slice(0, 5).map(e => ({ username: e.username, score: e.score })));

    const winners = [];

    // Process top players as winners - check eligibility before awarding prizes
    for (let i = 0; i < Math.min(winnerSlots, sortedLeaderboard.length); i++) {
      const entry = sortedLeaderboard[i];
      const position = i + 1;
      const prizePercent = prizeDistribution[position] || 0;
      const winnerPrize = Math.round(prizeAmount * prizePercent / 100);

      console.log(`🏆 Processing winner #${position}: ${entry.username} (${entry.oderId}) - Prize: $${winnerPrize}`);

      // Check eligibility BEFORE awarding prizes
      const userRef = doc(db, 'users', entry.oderId);
      const userDoc = await getDoc(userRef);
      
      // CRITICAL: Check if user already won this specific game
      let isEligible = true;
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const lastWin = userData.lastTournamentWin;
        if (lastWin && lastWin.gameId === game.id) {
          console.log(`⚠️ User ${entry.username} already won game ${game.id}, skipping duplicate award`);
          continue; // Skip this winner entirely
        }
        
        // Check if user already won a tournament today
        const eligibilityCheck = await checkWinEligibility(db, entry.oderId, 'battle_royale');
        if (!eligibilityCheck.eligible) {
          isEligible = false;
          console.log(`🚫 User ${entry.username} already won a tournament today - will show score card only, no prize`);
        }
      }

      const winner = {
        oderId: entry.oderId,
        username: entry.username,
        position,
        score: entry.score,
        prizeAmount: isEligible ? winnerPrize : 0, // Only eligible winners get prize
        prizePercent,
        eligible: isEligible, // Flag to show score card vs winner card
        wonAt: new Date(),
      };

      winners.push(winner);

      // Only award prizes and update stats if eligible
      if (!isEligible) {
        console.log(`⏭️ Skipping prize award for ineligible winner: ${entry.username}`);
        continue; // Skip to next winner
      }

      // Update user's balance and win stats (only for eligible winners)
      try {
        console.log(`🏆 Attempting to update user: ${entry.oderId} (${entry.username})`);
        
        const currentBalance = userDoc.exists() ? (userDoc.data().balance || 0) : 0;
        const currentWins = userDoc.exists() ? (userDoc.data().totalWins || 0) : 0;
        const currentEarnings = userDoc.exists() ? (userDoc.data().totalEarnings || 0) : 0;
        
        console.log(`🏆 Current user stats: balance=${currentBalance}, wins=${currentWins}, earnings=${currentEarnings}`);
        console.log(`🏆 Awarding: prize=${winnerPrize}, newBalance=${currentBalance + winnerPrize}, newWins=${currentWins + 1}`);
        
        // Get today's date string for daily win tracking
        const today = getTodayString();
        
        const winData = {
          lastTournamentWin: {
            gameId: game.id,
            gameName: game.name,
            position,
            prizeAmount: winnerPrize,
            score: entry.score,
            wonAt: new Date(),
            sponsorLogo: game.sponsorLogo || null,
            sponsorName: game.sponsorName || null,
            city: game.city || null,
          },
          // Set date field for eligibility checks
          lastBattleRoyaleWinDate: today,
          // Flag to show winner card on next app open
          pendingWinnerCard: {
            gameId: game.id,
            gameName: game.name,
            position,
            prizeAmount: winnerPrize,
            score: entry.score,
            gameType: 'virtual',
            wonMoney: winnerPrize > 0,
            city: game.city || null,
            sponsorLogo: game.sponsorLogo || null,
            sponsorName: game.sponsorName || null,
            createdAt: new Date(),
          },
          updatedAt: serverTimestamp(),
        };

        if (userDoc.exists()) {
          // User exists - update with increment
          console.log(`🏆 Updating existing user ${entry.username} with increment`);
          const updateData = {
            ...winData,
            balance: increment(winnerPrize),
            totalWins: increment(1),
            totalEarnings: increment(winnerPrize),
          };
          console.log(`🏆 Update data:`, JSON.stringify(updateData, null, 2));
          await updateDoc(userRef, updateData);
          console.log(`✅ UpdateDoc completed for ${entry.username}`);
        } else {
          // User doesn't exist - create with initial values
          console.log(`🏆 Creating new user document for ${entry.username}`);
          const newUserData = {
            ...winData,
            balance: winnerPrize,
            totalWins: 1,
            totalEarnings: winnerPrize,
            createdAt: serverTimestamp(),
          };
          console.log(`🏆 New user data:`, JSON.stringify(newUserData, null, 2));
          await setDoc(userRef, newUserData);
          console.log(`✅ SetDoc completed for ${entry.username}`);
        }

        // Verify the update worked
        const verifyDoc = await getDoc(userRef);
        const verifyData = verifyDoc.data();
        console.log(`✅ Verified user stats after update: balance=${verifyData?.balance}, wins=${verifyData?.totalWins}, earnings=${verifyData?.totalEarnings}`);
        console.log(`✅ Winner #${position}: ${entry.username} - $${winnerPrize} - Balance updated!`);

        // Send push notification if function provided (only for eligible winners)
        if (sendNotification && entry.oderId && winnerPrize > 0 && isEligible) {
          try {
            // Re-fetch user doc to get push token
            const updatedUserDoc = await getDoc(userRef);
            const userData = updatedUserDoc.data();
            if (userData?.pushToken) {
              await sendNotification({
                to: userData.pushToken,
                title: '🎉 You Won!',
                body: `Congratulations! You finished #${position} in "${game.name}" and won $${winnerPrize}!`,
                data: {
                  type: 'tournament_win',
                  gameId: game.id,
                  position,
                  prizeAmount: winnerPrize,
                },
              });
              console.log(`📱 Notification sent to ${entry.username}`);
            }
          } catch (notifError) {
            console.error(`❌ Error sending notification to ${entry.username}:`, notifError);
          }
        } else if (!isEligible) {
          console.log(`🚫 Skipping notification for ineligible winner: ${entry.username}`);
        }
      } catch (userError) {
        console.error(`❌ Error updating winner ${entry.oderId}:`, userError);
        console.error('Error details:', userError.message, userError.code);
      }
    }

    console.log(`🏆 Tournament complete! ${winners.length} winners awarded.`);
    return winners;
  } catch (error) {
    console.error('❌ Error processing tournament winners:', error);
    console.error('Error details:', error.message, error.code);
    return [];
  }
};
