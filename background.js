'use strict';

var isGoogleAPILoaded = false;

function googleApiIsLoaded() {
  isGoogleAPILoaded = true;
}

function addScriptTagToHead() {
  // Create the script tag, set the appropriate attributes
  var script = document.createElement('script');
  script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyA3ZbHa1nT0-WgfiY6HG11Lw2JhT4q3nFA&callback=googleApiIsLoaded';
  script.defer = true;
  
  // Append the 'script' element to 'head'
  document.head.appendChild(script);
}

function setIcon(iconName, tabId) {
  chrome.pageAction.setIcon({
      path: "icons/" + iconName,
      tabId: tabId
  });
}

// Sets the status using the storage API to pass it to the popup
function _setStatus(className, text) {
  let status = {className: className, text: text};
  chrome.storage.sync.set({popupStatus: status});
}

function setError(errorMessage) {
  text = "Encountered an error.<br/>";
  text += errorMessage;
  text += "Please contact the developer at team@rcvis.com/*TODO*/ to address this.";
  _setStatus('warning', text)
}

function setInfo(message) {
  _setStatus('info', message)
}

function setAcceptable(message, tabId) {
  setIcon("acceptable.png", tabId);
  _setStatus('acceptable', message)
}

function setCheated(message, tabId) {
  setIcon("cheated.png", tabId);
  _setStatus('cheated', message)
}

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

function queryGoogleForDistance(startLatLon, endLatLon, uberPaidForDistance, tabId) {
  let directionsService = new google.maps.DirectionsService();
  let start = new google.maps.LatLng(parseFloat(startLatLon[0]), parseFloat(startLatLon[1]));
  let end = new google.maps.LatLng(parseFloat(endLatLon[0]), parseFloat(endLatLon[1]));

  setInfo("Reaching out to Google to compute the distance between " + start + " and " + end);

  const route = {
    origin: start,
    destination: end,
    travelMode: 'DRIVING'
  }

  directionsService.route(route, function(response, status) {
    callbackDirectionsComplete(response, status, uberPaidForDistance, tabId);
  });
}

function compareDistances(actualDistance, uberPaidForDistance, tabId) {
  var mileageRegex = new RegExp("([0-9]*[.][0-9]*) (mi|km)", "g");
  
  // Get the uber match
  var uberMatch = mileageRegex.exec(uberPaidForDistance);
  // Reset regex
  mileageRegex.lastIndex = 0;
  // Get the actual match
  var actualMatch = mileageRegex.exec(actualDistance);

  // Error handling: This shouldn't happen.
  if (!actualMatch || !uberMatch || actualMatch.length < 2 || uberMatch.length < 2)
  {
    setError("Could not parse mileages:\n" +
             "\nactual=" + actualDistance +
             "\nuber paid for=" + uberPaidForDistance +
             "\nactual match=" + actualMatch +
             "\nuber match=" + uberMatch);
    return;
  }

  var actualFloat = parseFloat(actualMatch[1])
  var uberPaidFloat = parseFloat(uberMatch[1])
  if (actualFloat <= uberPaidFloat) 
  {
    setAcceptable("As best I can tell, you were paid fairly.", tabId);
  }
  else
  {
    setCheated("Uber paid you for " + uberPaidForDistance + " but you actually drove for " + actualDistance, tabId);
  }
}

function callbackDirectionsComplete(response, status, uberPaidForDistance, tabId) {
  setInfo("Directions request received from google.")

  if (status !== 'OK') {
    setError('Directions request failed due to ' + status);
    return -1;
  } else {
    let directionsData = response.routes[0].legs[0]; // Get data about the mapped route
    if (!directionsData) {
      setError('Directions request failed');
      return -1;
    }
    else {
      // Success!
      let actualDistance = directionsData.distance.text;
      compareDistances(actualDistance, uberPaidForDistance, tabId)
    }
  }
}

function callbackFinishedReadingPage(tabId, dataFromContentScript) {
  setIcon("loading128.gif", tabId)

  let result = dataFromContentScript[0];
  let pickupLatLon = result['pickupLatLon'];
  let dropoffLatLon = result['dropoffLatLon'];
  let uberPaidForDistance = result['uberPaidForDistance']
  queryGoogleForDistance(pickupLatLon, dropoffLatLon, uberPaidForDistance, tabId);
}

function runCheatDetector(tabId) {
  chrome.tabs.executeScript(
      tabId,
      {file: 'contentScript.js'},
      function(result) {
        callbackFinishedReadingPage(tabId, result);
      }
  )
}

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

chrome.webNavigation.onCompleted.addListener(
  function(details) {
    if (!isGoogleAPILoaded)
    {
      setError("Please wait...the Google Maps API has not yet loaded")
      return;
    }

    var tabId = details.tabId;
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
