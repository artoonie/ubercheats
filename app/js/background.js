'use strict';

const bg = require('./background-functions.js');

var isGoogleAPILoaded = false;

// This happens fairly quickly, but we still need a safeguard in case the API fails to load
// Once its reloaded, clear the localstorage cache, but maintain the synced storage.
function googleApiIsLoaded() {
  console.log('Google API is loaded');
  isGoogleAPILoaded = true;

  chrome.storage.local.clear();
}
window.googleApiIsLoaded = googleApiIsLoaded; // otherwise google callback can't find it

// Adds the Google Maps API script to the <head> tag to load it
function addScriptTagToHead() {
  // Create the script tag, set the appropriate attributes
  let script = document.createElement('script');
  let minifiedCallbackName = googleApiIsLoaded.name;
  script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyA3ZbHa1nT0-WgfiY6HG11Lw2JhT4q3nFA&callback=googleApiIsLoaded'
  script.defer = true;
  
  // Append the 'script' element to 'head'
  document.head.appendChild(script);
}

bg.loadGoogleAnalytics();

var listeners = [
    {
        func: function(details) {
            var tabId = details.tabId;
            if (!isGoogleAPILoaded)
            {
                bg.setError('Please wait...the Google Maps API has not yet loaded', tabId)
                return;
            }

            bg.setIcon('loading128.gif', tabId);
            bg.runCheatDetector(tabId);
        },
        url: {
            hostSuffix: 'drivers.uber.com',
            pathPrefix: '/p3/payments/v2/trips/',
        }
    },
    {
        func: function(details) {
            var tabId = details.tabId;
            bg.setTut('Click on "Statements" in the left corner, next to Weekly Earnings', tabId)
        },
        url: {
            hostSuffix: 'drivers.uber.com',
            pathPrefix: '/p3/payments/performance-hub',
        }
    },
    {
        func: function(details) {
            var tabId = details.tabId;
            bg.setTut('Click on "View Statement" for as many statements as you wish to check', tabId)
        },
        url: {
            hostSuffix: 'drivers.uber.com',
            pathEquals: '/p3/payments/statements',
        }
    },
    {
        func: function(details) {
            var tabId = details.tabId;
            bg.setTut('Click on the Trip ID for every trip in this statement. Use ctrl+click or cmd+click to open each statement into a new tab.', tabId)
        },
        url: {
            hostSuffix: 'drivers.uber.com',
            pathPrefix: '/p3/payments/statements/',
        }
    }
]

listeners.map(function(listener) {
  chrome.webNavigation.onCompleted.addListener(listener.func, {url: [listener.url]})
  chrome.webNavigation.onHistoryStateUpdated.addListener(listener.func, {url: [listener.url]})
})

chrome.runtime.onInstalled.addListener(function() {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: {hostEquals: 'drivers.uber.com'},
      })
      ],
          actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});

addScriptTagToHead()
