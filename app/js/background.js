'use strict';

const bg = require('./background-functions.js');

var isGoogleAPILoaded = false;

// This happens fairly quickly, but we still need a safeguard in case the API fails to load
// Once its reloaded, clear the localstorage cache, but maintain the synced storage.
function googleApiIsLoaded() {
  console.log('Google API is loaded');
  isGoogleAPILoaded = true;
}
window.googleApiIsLoaded = googleApiIsLoaded; // otherwise google callback can't find it

// Adds the Google Maps API script to the <head> tag to load it
function addScriptTagToHead() {
  // Create the script tag, set the appropriate attributes
  const mapScript = document.createElement('script');
  let minifiedCallbackName = googleApiIsLoaded.name;
  mapScript.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyA3ZbHa1nT0-WgfiY6HG11Lw2JhT4q3nFA&callback=googleApiIsLoaded'
  mapScript.defer = true;

  // Append the 'script' element to 'head'
  document.head.appendChild(mapScript);
}

var listeners = [
    {
        func: function(details) {
            var tabId = details.tabId;
            var frameId = details.frameId;
            let messageDestination = new bg.MessageDestination(tabId, frameId);
            if (!isGoogleAPILoaded)
            {
                bg.setError('Please wait...the Google Maps API has not yet loaded', messageDestination)
                return;
            }

            bg.setIcon('loading128.gif', messageDestination);
            bg.runCheatDetectorOnTrip(messageDestination);
        },
        url: {
            // match both /p3/payments/trips (taiwan) and /p3/payments/v2/trips (everywhere else?)
            hostSuffix: 'drivers.uber.com',
            pathPrefix: '/p3/payments/',
            pathContains: 'trips',
        }
    },
    {
        func: function(details) {
            var tabId = details.tabId;
            var frameId = details.frameId;
            let messageDestination = new bg.MessageDestination(tabId, frameId);
            bg.setTut('Click on "Statements" in the left corner, next to Weekly Earnings', messageDestination)
        },
        url: {
            hostSuffix: 'drivers.uber.com',
            pathPrefix: '/p3/payments/performance-hub',
        }
    },
    {
        func: function(details) {
            var tabId = details.tabId;
            var frameId = details.frameId;
            let messageDestination = new bg.MessageDestination(tabId, frameId);
            bg.setTut('Click on "View Statement" for as many statements as you wish to check', messageDestination)
        },
        url: {
            hostSuffix: 'drivers.uber.com',
            pathEquals: '/p3/payments/statements',
        }
    },
    {
        func: function(details) {
            let tabId = details.tabId;
            let frameId = 0; // not in an iframe
            let messageDestination = new bg.MessageDestination(tabId, frameId);
            bg.runCheatDetectorOnStatement(messageDestination);
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
