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

  // Secure mock activation verification string
  const PREMIUM_KEY = "PREMIUM_SCRAPER_2026";
  const FREE_LIMIT = 5;

  let currentResults = [];

  // Load status from local storage
  chrome.storage.local.get(['usageCount', 'premium'], (data) => {
    let count = data.usageCount || 0;
    let isPremium = data.premium || false;

    updateUI(count, isPremium);
  });

  function updateUI(count, isPremium) {
    // Render the badges
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
        // Show Lock Screen dynamically
        mainView.style.display = 'none';
        lockView.style.display = 'flex';
      } else {
        mainView.style.display = 'flex';
        lockView.style.display = 'none';
      }
    }
  }

  // Handle URL Link Extraction
  extractBtn.addEventListener('click', () => {
    chrome.storage.local.get(['usageCount', 'premium'], (data) => {
      let count = data.usageCount || 0;
      let isPremium = data.premium || false;

      if (!isPremium && count >= FREE_LIMIT) {
        updateUI(count, isPremium);
        return;
      }

      // Query active tab to extract links
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;

        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: extractLinksFromDOM
        }, (results) => {
          if (chrome.runtime.lastError || !results || !results[0]) {
            console.error(chrome.runtime.lastError);
            return;
          }

          // Successfully completed an extraction! Increment the usage counter if not premium
          if (!isPremium) {
            count += 1;
            chrome.storage.local.set({ usageCount: count }, () => {
              updateUI(count, isPremium);
            });
          }

          currentResults = results[0].result || [];
          displayResults(currentResults);
        });
      });
    });
  });

  function extractLinksFromDOM() {
    const anchors = document.getElementsByTagName('a');
    const links = [];
    for (let i = 0; i < anchors.length; i++) {
      const href = anchors[i].href;
      if (href && href.startsWith('http')) {
        links.push(href);
      }
    }
    // Return unique links
    return [...new Set(links)];
  }

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

  // Copy All button
  copyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentResults.length === 0) return;

    const textToCopy = currentResults.join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 1500);
    });
  });

  // Handle premium key activation
  activateBtn.addEventListener('click', () => {
    const inputKey = activationKeyInput.value.trim();
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    if (inputKey === PREMIUM_KEY) {
      chrome.storage.local.set({ premium: true }, () => {
        successMessage.style.display = 'block';
        activationKeyInput.value = '';
        setTimeout(() => {
          updateUI(0, true);
        }, 1200);
      });
    } else {
      errorMessage.style.display = 'block';
    }
  });

  // Handle checkout portal button
  checkoutBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://checkout.example.com/premium-scraper' });
  });
});