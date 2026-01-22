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
      if (userData.lastBattleRoyaleWinDate === today) {
        return {
          eligible: false,
          reason: 'user_won_battle_royale_today',
          deviceId,
          message: "🏆 You've already won a Battle Royale today! Play for fun, but prizes go to other players.",
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
export const processBattleRoyaleWinners = async (db, game, sendNotification = null) => {
  try {
    if (!game || !game.leaderboard || game.leaderboard.length === 0) {
      console.log('No leaderboard entries to process');
      return [];
    }

    const prizeAmount = Number(game.prizeAmount) || 0;
    const prizeDistribution = game.virtualGame?.prizeDistribution || { 1: 100, 2: 60, 3: 30 };
    const winnerSlots = Number(game.winnerSlots) || 3;

    // Sort leaderboard by score
    const sortedLeaderboard = [...game.leaderboard].sort((a, b) => {
      if (game.virtualGame?.type === 'tap_count') {
        return a.score - b.score; // Lower is better
      }
      return b.score - a.score; // Higher is better
    });

    const winners = [];
    const claimDeadline = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
    let positionAwarded = 0;
    let leaderboardIndex = 0;

    // Process winners - skip ineligible players and find next eligible
    while (positionAwarded < winnerSlots && leaderboardIndex < sortedLeaderboard.length) {
      const entry = sortedLeaderboard[leaderboardIndex];
      leaderboardIndex++;

      // Check if this player is eligible to win a battle royale today
      const eligibility = await checkWinEligibility(db, entry.oderId, 'battle_royale');
      
      if (!eligibility.eligible) {
        console.log(`⏭️ Skipping ${entry.username} - ${eligibility.reason}: ${eligibility.message}`);
        continue; // Skip to next player
      }

      positionAwarded++;
      const position = positionAwarded;
      const prizePercent = prizeDistribution[position] || 0;
      const winnerPrize = Math.round(prizeAmount * prizePercent / 100);

      const winner = {
        oderId: entry.oderId,
        username: entry.username,
        position,
        score: entry.score,
        prizeAmount: winnerPrize,
        prizePercent,
        claimDeadline,
        claimed: false,
        notifiedAt: new Date(),
        leaderboardPosition: leaderboardIndex, // Original position on leaderboard
      };

      winners.push(winner);

      // Update user's balance and record daily win
      try {
        const userRef = doc(db, 'users', entry.oderId);
        await updateDoc(userRef, {
          balance: increment(winnerPrize),
          lastBattleRoyaleWin: {
            gameId: game.id,
            gameName: game.name,
            position,
            prizeAmount: winnerPrize,
            claimDeadline,
            claimed: false,
            sponsorLogo: game.sponsorLogo || null,
            sponsorName: game.sponsorName || null,
            city: game.city || null,
          },
          // Flag to show winner card on next app open
          pendingWinnerCard: {
            gameId: game.id,
            gameName: game.name,
            position,
            prizeAmount: winnerPrize,
            gameType: 'virtual',
            wonMoney: true,
            city: game.city || null,
            sponsorLogo: game.sponsorLogo || null,
            sponsorName: game.sponsorName || null,
            createdAt: new Date(),
          },
          updatedAt: serverTimestamp(),
        });

        // Record daily win to prevent multiple battle royale wins today
        await recordDailyWin(db, entry.oderId, game.id, game.name, winnerPrize, 'battle_royale');

        console.log(`✅ Winner #${position}: ${entry.username} - $${winnerPrize}`);

        // Send push notification if function provided
        if (sendNotification && entry.oderId) {
          try {
            // Get user's push token
            const userDoc = await getDoc(userRef);
            const userData = userDoc.data();
            if (userData?.pushToken) {
              await sendNotification({
                to: userData.pushToken,
                title: '🎉 You Won!',
                body: `Congratulations! You finished #${position} in "${game.name}" and won $${winnerPrize}! Open the app to claim your prize.`,
                data: {
                  type: 'battle_royale_win',
                  gameId: game.id,
                  position,
                  prizeAmount: winnerPrize,
                },
              });
              console.log(`📱 Notification sent to ${entry.username}`);
            }
          } catch (notifError) {
            console.error(`Error sending notification to ${entry.username}:`, notifError);
          }
        }
      } catch (userError) {
        console.error(`Error updating winner ${entry.oderId}:`, userError);
      }
    }

    if (winners.length < winnerSlots) {
      console.log(`⚠️ Only ${winners.length} eligible winners found out of ${winnerSlots} slots`);
    }

    return winners;
  } catch (error) {
    console.error('Error processing battle royale winners:', error);
    return [];
  }
};
