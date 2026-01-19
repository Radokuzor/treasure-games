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
 * 
 * @param {Firestore} db - Firestore database instance
 * @param {string} userId - The user's Firebase Auth UID
 * @returns {Promise<{eligible: boolean, reason?: string, deviceId: string, message?: string}>}
 */
export const checkWinEligibility = async (db, userId) => {
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

    // Check if this user already won today
    if (userData.lastWinDate === today) {
      return {
        eligible: false,
        reason: 'user_won_today',
        deviceId,
        message: "🏆 You've already won today! Play for fun, but prizes go to other players.",
      };
    }

    // Check the daily wins collection for this device
    // This catches the case where someone uses the same device with different accounts
    const deviceWinRef = doc(db, 'dailyWins', `${today}_${deviceId}`);
    const deviceWinDoc = await getDoc(deviceWinRef);

    if (deviceWinDoc.exists()) {
      const deviceWinData = deviceWinDoc.data();
      // If a different user won on this device today
      if (deviceWinData.userId !== userId) {
        return {
          eligible: false,
          reason: 'device_won_today',
          deviceId,
          message: "📱 This device already has a winner today. Try again tomorrow!",
        };
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
 * 
 * @param {Firestore} db - Firestore database instance
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} gameId - The game ID they won
 * @param {string} gameName - The game name
 * @param {number} prizeAmount - The prize amount
 */
export const recordDailyWin = async (db, userId, gameId, gameName, prizeAmount) => {
  try {
    const deviceId = await getDeviceId();
    const today = getTodayString();

    // Update user's last win info
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      await updateDoc(userRef, {
        lastWinDate: today,
        lastWinDeviceId: deviceId,
        lastWinGameId: gameId,
        lastWinGameName: gameName,
        lastWinAmount: prizeAmount,
        lastWinAt: serverTimestamp(),
        totalWins: increment(1),
        totalEarnings: increment(prizeAmount),
      });
    } else {
      // Create user doc if it doesn't exist
      await setDoc(userRef, {
        lastWinDate: today,
        lastWinDeviceId: deviceId,
        lastWinGameId: gameId,
        lastWinGameName: gameName,
        lastWinAmount: prizeAmount,
        lastWinAt: serverTimestamp(),
        totalWins: 1,
        totalEarnings: prizeAmount,
        createdAt: serverTimestamp(),
      });
    }

    // Also record in dailyWins collection (for device-level tracking)
    const deviceWinRef = doc(db, 'dailyWins', `${today}_${deviceId}`);
    await setDoc(deviceWinRef, {
      userId,
      deviceId,
      gameId,
      gameName,
      prizeAmount,
      date: today,
      wonAt: serverTimestamp(),
    });

    console.log('✅ Daily win recorded for user:', userId, 'device:', deviceId);
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
 * Awards prizes to top players based on prize distribution
 * 
 * @param {Firestore} db - Firestore database instance
 * @param {Object} game - The game document data
 * @returns {Promise<Array>} Array of winner objects with prize amounts
 */
export const processBattleRoyaleWinners = async (db, game) => {
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

    // Process top N winners
    for (let i = 0; i < Math.min(winnerSlots, sortedLeaderboard.length); i++) {
      const entry = sortedLeaderboard[i];
      const position = i + 1;
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
      };

      winners.push(winner);

      // Update user's balance (they can claim later)
      try {
        const userRef = doc(db, 'users', entry.oderId);
        await updateDoc(userRef, {
          pendingWinnings: increment(winnerPrize),
          lastBattleRoyaleWin: {
            gameId: game.id,
            gameName: game.name,
            position,
            prizeAmount: winnerPrize,
            claimDeadline,
            claimed: false,
          },
          updatedAt: serverTimestamp(),
        });
        console.log(`✅ Winner #${position}: ${entry.username} - $${winnerPrize}`);
      } catch (userError) {
        console.error(`Error updating winner ${entry.oderId}:`, userError);
      }
    }

    return winners;
  } catch (error) {
    console.error('Error processing battle royale winners:', error);
    return [];
  }
};
