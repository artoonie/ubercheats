'use strict';

var isGoogleAPILoaded = false;

// This happens fairly quickly, but we still need a safeguard in case the API fails to load
// Once its reloaded, clear the localstorage cache.
function googleApiIsLoaded() {
  isGoogleAPILoaded = true;

  chrome.storage.local.clear();
}

// Adds the Google Maps API script to the <head> tag to load it
function addScriptTagToHead() {
  // Create the script tag, set the appropriate attributes
  var script = document.createElement('script');
  script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyA3ZbHa1nT0-WgfiY6HG11Lw2JhT4q3nFA&callback=googleApiIsLoaded';
  script.defer = true;
  
  // Append the 'script' element to 'head'
  document.head.appendChild(script);
}

// Sets the extension icon
function setIcon(iconName, tabId) {
  chrome.pageAction.setIcon({
      path: "icons/" + iconName,
      tabId: tabId
  });
}

// Sets the status using the storage API to pass it to the popup
function _setStatus(className, text, tabId) {
  let status = {
    className: className,
    text: text
  };
  let key = "tab" + tabId;
  let storedObject = {}
  storedObject[key] = status
  chrome.storage.local.set(storedObject);
}

// Sets an error message
function setError(errorMessage, tabId) {
  let text = "Encountered an error.<br/>";
  text += errorMessage;
  text += "Please contact the developer at team@rcvis.com/*TODO*/ to address this.";
  _setStatus('warning', text, tabId)
}

// Sets an info message
function setInfo(message, tabId) {
  _setStatus('info', message, tabId)
}

// Sets a message signifying UberEats paid you fairly
function setAcceptable(message, tabId) {
  setIcon("acceptable.png", tabId);
  _setStatus('acceptable', message, tabId)
}

// Sets a message signifying UberEats underpaid you
function setCheated(message, tabId) {
  setIcon("cheated.png", tabId);
  _setStatus('cheated', message, tabId)
}

// Gets the lat/lon coordinates given a Google Maps API URL
function getLatLonFor(pinImageSource, googleMapsImageSource) {
  var numberRegex = "[-]?[0-9]*"
  var latOrLonRegex = "(" + numberRegex + "." + numberRegex + ")"
  var latAndLonRegex = latOrLonRegex + "%2C" + latOrLonRegex
  var pickupRegex = new RegExp(pinImageSource + "%7Cscale%3A2%7C" + latAndLonRegex, "g");
  var match = pickupRegex.exec(googleMapsImageSource)
  var pickupLatitude = match[1]
  var pickupLongitude = match[2]
  return [pickupLatitude, pickupLongitude]
}

// Queries Google Maps for the distance between the start and end points,
// then asynchronously compares that value to what UberEats paid you for
function queryGoogleForDistance(startLatLon, endLatLon, uberPaidForDistance, tabId) {
  let directionsService = new google.maps.DirectionsService();
  let start = new google.maps.LatLng(parseFloat(startLatLon[0]), parseFloat(startLatLon[1]));
  let end = new google.maps.LatLng(parseFloat(endLatLon[0]), parseFloat(endLatLon[1]));

  setInfo("Reaching out to Google to compute the distance between " + start + " and " + end, tabId);

  const route = {
    origin: start,
    destination: end,
    travelMode: 'DRIVING'
  }

  directionsService.route(route, function(response, status) {
    callbackDirectionsComplete(response, status, uberPaidForDistance, tabId);
  });
}

// Compares the actual distance to what Uber paid, and lets you know if it wasn't fair
// Fair is defined as a difference of more than 10%
function compareDistances(actualDistance, uberPaidForDistance, tabId) {
  var mileageRegex = new RegExp("([0-9]*\.?[0-9]*) (mi|km)", "g");
  
  // Get the uber match
  var uberMatch = mileageRegex.exec(uberPaidForDistance);
  // Reset regex
  mileageRegex.lastIndex = 0;
  // Get the actual match
  var actualMatch = mileageRegex.exec(actualDistance);

  // Error handling: This shouldn't happen.
  if (!actualMatch || !uberMatch || actualMatch.length < 2 || uberMatch.length < 2)
  {
    setError("Could not parse mileages:<br/>" +
             "<br/>actual=" + actualDistance +
             "<br/>uber paid for=" + uberPaidForDistance +
             "<br/>actual match=" + actualMatch +
             "<br/>uber match=" + uberMatch,
             tabId);
    return;
  }

  var actualFloat = parseFloat(actualMatch[1])
  var uberPaidFloat = parseFloat(uberMatch[1])
  if (actualFloat <= uberPaidFloat) {
    setAcceptable("As best I can tell, you were paid fairly.", tabId);
  } else if ((actualFloat - uberPaidFloat) / actualFloat < 0.10) {
    setAcceptable("You were underpaid by less than 10% - I don't see a problem here, probably just the difference between Uber and Google's algorithms.", tabId);
  } else {
    let helpUrl = "https://www.reddit.com/r/UberEATS/comments/i2jyyj/14_emails_and_126_minutes_on_the_phone_later_uber/"
    let text = "Uber paid you for " + uberPaidForDistance + " but the travel distance was actually " + actualDistance + ".<br/><br/>"
    text += "<br/>Want to do something about it? Call UberEATS support, ask for a supervisor, and explain that you were underpaid."
    text += "<br/>If you need advice getting paid fairly, reach out on the <a href=\"" + helpUrl + "\" target=\"_blank\">reddit thread</a>."
    setCheated(text, tabId);
  }
}

// Callback for when the Google Maps API returns directions
function callbackDirectionsComplete(response, status, uberPaidForDistance, tabId) {
  setInfo("Directions request received from google.", tabId)

  if (status !== 'OK') {
    setError('Directions request failed due to ' + status, tabId);
    return -1;
  } else {
    let directionsData = response.routes[0].legs[0]; // Get data about the mapped route
    if (!directionsData) {
      setError('Directions request failed', tabId);
      return -1;
    }
    else {
      // Success!
      let actualDistance = directionsData.distance.text;
      compareDistances(actualDistance, uberPaidForDistance, tabId)
    }
  }
}

// Callback for when the content-script finished running and returned data from the page
function callbackFinishedReadingPage(tabId, dataFromContentScript) {
  setIcon("loading128.gif", tabId)

  let result = dataFromContentScript[0];
  let pickupLatLon = result['pickupLatLon'];
  let dropoffLatLon = result['dropoffLatLon'];
  let uberPaidForDistance = result['uberPaidForDistance']
  queryGoogleForDistance(pickupLatLon, dropoffLatLon, uberPaidForDistance, tabId);
}

// Runs the end-to-end cheat detector
function runCheatDetector(tabId) {
  chrome.tabs.executeScript(
      tabId,
      {file: 'contentScript.js'},
      function(result) {
        callbackFinishedReadingPage(tabId, result);
      }
  )
}

// Adds a listener for a page load on the Uber payments page
chrome.webNavigation.onCompleted.addListener(
  function(details) {
    var tabId = details.tabId;
    if (!isGoogleAPILoaded)
    {
      setError("Please wait...the Google Maps API has not yet loaded", tabId)
      return;
    }

    runCheatDetector(tabId)
  }, {
  url: [
    {
      hostSuffix: 'drivers.uber.com',
      pathPrefix: '/p3/payments/v2/trips/',
    }
  ]}
)

addScriptTagToHead()
