import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Conditionally import WebView for native - with error handling for Expo Go
let WebView = null;
let webViewAvailable = false;

if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
    webViewAvailable = true;
  } catch (e) {
    console.log('⚠️ react-native-webview not available (Expo Go). Mini-games will use fallback.');
    webViewAvailable = false;
  }
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// EMBEDDED MINI-GAME HTML TEMPLATES
// These are the default games that don't require external URLs
// ============================================================================

const TAP_COUNT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Tap Challenge</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; overflow: hidden; touch-action: manipulation; }
    .container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; width: 100%; max-width: 400px; }
    .title { font-size: 24px; font-weight: 800; margin-bottom: 8px; text-align: center; }
    .subtitle { font-size: 16px; color: rgba(255, 255, 255, 0.7); margin-bottom: 24px; text-align: center; }
    .stats-row { display: flex; justify-content: space-between; width: 100%; margin-bottom: 24px; gap: 16px; }
    .stat-box { flex: 1; background: rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 16px; text-align: center; }
    .stat-label { font-size: 12px; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .stat-value { font-size: 32px; font-weight: 800; }
    .stat-value.taps { color: #10B981; }
    .stat-value.timer { color: #F59E0B; }
    .progress-container { width: 100%; height: 12px; background: rgba(255, 255, 255, 0.1); border-radius: 6px; overflow: hidden; margin-bottom: 32px; }
    .progress-bar { height: 100%; background: linear-gradient(90deg, #10B981, #059669); border-radius: 6px; transition: width 0.1s ease-out; width: 0%; }
    .tap-button { width: 200px; height: 200px; border-radius: 50%; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 48px; color: white; box-shadow: 0 10px 40px rgba(16, 185, 129, 0.4); transition: transform 0.1s ease, box-shadow 0.1s ease; position: relative; overflow: hidden; }
    .tap-button:active { transform: scale(0.95); box-shadow: 0 5px 20px rgba(16, 185, 129, 0.3); }
    .tap-button.disabled { background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%); box-shadow: 0 10px 40px rgba(107, 114, 128, 0.3); pointer-events: none; }
    .tap-ripple { position: absolute; width: 100%; height: 100%; background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%); transform: scale(0); animation: ripple 0.4s ease-out; }
    @keyframes ripple { to { transform: scale(2); opacity: 0; } }
    .result-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
    .result-overlay.show { opacity: 1; pointer-events: auto; }
    .result-icon { font-size: 80px; margin-bottom: 24px; }
    .result-title { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
    .result-subtitle { font-size: 18px; color: rgba(255, 255, 255, 0.7); }
    .result-overlay.success .result-title { color: #10B981; }
    .result-overlay.failure .result-title { color: #EF4444; }
    .countdown-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .countdown-number { font-size: 120px; font-weight: 800; color: #10B981; animation: countdownPulse 1s ease-in-out; }
    @keyframes countdownPulse { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <div class="countdown-overlay" id="countdownOverlay"><div class="countdown-number" id="countdownNumber">3</div></div>
  <div class="container" id="gameContainer">
    <h1 class="title">Tap Challenge!</h1>
    <p class="subtitle">Tap <span id="targetDisplay">100</span> times to win!</p>
    <div class="stats-row">
      <div class="stat-box"><div class="stat-label">Taps</div><div class="stat-value taps" id="tapCount">0</div></div>
      <div class="stat-box"><div class="stat-label">Time</div><div class="stat-value timer" id="timer">30</div></div>
    </div>
    <div class="progress-container"><div class="progress-bar" id="progressBar"></div></div>
    <button class="tap-button" id="tapButton">👆</button>
  </div>
  <div class="result-overlay" id="resultOverlay">
    <div class="result-icon" id="resultIcon">🎉</div>
    <div class="result-title" id="resultTitle">You Won!</div>
    <div class="result-subtitle" id="resultSubtitle">Great job!</div>
  </div>
  <script>
    const urlParams = new URLSearchParams(window.location.search);
    const targetTaps = parseInt(urlParams.get('targetTaps')) || 100;
    const timeLimit = parseInt(urlParams.get('timeLimit')) || 30;
    let taps = 0, timeRemaining = timeLimit, gameStarted = false, gameEnded = false, timerInterval = null, startTime = null;
    const tapButton = document.getElementById('tapButton'), tapCountEl = document.getElementById('tapCount'), timerEl = document.getElementById('timer'), progressBar = document.getElementById('progressBar'), targetDisplay = document.getElementById('targetDisplay'), resultOverlay = document.getElementById('resultOverlay'), resultIcon = document.getElementById('resultIcon'), resultTitle = document.getElementById('resultTitle'), resultSubtitle = document.getElementById('resultSubtitle'), countdownOverlay = document.getElementById('countdownOverlay'), countdownNumber = document.getElementById('countdownNumber');
    targetDisplay.textContent = targetTaps; timerEl.textContent = timeLimit;
    function startCountdown() { let count = 3; countdownNumber.textContent = count; const countdownInterval = setInterval(() => { count--; if (count > 0) { countdownNumber.textContent = count; countdownNumber.style.animation = 'none'; countdownNumber.offsetHeight; countdownNumber.style.animation = 'countdownPulse 1s ease-in-out'; } else if (count === 0) { countdownNumber.textContent = 'GO!'; countdownNumber.style.color = '#10B981'; } else { clearInterval(countdownInterval); countdownOverlay.classList.add('hidden'); startGame(); } }, 1000); }
    function startGame() { gameStarted = true; startTime = Date.now(); timerInterval = setInterval(() => { timeRemaining--; timerEl.textContent = timeRemaining; if (timeRemaining <= 5) timerEl.style.color = '#EF4444'; if (timeRemaining <= 0) endGame(false); }, 1000); }
    function handleTap(e) { e.preventDefault(); if (!gameStarted || gameEnded) return; taps++; tapCountEl.textContent = taps; const progress = Math.min((taps / targetTaps) * 100, 100); progressBar.style.width = progress + '%'; const ripple = document.createElement('div'); ripple.className = 'tap-ripple'; tapButton.appendChild(ripple); setTimeout(() => ripple.remove(), 400); if (navigator.vibrate) navigator.vibrate(10); if (taps >= targetTaps) endGame(true); }
    function endGame(success) { if (gameEnded) return; gameEnded = true; clearInterval(timerInterval); tapButton.classList.add('disabled'); const endTime = Date.now(), totalTimeMs = endTime - startTime; if (success) { resultOverlay.classList.add('success'); resultIcon.textContent = '🎉'; resultTitle.textContent = 'You Won!'; resultSubtitle.textContent = taps + ' taps in ' + (totalTimeMs / 1000).toFixed(1) + 's'; } else { resultOverlay.classList.add('failure'); resultIcon.textContent = '⏰'; resultTitle.textContent = "Time's Up!"; resultSubtitle.textContent = 'You got ' + taps + ' of ' + targetTaps + ' taps'; } resultOverlay.classList.add('show'); const result = { type: 'complete', success: success, data: { taps: taps, targetTaps: targetTaps, timeMs: totalTimeMs, timeLimit: timeLimit } }; if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(result)); window.parent.postMessage(result, '*'); }
    tapButton.addEventListener('touchstart', handleTap, { passive: false }); tapButton.addEventListener('mousedown', handleTap);
    document.addEventListener('touchend', (e) => { e.preventDefault(); }, { passive: false });
    startCountdown();
  </script>
</body>
</html>`;

const HOLD_DURATION_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Hold Challenge</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; overflow: hidden; touch-action: manipulation; }
    .container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; width: 100%; max-width: 400px; }
    .title { font-size: 24px; font-weight: 800; margin-bottom: 8px; text-align: center; }
    .subtitle { font-size: 16px; color: rgba(255, 255, 255, 0.7); margin-bottom: 32px; text-align: center; }
    .hold-container { position: relative; width: 220px; height: 220px; margin-bottom: 32px; }
    .progress-ring { position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
    .progress-ring-bg { fill: none; stroke: rgba(255, 255, 255, 0.1); stroke-width: 12; }
    .progress-ring-fill { fill: none; stroke: url(#gradient); stroke-width: 12; stroke-linecap: round; stroke-dasharray: 628; stroke-dashoffset: 628; transition: stroke-dashoffset 0.1s linear; }
    .hold-button { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 160px; height: 160px; border-radius: 50%; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 40px; color: white; box-shadow: 0 10px 40px rgba(139, 92, 246, 0.4); transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .hold-button:active, .hold-button.holding { transform: translate(-50%, -50%) scale(0.95); box-shadow: 0 5px 20px rgba(139, 92, 246, 0.3); background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%); }
    .hold-button.disabled { background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%); box-shadow: 0 10px 40px rgba(107, 114, 128, 0.3); pointer-events: none; }
    .hold-button .icon { font-size: 48px; margin-bottom: 4px; }
    .hold-button .label { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .timer-display { font-size: 48px; font-weight: 800; color: #8B5CF6; margin-bottom: 8px; }
    .timer-label { font-size: 14px; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; letter-spacing: 1px; }
    .instruction { font-size: 18px; color: rgba(255, 255, 255, 0.8); text-align: center; margin-top: 24px; min-height: 24px; }
    .instruction.warning { color: #F59E0B; }
    .result-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
    .result-overlay.show { opacity: 1; pointer-events: auto; }
    .result-icon { font-size: 80px; margin-bottom: 24px; }
    .result-title { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
    .result-subtitle { font-size: 18px; color: rgba(255, 255, 255, 0.7); }
    .result-overlay.success .result-title { color: #10B981; }
    .result-overlay.failure .result-title { color: #EF4444; }
    .countdown-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .countdown-number { font-size: 120px; font-weight: 800; color: #8B5CF6; animation: countdownPulse 1s ease-in-out; }
    @keyframes countdownPulse { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
    .hidden { display: none !important; }
    @keyframes pulse { 0%, 100% { transform: translate(-50%, -50%) scale(0.95); } 50% { transform: translate(-50%, -50%) scale(0.92); } }
    .hold-button.holding { animation: pulse 0.5s ease-in-out infinite; }
  </style>
</head>
<body>
  <div class="countdown-overlay" id="countdownOverlay"><div class="countdown-number" id="countdownNumber">3</div></div>
  <div class="container" id="gameContainer">
    <h1 class="title">Hold Challenge!</h1>
    <p class="subtitle">Hold the button for <span id="targetDisplay">5</span> seconds</p>
    <div class="hold-container">
      <svg class="progress-ring" viewBox="0 0 220 220">
        <defs><linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#10B981" /><stop offset="100%" style="stop-color:#059669" /></linearGradient></defs>
        <circle class="progress-ring-bg" cx="110" cy="110" r="100" />
        <circle class="progress-ring-fill" id="progressRing" cx="110" cy="110" r="100" />
      </svg>
      <button class="hold-button" id="holdButton"><span class="icon">👇</span><span class="label">Hold</span></button>
    </div>
    <div class="timer-display" id="timerDisplay">0.0s</div>
    <div class="timer-label">Time Held</div>
    <div class="instruction" id="instruction">Press and hold the button!</div>
  </div>
  <div class="result-overlay" id="resultOverlay">
    <div class="result-icon" id="resultIcon">🎉</div>
    <div class="result-title" id="resultTitle">You Won!</div>
    <div class="result-subtitle" id="resultSubtitle">Great job!</div>
  </div>
  <script>
    const urlParams = new URLSearchParams(window.location.search);
    const holdDuration = parseInt(urlParams.get('holdDuration')) || 5000;
    const holdDurationSeconds = holdDuration / 1000;
    let isHolding = false, holdStartTime = null, currentHoldTime = 0, animationFrame = null, gameStarted = false, gameEnded = false;
    const holdButton = document.getElementById('holdButton'), timerDisplay = document.getElementById('timerDisplay'), progressRing = document.getElementById('progressRing'), targetDisplay = document.getElementById('targetDisplay'), instruction = document.getElementById('instruction'), resultOverlay = document.getElementById('resultOverlay'), resultIcon = document.getElementById('resultIcon'), resultTitle = document.getElementById('resultTitle'), resultSubtitle = document.getElementById('resultSubtitle'), countdownOverlay = document.getElementById('countdownOverlay'), countdownNumber = document.getElementById('countdownNumber');
    const CIRCUMFERENCE = 2 * Math.PI * 100;
    targetDisplay.textContent = holdDurationSeconds;
    function startCountdown() { let count = 3; countdownNumber.textContent = count; const countdownInterval = setInterval(() => { count--; if (count > 0) { countdownNumber.textContent = count; countdownNumber.style.animation = 'none'; countdownNumber.offsetHeight; countdownNumber.style.animation = 'countdownPulse 1s ease-in-out'; } else if (count === 0) { countdownNumber.textContent = 'GO!'; countdownNumber.style.color = '#8B5CF6'; } else { clearInterval(countdownInterval); countdownOverlay.classList.add('hidden'); gameStarted = true; } }, 1000); }
    function updateProgress(progress) { const offset = CIRCUMFERENCE - (progress * CIRCUMFERENCE); progressRing.style.strokeDashoffset = offset; }
    function updateHoldTime() { if (!isHolding || gameEnded) return; currentHoldTime = Date.now() - holdStartTime; const seconds = currentHoldTime / 1000; const progress = Math.min(currentHoldTime / holdDuration, 1); timerDisplay.textContent = seconds.toFixed(1) + 's'; updateProgress(progress); if (progress >= 0.8) { instruction.textContent = 'Almost there! Keep holding!'; instruction.classList.add('warning'); } else if (progress >= 0.5) { instruction.textContent = 'Halfway there!'; instruction.classList.remove('warning'); } if (currentHoldTime >= holdDuration) { endGame(true); return; } animationFrame = requestAnimationFrame(updateHoldTime); }
    function startHold(e) { e.preventDefault(); if (!gameStarted || gameEnded || isHolding) return; isHolding = true; holdStartTime = Date.now(); holdButton.classList.add('holding'); instruction.textContent = 'Keep holding...'; instruction.classList.remove('warning'); if (navigator.vibrate) navigator.vibrate(20); updateHoldTime(); }
    function stopHold(e) { e.preventDefault(); if (!isHolding || gameEnded) return; isHolding = false; holdButton.classList.remove('holding'); cancelAnimationFrame(animationFrame); if (currentHoldTime < holdDuration) { currentHoldTime = 0; timerDisplay.textContent = '0.0s'; updateProgress(0); instruction.textContent = 'Released too early! Try again!'; instruction.classList.add('warning'); if (navigator.vibrate) navigator.vibrate([50, 50, 50]); } }
    function endGame(success) { if (gameEnded) return; gameEnded = true; isHolding = false; holdButton.classList.remove('holding'); holdButton.classList.add('disabled'); cancelAnimationFrame(animationFrame); if (success) { resultOverlay.classList.add('success'); resultIcon.textContent = '🎉'; resultTitle.textContent = 'You Won!'; resultSubtitle.textContent = 'Held for ' + (currentHoldTime / 1000).toFixed(1) + ' seconds!'; if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]); } else { resultOverlay.classList.add('failure'); resultIcon.textContent = '😔'; resultTitle.textContent = 'Failed!'; resultSubtitle.textContent = 'You released too early'; } resultOverlay.classList.add('show'); const result = { type: 'complete', success: success, data: { holdTimeMs: currentHoldTime, targetHoldMs: holdDuration } }; if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(result)); window.parent.postMessage(result, '*'); }
    holdButton.addEventListener('touchstart', startHold, { passive: false }); holdButton.addEventListener('mousedown', startHold); holdButton.addEventListener('touchend', stopHold, { passive: false }); holdButton.addEventListener('touchcancel', stopHold, { passive: false }); holdButton.addEventListener('mouseup', stopHold); holdButton.addEventListener('mouseleave', stopHold);
    holdButton.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('touchend', (e) => { e.preventDefault(); }, { passive: false });
    startCountdown();
  </script>
</body>
</html>`;

const RHYTHM_TAP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Rhythm Challenge</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; overflow: hidden; touch-action: manipulation; }
    .container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; width: 100%; max-width: 400px; }
    .title { font-size: 24px; font-weight: 800; margin-bottom: 8px; text-align: center; }
    .subtitle { font-size: 16px; color: rgba(255, 255, 255, 0.7); margin-bottom: 24px; text-align: center; }
    .stats-row { display: flex; justify-content: space-between; width: 100%; margin-bottom: 24px; gap: 12px; }
    .stat-box { flex: 1; background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 12px 8px; text-align: center; }
    .stat-label { font-size: 10px; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .stat-value { font-size: 24px; font-weight: 800; }
    .stat-value.score { color: #10B981; }
    .stat-value.combo { color: #F59E0B; }
    .stat-value.beats { color: #8B5CF6; }
    .beat-indicator-container { width: 100%; height: 80px; position: relative; margin-bottom: 24px; overflow: hidden; }
    .beat-track { position: absolute; top: 50%; left: 0; right: 0; height: 4px; background: rgba(255, 255, 255, 0.1); transform: translateY(-50%); }
    .hit-zone { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; border: 3px solid rgba(255, 255, 255, 0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .hit-zone-inner { width: 40px; height: 40px; border-radius: 50%; background: rgba(255, 255, 255, 0.1); }
    .beat-dot { position: absolute; top: 50%; width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%); transform: translateY(-50%); box-shadow: 0 0 20px rgba(236, 72, 153, 0.5); transition: left 0.05s linear; }
    .feedback { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: 18px; font-weight: 800; opacity: 0; pointer-events: none; }
    .feedback.perfect { color: #10B981; animation: feedbackPop 0.5s ease-out forwards; }
    .feedback.good { color: #F59E0B; animation: feedbackPop 0.5s ease-out forwards; }
    .feedback.miss { color: #EF4444; animation: feedbackPop 0.5s ease-out forwards; }
    @keyframes feedbackPop { 0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); } 50% { transform: translate(-50%, -50%) scale(1.2); } 100% { opacity: 0; transform: translate(-50%, -80%) scale(1); } }
    .tap-button { width: 180px; height: 180px; border-radius: 50%; background: linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%); border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 48px; color: white; box-shadow: 0 10px 40px rgba(236, 72, 153, 0.4); transition: transform 0.1s ease, box-shadow 0.1s ease; margin-bottom: 24px; }
    .tap-button:active { transform: scale(0.95); box-shadow: 0 5px 20px rgba(236, 72, 153, 0.3); }
    .tap-button.disabled { background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%); box-shadow: 0 10px 40px rgba(107, 114, 128, 0.3); pointer-events: none; }
    .tap-button .icon { font-size: 56px; transition: transform 0.1s ease; }
    .tap-button:active .icon { transform: scale(0.9); }
    .pulse-ring { position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 3px solid rgba(236, 72, 153, 0.5); animation: pulseRing 0.5s ease-out forwards; pointer-events: none; }
    @keyframes pulseRing { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
    .bpm-display { font-size: 14px; color: rgba(255, 255, 255, 0.5); }
    .result-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
    .result-overlay.show { opacity: 1; pointer-events: auto; }
    .result-icon { font-size: 80px; margin-bottom: 24px; }
    .result-title { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
    .result-subtitle { font-size: 18px; color: rgba(255, 255, 255, 0.7); margin-bottom: 8px; }
    .result-stats { font-size: 14px; color: rgba(255, 255, 255, 0.5); }
    .result-overlay.success .result-title { color: #10B981; }
    .result-overlay.failure .result-title { color: #EF4444; }
    .countdown-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .countdown-number { font-size: 120px; font-weight: 800; color: #EC4899; animation: countdownPulse 1s ease-in-out; }
    @keyframes countdownPulse { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
    .hidden { display: none !important; }
    .tap-button-container { position: relative; width: 180px; height: 180px; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="countdown-overlay" id="countdownOverlay"><div class="countdown-number" id="countdownNumber">3</div></div>
  <div class="container" id="gameContainer">
    <h1 class="title">Rhythm Challenge!</h1>
    <p class="subtitle">Tap on the beat to win!</p>
    <div class="stats-row">
      <div class="stat-box"><div class="stat-label">Score</div><div class="stat-value score" id="scoreDisplay">0</div></div>
      <div class="stat-box"><div class="stat-label">Combo</div><div class="stat-value combo" id="comboDisplay">0</div></div>
      <div class="stat-box"><div class="stat-label">Beats</div><div class="stat-value beats" id="beatsDisplay">0/10</div></div>
    </div>
    <div class="beat-indicator-container" id="beatContainer">
      <div class="beat-track"></div>
      <div class="hit-zone"><div class="hit-zone-inner"></div></div>
    </div>
    <div class="tap-button-container">
      <button class="tap-button" id="tapButton"><span class="icon">🎵</span></button>
    </div>
    <div class="bpm-display" id="bpmDisplay">120 BPM</div>
  </div>
  <div class="result-overlay" id="resultOverlay">
    <div class="result-icon" id="resultIcon">🎉</div>
    <div class="result-title" id="resultTitle">You Won!</div>
    <div class="result-subtitle" id="resultSubtitle">Great rhythm!</div>
    <div class="result-stats" id="resultStats"></div>
  </div>
  <script>
    const urlParams = new URLSearchParams(window.location.search);
    const bpm = parseInt(urlParams.get('bpm')) || 120;
    const requiredBeats = parseInt(urlParams.get('requiredBeats')) || 10;
    const toleranceMs = parseInt(urlParams.get('toleranceMs')) || 150;
    const requiredScore = parseInt(urlParams.get('requiredScore')) || 70;
    const beatInterval = 60000 / bpm;
    let gameStarted = false, gameEnded = false, score = 0, combo = 0, maxCombo = 0, beatsHit = 0, totalBeats = 0, perfectHits = 0, goodHits = 0, misses = 0, beatTimer = null, nextBeatTime = 0, beats = [];
    const tapButton = document.getElementById('tapButton'), scoreDisplay = document.getElementById('scoreDisplay'), comboDisplay = document.getElementById('comboDisplay'), beatsDisplay = document.getElementById('beatsDisplay'), beatContainer = document.getElementById('beatContainer'), bpmDisplay = document.getElementById('bpmDisplay'), resultOverlay = document.getElementById('resultOverlay'), resultIcon = document.getElementById('resultIcon'), resultTitle = document.getElementById('resultTitle'), resultSubtitle = document.getElementById('resultSubtitle'), resultStats = document.getElementById('resultStats'), countdownOverlay = document.getElementById('countdownOverlay'), countdownNumber = document.getElementById('countdownNumber');
    bpmDisplay.textContent = bpm + ' BPM'; beatsDisplay.textContent = '0/' + requiredBeats;
    function createBeatDot() { const dot = document.createElement('div'); dot.className = 'beat-dot'; dot.style.left = '100%'; beatContainer.appendChild(dot); const beatTime = Date.now() + (beatInterval * 2); beats.push({ element: dot, targetTime: beatTime, hit: false }); let startTime = Date.now(); const duration = beatInterval * 2; function animateDot() { if (gameEnded) { dot.remove(); return; } const elapsed = Date.now() - startTime; const progress = elapsed / duration; const leftPos = 100 - (progress * 100); if (leftPos < -20) { const beatIndex = beats.findIndex(b => b.element === dot); if (beatIndex !== -1 && !beats[beatIndex].hit) { handleMiss(); beats.splice(beatIndex, 1); } dot.remove(); return; } dot.style.left = leftPos + '%'; requestAnimationFrame(animateDot); } requestAnimationFrame(animateDot); }
    function showFeedback(type) { const feedback = document.createElement('div'); feedback.className = 'feedback ' + type; feedback.textContent = type === 'perfect' ? 'PERFECT!' : type === 'good' ? 'GOOD!' : 'MISS!'; beatContainer.appendChild(feedback); setTimeout(() => feedback.remove(), 500); }
    function showPulseRing() { const ring = document.createElement('div'); ring.className = 'pulse-ring'; tapButton.parentElement.appendChild(ring); setTimeout(() => ring.remove(), 500); }
    function handleTap(e) { e.preventDefault(); if (!gameStarted || gameEnded) return; const now = Date.now(); showPulseRing(); let closestBeat = null, closestDiff = Infinity; for (const beat of beats) { if (beat.hit) continue; const diff = Math.abs(now - beat.targetTime); if (diff < closestDiff) { closestDiff = diff; closestBeat = beat; } } if (closestBeat && closestDiff <= toleranceMs * 2) { closestBeat.hit = true; beatsHit++; if (closestDiff <= toleranceMs / 2) { perfectHits++; score += 100 * (1 + combo * 0.1); combo++; showFeedback('perfect'); } else if (closestDiff <= toleranceMs) { goodHits++; score += 50 * (1 + combo * 0.1); combo++; showFeedback('good'); } else { goodHits++; score += 25; combo = 0; showFeedback('good'); } maxCombo = Math.max(maxCombo, combo); if (navigator.vibrate) navigator.vibrate(10); } else { handleMiss(); } updateDisplay(); }
    function handleMiss() { misses++; combo = 0; showFeedback('miss'); if (navigator.vibrate) navigator.vibrate([30, 30, 30]); updateDisplay(); }
    function updateDisplay() { scoreDisplay.textContent = Math.round(score); comboDisplay.textContent = combo; beatsDisplay.textContent = beatsHit + '/' + requiredBeats; }
    function startBeats() { totalBeats = 0; function generateBeat() { if (gameEnded) return; totalBeats++; createBeatDot(); if (totalBeats >= requiredBeats) { setTimeout(() => { endGame(); }, beatInterval * 2.5); return; } beatTimer = setTimeout(generateBeat, beatInterval); } setTimeout(generateBeat, beatInterval); }
    function startCountdown() { let count = 3; countdownNumber.textContent = count; const countdownInterval = setInterval(() => { count--; if (count > 0) { countdownNumber.textContent = count; countdownNumber.style.animation = 'none'; countdownNumber.offsetHeight; countdownNumber.style.animation = 'countdownPulse 1s ease-in-out'; } else if (count === 0) { countdownNumber.textContent = 'GO!'; countdownNumber.style.color = '#EC4899'; } else { clearInterval(countdownInterval); countdownOverlay.classList.add('hidden'); gameStarted = true; startBeats(); } }, 1000); }
    function endGame() { if (gameEnded) return; gameEnded = true; clearTimeout(beatTimer); tapButton.classList.add('disabled'); const maxPossibleScore = requiredBeats * 100 * 1.5; const scorePercent = Math.round((score / maxPossibleScore) * 100); const hitPercent = Math.round((beatsHit / requiredBeats) * 100); const success = hitPercent >= requiredScore; if (success) { resultOverlay.classList.add('success'); resultIcon.textContent = '🎉'; resultTitle.textContent = 'You Won!'; resultSubtitle.textContent = hitPercent + '% accuracy!'; } else { resultOverlay.classList.add('failure'); resultIcon.textContent = '🎵'; resultTitle.textContent = 'Not Quite!'; resultSubtitle.textContent = hitPercent + '% accuracy (need ' + requiredScore + '%)'; } resultStats.textContent = 'Perfect: ' + perfectHits + ' | Good: ' + goodHits + ' | Miss: ' + misses + ' | Max Combo: ' + maxCombo; resultOverlay.classList.add('show'); const result = { type: 'complete', success: success, data: { score: Math.round(score), beatsHit: beatsHit, totalBeats: requiredBeats, perfectHits: perfectHits, goodHits: goodHits, misses: misses, maxCombo: maxCombo, accuracy: hitPercent } }; if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(result)); window.parent.postMessage(result, '*'); }
    tapButton.addEventListener('touchstart', handleTap, { passive: false }); tapButton.addEventListener('mousedown', handleTap);
    document.addEventListener('touchend', (e) => { e.preventDefault(); }, { passive: false });
    startCountdown();
  </script>
</body>
</html>`;

// ============================================================================
// Get embedded HTML for preset game types
// ============================================================================
const getEmbeddedGameHtml = (gameType, config = {}) => {
  let html = '';
  
  switch (gameType) {
    case 'tap_count':
      html = TAP_COUNT_HTML;
      break;
    case 'hold_duration':
      html = HOLD_DURATION_HTML;
      break;
    case 'rhythm_tap':
      html = RHYTHM_TAP_HTML;
      break;
    default:
      return null;
  }
  
  // Inject config into the HTML by replacing URL params parsing
  // This allows us to pass config without needing URL params
  const configScript = `
    <script>
      // Injected config from app
      window.GAME_CONFIG = ${JSON.stringify(config)};
      // Override URL params with injected config
      const originalURLSearchParams = URLSearchParams;
      window.URLSearchParams = function(search) {
        const params = new originalURLSearchParams(search);
        const originalGet = params.get.bind(params);
        params.get = function(key) {
          if (window.GAME_CONFIG && window.GAME_CONFIG[key] !== undefined) {
            return String(window.GAME_CONFIG[key]);
          }
          return originalGet(key);
        };
        return params;
      };
    </script>
  `;
  
  // Insert config script right after <head>
  html = html.replace('<head>', '<head>' + configScript);
  
  return html;
};

/**
 * MiniGameWebView - Cross-platform component for rendering mini-games
 * 
 * Props:
 * - visible: boolean - Whether the modal is visible
 * - gameUrl: string - URL to custom HTML game (Firebase Storage URL) - optional
 * - gameType: string - Preset game type ('tap_count', 'hold_duration', 'rhythm_tap') - used if no gameUrl
 * - gameConfig: object - Configuration to pass to the game
 * - onComplete: (success: boolean, data: object) => void - Called when game completes
 * - onClose: () => void - Called when user closes the modal
 */
export default function MiniGameWebView({
  visible,
  gameUrl,
  gameType = 'tap_count',
  gameConfig = {},
  onComplete,
  onClose,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const webViewRef = useRef(null);
  const iframeRef = useRef(null);

  // Determine if we're using a custom URL or embedded HTML
  const useCustomUrl = !!gameUrl;
  
  // Get the HTML content (either from URL or embedded)
  const getHtmlSource = () => {
    if (useCustomUrl) {
      // Build URL with config params for custom games
      try {
        const url = new URL(gameUrl);
        Object.entries(gameConfig).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
          }
        });
        return { uri: url.toString() };
      } catch (e) {
        console.error('Invalid game URL:', gameUrl);
        return { uri: gameUrl };
      }
    } else {
      // Use embedded HTML
      const html = getEmbeddedGameHtml(gameType, gameConfig);
      if (!html) {
        console.error('Unknown game type:', gameType);
        return null;
      }
      return { html };
    }
  };

  const htmlSource = getHtmlSource();

  // Handle messages from the game (web)
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;

    const handleMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        if (data?.type === 'complete') {
          console.log('🎮 Mini-game completed (web):', data);
          onComplete?.(data.success, data.data);
        }
      } catch (err) {
        // Ignore non-JSON messages from other sources
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [visible, onComplete]);

  // Handle messages from WebView (native)
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data?.type === 'complete') {
        console.log('🎮 Mini-game completed (native):', data);
        onComplete?.(data.success, data.data);
      }
    } catch (err) {
      console.error('Error parsing WebView message:', err);
    }
  };

  // Get display name for game type
  const getGameDisplayName = () => {
    if (useCustomUrl) return 'Challenge';
    switch (gameType) {
      case 'tap_count':
        return 'Tap Challenge';
      case 'hold_duration':
        return 'Hold Challenge';
      case 'rhythm_tap':
        return 'Rhythm Challenge';
      default:
        return 'Challenge';
    }
  };

  // Reset state when visibility changes
  useEffect(() => {
    if (visible) {
      setLoading(true);
      setError(null);
    }
  }, [visible]);

  if (!visible) return null;

  // Check if WebView is available (native only)
  if (Platform.OS !== 'web' && !webViewAvailable) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
          <View style={styles.nativeHeader}>
            <Text style={styles.headerTitle}>{getGameDisplayName()}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="construct" size={64} color="#F59E0B" />
            <Text style={styles.errorText}>Development Build Required</Text>
            <Text style={styles.errorSubtext}>
              Mini-games require a development build.{'\n'}
              Run: npx expo run:ios --device
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={onClose}>
              <Text style={styles.retryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Modal>
    );
  }

  // Web implementation using iframe
  if (Platform.OS === 'web') {
    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{getGameDisplayName()}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.gameContainer}>
              {loading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#10B981" />
                  <Text style={styles.loadingText}>Loading game...</Text>
                </View>
              )}

              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={48} color="#EF4444" />
                  <Text style={styles.errorText}>Failed to load game</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={() => {
                    setError(null);
                    setLoading(true);
                  }}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : useCustomUrl ? (
                <iframe
                  ref={iframeRef}
                  src={htmlSource.uri}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: 16,
                  }}
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setError('Failed to load game');
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <iframe
                  ref={iframeRef}
                  srcDoc={htmlSource.html}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: 16,
                  }}
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setError('Failed to load game');
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                  sandbox="allow-scripts allow-same-origin"
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Native implementation using WebView
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.container}
      >
        <View style={styles.nativeHeader}>
          <Text style={styles.headerTitle}>{getGameDisplayName()}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.webViewContainer}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loadingText}>Loading game...</Text>
            </View>
          )}

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
              <Text style={styles.errorText}>Failed to load game</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => {
                setError(null);
                setLoading(true);
                webViewRef.current?.reload();
              }}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <WebView
              ref={webViewRef}
              source={htmlSource}
              style={styles.webView}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('WebView error:', nativeEvent);
                setLoading(false);
                setError(nativeEvent.description || 'Failed to load game');
              }}
              onMessage={handleWebViewMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={false}
              scalesPageToFit={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              bounces={false}
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              originWhitelist={['*']}
            />
          )}
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    height: '90%',
    maxHeight: 700,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  nativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameContainer: {
    flex: 1,
    position: 'relative',
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#10B981',
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
