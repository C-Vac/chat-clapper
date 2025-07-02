// ==UserScript==
// @name         FairCompetitiveChatGameMetaStrategy.user.js
// @namespace    http://tampermonkey.net/
// @version      2025.7.1
// @description  Assists in "fairly" competing in a chat-based Giphy matching game.
// @author       VILLY 88 GOBLINZ KREW
// @match        *://*.wowvegas.com
// @grant        GM_xmlhttpRequest
// @grant        GM_log
// ==/UserScript==

(function () {
  'use strict';

  // --- CONFIGURATION ---
  // TODO: Replace these CSS selectors with the actual selectors from the chat website.
  const CHAT_CONTAINER_SELECTOR = '#chat-container'; // The element that contains all chat messages.
  const MESSAGE_SELECTOR = '.chat-message'; // The selector for a single message element.
  const MOD_BADGE_SELECTOR = '.moderator-badge'; // The selector for a moderator's badge within a message.
  const GIF_SELECTOR = 'img.giphy-gif'; // The selector for a GIF image itself.
  const CHAT_INPUT_SELECTOR = '#chat-input-field'; // The selector for the chat input box.

  // --- GIPHY SCRAPING SELECTORS ---
  // This selector was provided. It might be very specific and could break if Giphy changes its layout.
  // A more robust selector would be preferable if possible (e.g., using data-attributes or more general classes).
  const GIPHY_AUTHOR_SELECTOR =
    'body > div.sc-536d6c31-5.gpCWTL > div.sc-hIPCWT.gupaiu > div.flex.flex-col.md\:grid.md\:grid-cols-\[249px_auto\].md\:gap-4.md\:pt-3 > div.divide-giphyDarkCharcoal.mr-12.flex.w-\[249px\].flex-col.gap-2\.5 > section.from-giphyBlack.to-giphyDarkestGrey.flex.flex-col.rounded-md.bg-gradient-to-t.p-4.gap-3 > div.sc-8c4fde6f-1.dRqeec > div > a > div';

  // TODO: Inspect the Giphy page for a GIF and find the correct selector for its tags.
  // It will likely be a selector that targets multiple elements, like `a.tag-class`.
  const GIPHY_TAGS_SELECTOR = '.giphy-tags-container a'; // <-- Placeholder, needs to be updated.

  // --- SCRIPT LOGIC ---

  console.log('FairCompetitiveChatGameMetaStrategy.js loaded.');

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the added node is a message itself, or contains messages.
          const messages = node.matches(MESSAGE_SELECTOR)
            ? [node]
            : node.querySelectorAll(MESSAGE_SELECTOR);
          messages.forEach(handleMessage);
        }
      }
    }
  });

  function handleMessage(message) {
    const isModPost = message.querySelector(MOD_BADGE_SELECTOR);
    const gifElement = message.querySelector(GIF_SELECTOR);

    if (isModPost && gifElement) {
      console.log('Moderator GIF detected:', gifElement.src);
      const giphyUrl = getGiphyPageUrlFromSrc(gifElement.src);
      if (giphyUrl) {
        fetchGiphyMetadata(giphyUrl);
      }
    }
  }

  function getGiphyPageUrlFromSrc(srcUrl) {
    // Giphy URLs often look like: https://media.giphy.com/media/<GIF_ID>/giphy.gif
    // We need to convert this to a page URL like: https://giphy.com/gifs/<GIF_ID>
    const match = srcUrl.match(/media\.giphy\.com\/media\/([a-zA-Z0-9]+)\//);
    if (match && match[1]) {
      const gifId = match[1];
      const pageUrl = `https://giphy.com/gifs/${gifId}`;
      console.log(`Constructed Giphy Page URL: ${pageUrl}`);
      return pageUrl;
    }
    console.error('Could not extract Giphy ID from src:', srcUrl);
    return null;
  }

  function fetchGiphyMetadata(url) {
    console.log(`Fetching metadata from: ${url}`);
    GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      onload: function (response) {
        if (response.status >= 200 && response.status < 300) {
          parseGiphyPage(response.responseText);
        } else {
          console.error(
            `Failed to fetch Giphy page. Status: ${response.status}`
          );
        }
      },
      onerror: function (error) {
        console.error('Error fetching Giphy page:', error);
      },
    });
  }

  function parseGiphyPage(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Scrape Author
    const authorElement = doc.querySelector(GIPHY_AUTHOR_SELECTOR);
    const author = authorElement
      ? authorElement.textContent.trim().replace(/^@/, '')
      : ''; // remove leading @ if it exists
    if (author) console.log(`Found author: ${author}`);
    else console.log('Author not found.');

    // Scrape Tags
    const tagElements = doc.querySelectorAll(GIPHY_TAGS_SELECTOR);
    const tags = Array.from(tagElements).map((el) => el.textContent.trim());
    if (tags.length > 0) console.log(`Found tags: ${tags.join(', ')}`);
    else console.log('Tags not found. Check GIPHY_TAGS_SELECTOR.');

    // Combine and create search query
    const searchTerms = [author, ...tags].filter(Boolean).join(' '); // Filter out empty strings
    if (searchTerms) {
      updateChatInput(searchTerms);
    } else {
      console.log('No metadata found to create a search query.');
    }
  }

  function updateChatInput(query) {
    const inputField = document.querySelector(CHAT_INPUT_SELECTOR);
    if (inputField) {
      inputField.value = `/giphy ${query}`;
      inputField.focus();
      console.log(`Set chat input to: /giphy ${query}`);
    } else {
      console.error(
        `Chat input field not found with selector: ${CHAT_INPUT_SELECTOR}`
      );
    }
  }

  // --- INITIALIZATION ---

  const targetNode = document.querySelector(CHAT_CONTAINER_SELECTOR);
  if (targetNode) {
    observer.observe(targetNode, { childList: true, subtree: true });
    console.log(`Observer attached to ${CHAT_CONTAINER_SELECTOR}`);
  } else {
    // If the chat container isn't immediately available, wait for the page to fully load.
    window.addEventListener('load', () => {
      const targetNodeOnLoad = document.querySelector(CHAT_CONTAINER_SELECTOR);
      if (targetNodeOnLoad) {
        observer.observe(targetNodeOnLoad, { childList: true, subtree: true });
        console.log(
          `Observer attached to ${CHAT_CONTAINER_SELECTOR} after page load.`
        );
      } else {
        console.error(
          `Target node for observer not found: ${CHAT_CONTAINER_SELECTOR}. The script will not run.`
        );
      }
    });
  }
})();
