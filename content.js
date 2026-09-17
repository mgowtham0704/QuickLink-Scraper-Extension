// Content script - runs in page context, communicates via messaging
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractLinks') {
    const anchors = document.getElementsByTagName('a');
    const links = [];
    for (let i = 0; i < anchors.length; i++) {
      const href = anchors[i].href;
      if (href && href.toLowerCase().startsWith('http')) {
        links.push(href);
      }
    }
    sendResponse({ links: [...new Set(links)] });
  }
  return true; // Keep message channel open for async response
});