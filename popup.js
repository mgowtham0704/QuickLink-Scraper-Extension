document.addEventListener('DOMContentLoaded', () => {
  const extractBtn = document.getElementById('extract-btn');
  const counterDisplay = document.getElementById('counter-display');
  const currentCountSpan = document.getElementById('current-count');
  const statusBadge = document.getElementById('status-badge');
  const resultsCard = document.getElementById('results-card');
  const resultsCount = document.getElementById('results-count');
  const resultsList = document.getElementById('results-list');
  const copyBtn = document.getElementById('copy-btn');

  // Main vs Lock Views
  const mainView = document.getElementById('main-view');
  const lockView = document.getElementById('lock-view');

  // Premium Activation inputs & buttons
  const checkoutBtn = document.getElementById('checkout-btn');
  const activationKeyInput = document.getElementById('activation-key');
  const activateBtn = document.getElementById('activate-btn');
  const errorMessage = document.getElementById('error-message');
  const successMessage = document.getElementById('success-message');

  // Obfuscated premium key verification
  // Original: "PREMIUM_SCRAPER_2026" XOR encoded with key 0x5A
  const OBFUSCATED_KEY = [10, 8, 31, 23, 19, 15, 23, 5, 9, 25, 8, 27, 10, 31, 8, 5, 104, 106, 104, 108];
  const XOR_KEY = 0x5A;
  const FREE_LIMIT = 5;

  // Storage integrity key (for local tamper detection)
  const STORAGE_INTEGRITY_KEY = 'link-scraper-integrity-v1';

  let currentResults = [];
  let isProcessing = false; // Race condition guard

  // ---- Utility Functions ----

  /**
   * Decode the obfuscated premium key at runtime
   */
  function getPremiumKey() {
    return OBFUSCATED_KEY.map(charCode => String.fromCharCode(charCode ^ XOR_KEY)).join('');
  }

  /**
   * Compute a simple integrity hash for storage values
   * Uses Web Crypto API for a non-reversible checksum
   */
  async function computeIntegrityHash(usageCount, isPremium) {
    const data = `${usageCount}:${isPremium}:${STORAGE_INTEGRITY_KEY}`;
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Verify storage hasn't been tampered with
   */
  async function verifyStorageIntegrity(usageCount, isPremium, storedHash) {
    if (!storedHash) return true; // First run, no hash yet
    const computedHash = await computeIntegrityHash(usageCount, isPremium);
    return computedHash === storedHash;
  }

  /**
   * Save usage/premium state with integrity hash
   */
  async function saveStateWithIntegrity(usageCount, isPremium) {
    const hash = await computeIntegrityHash(usageCount, isPremium);
    return new Promise((resolve) => {
      chrome.storage.local.set({
        usageCount,
        premium: isPremium,
        [STORAGE_INTEGRITY_KEY]: hash
      }, resolve);
    });
  }

  /**
   * Safely update UI state - handles both sync and async flows
   */
  function updateUI(count, isPremium) {
    if (isPremium) {
      statusBadge.textContent = 'Premium Version';
      statusBadge.className = 'badge badge-premium';
      counterDisplay.textContent = 'Lifetime Premium License Active 🚀';
      mainView.style.display = 'flex';
      lockView.style.display = 'none';
    } else {
      statusBadge.textContent = 'Free Version';
      statusBadge.className = 'badge badge-free';
      currentCountSpan.textContent = count;

      if (count >= FREE_LIMIT) {
        mainView.style.display = 'none';
        lockView.style.display = 'flex';
      } else {
        mainView.style.display = 'flex';
        lockView.style.display = 'none';
      }
    }
    // Re-enable extract button when UI updates complete
    setExtractButtonState(false);
  }

  /**
   * Manage extract button loading/disabled state
   */
  function setExtractButtonState(loading) {
    isProcessing = loading;
    extractBtn.disabled = loading;
    extractBtn.style.opacity = loading ? '0.6' : '1';
    extractBtn.style.cursor = loading ? 'not-allowed' : 'pointer';

    if (loading) {
      extractBtn.innerHTML = `
        <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
        </svg>
        Extracting...
      `;
    } else {
      extractBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
        Extract Page Links
      `;
    }
  }

  /**
   * Show temporary message on any button
   */
  function showButtonMessage(btn, message, duration = 1500) {
    const originalHTML = btn.innerHTML;
    const wasProcessing = btn === extractBtn && isProcessing;
    btn.innerHTML = message;
    setTimeout(() => {
      if (!wasProcessing || btn === copyBtn) {
        btn.innerHTML = originalHTML;
      }
    }, duration);
  }

  // ---- Initial Load ----

  // Load status from local storage with integrity verification
  chrome.storage.local.get(['usageCount', 'premium', STORAGE_INTEGRITY_KEY], async (data) => {
    // Handle chrome.runtime.lastError
    if (chrome.runtime.lastError) {
      console.error('Storage read error:', chrome.runtime.lastError.message);
      updateUI(0, false);
      return;
    }

    let count = data.usageCount || 0;
    let isPremium = data.premium || false;
    const storedHash = data[STORAGE_INTEGRITY_KEY];

    // Verify storage integrity - if tampered, reset to safe defaults
    const isValid = await verifyStorageIntegrity(count, isPremium, storedHash);
    if (!isValid) {
      console.warn('Storage integrity check failed. Resetting to defaults.');
      count = 0;
      isPremium = false;
      await saveStateWithIntegrity(count, isPremium);
    }

    updateUI(count, isPremium);
  });

  // ---- Extract Links ----

  extractBtn.addEventListener('click', () => {
    if (isProcessing) return;

    chrome.storage.local.get(['usageCount', 'premium', STORAGE_INTEGRITY_KEY], async (data) => {
      if (chrome.runtime.lastError) {
        console.error('Storage read error:', chrome.runtime.lastError.message);
        return;
      }

      let count = data.usageCount || 0;
      let isPremium = data.premium || false;

      // Double-check limit with fresh data
      if (!isPremium && count >= FREE_LIMIT) {
        updateUI(count, isPremium);
        return;
      }

      // Prevent rapid re-clicks
      setExtractButtonState(true);

      try {
        // Query active tab with proper error handling
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tabs || tabs.length === 0) {
          showButtonMessage(extractBtn, 'Cannot access this page', 2000);
          setExtractButtonState(false);
          return;
        }

        const tab = tabs[0];

        // Skip restricted URLs
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
          showButtonMessage(extractBtn, 'Restricted page', 2000);
          setExtractButtonState(false);
          return;
        }

        // Send message to content script to extract links
        const response = await new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id, { action: 'extractLinks' }, (response) => {
            if (chrome.runtime.lastError) {
              resolve({ error: chrome.runtime.lastError.message });
            } else {
              resolve(response);
            }
          });
        });

        if (response.error || !response.links) {
          console.error('Content script error:', response.error);
          showButtonMessage(extractBtn, 'Extraction failed', 2000);
          setExtractButtonState(false);
          return;
        }

        // Successfully completed an extraction! Increment the usage counter if not premium
        if (!isPremium) {
          count += 1;
          await saveStateWithIntegrity(count, isPremium);
          updateUI(count, isPremium);
        }

        currentResults = response.links || [];
        displayResults(currentResults);

      } catch (error) {
        console.error('Extraction error:', error);
        showButtonMessage(extractBtn, 'Error occurred', 2000);
      } finally {
        setExtractButtonState(false);
      }
    });
  });

  function displayResults(links) {
    resultsList.innerHTML = '';
    if (links.length === 0) {
      resultsCount.textContent = 'No links found';
      resultsCard.style.display = 'block';
      return;
    }

    resultsCount.textContent = `${links.length} link${links.length > 1 ? 's' : ''} found`;
    links.forEach(link => {
      const li = document.createElement('li');
      li.textContent = link;
      resultsList.appendChild(li);
    });
    resultsCard.style.display = 'block';
  }

  // ---- Copy All ----

  copyBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (currentResults.length === 0) return;

    const textToCopy = currentResults.join('\n');
    const originalHTML = copyBtn.innerHTML;

    try {
      await navigator.clipboard.writeText(textToCopy);
      copyBtn.innerHTML = 'Copied!';
      copyBtn.style.color = '#34d399';
    } catch (err) {
      console.error('Clipboard write failed:', err);
      copyBtn.innerHTML = 'Failed';
      copyBtn.style.color = '#f87171';
    }

    setTimeout(() => {
      copyBtn.innerHTML = originalHTML;
      copyBtn.style.color = '';
    }, 1500);
  });

  // ---- Premium Activation ----

  activateBtn.addEventListener('click', async () => {
    const inputKey = activationKeyInput.value.trim();
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    if (inputKey === getPremiumKey()) {
      try {
        // Get current usage to preserve it
        const data = await new Promise(resolve => chrome.storage.local.get(['usageCount'], resolve));
        const currentUsage = data.usageCount || 0;

        await saveStateWithIntegrity(currentUsage, true);
        successMessage.style.display = 'block';
        activationKeyInput.value = '';

        setTimeout(() => {
          updateUI(currentUsage, true);
        }, 1200);
      } catch (err) {
        console.error('Activation save failed:', err);
        errorMessage.textContent = 'Activation failed. Please try again.';
        errorMessage.style.display = 'block';
      }
    } else {
      errorMessage.style.display = 'block';
    }
  });

  // Handle checkout portal button
  checkoutBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://thequietwishco.lemonsqueezy.com/checkout/buy/1348213b-392b-4eff-bc41-f52ac7dff5c7' });
  });
});