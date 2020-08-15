'use strict';

// Standard Google Universal Analytics code
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga'); // Note: https protocol here
window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
ga('create', 'UA-175307097-1', 'auto');
ga('set', 'checkProtocolTask', function(){}); // Removes failing protocol check. @see: http://stackoverflow.com/a/22152353/1958200
ga('require', 'displayfeatures');
ga('send', 'pageview', 'background');

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
      path: 'icons/' + iconName,
      tabId: tabId
  });
}

// Sets the status using the storage API to pass it to the popup
function _setStatus(className, text, tabId) {
  let status = {
    className: className,
    text: text
  };
  let key = 'tab' + tabId;
  let storedObject = {}
  storedObject[key] = status
  chrome.storage.local.set(storedObject);
}

// Sets an error message
function setError(errorMessage, tabId) {
  setIcon('error.png', tabId);
  let text = '<strong>Encountered an error.</strong><br/>';
  text += errorMessage;
  text += '<br/><br/>Please contact the developer at ubercheats@arminsamii.com to address this.';
  _setStatus('warning', text, tabId)
}

// Sets an info message
function setInfo(message, tabId) {
  _setStatus('info', message, tabId)
}

// Sets a message signifying UberEats paid you fairly
function setAcceptable(message, tabId) {
  setIcon('acceptable.png', tabId);
  _setStatus('acceptable', message, tabId)
}

// Sets a message signifying UberEats underpaid you
function setCheated(message, tabId) {
  setIcon('cheated.png', tabId);
  _setStatus('cheated', message, tabId)
}

// Gets the lat/lon coordinates given a Google Maps API URL
function getLatLonFor(pinImageSource, googleMapsImageSource) {
  var numberRegex = '[-]?[0-9]*'
  var latOrLonRegex = `(" + numberRegex + "." + numberRegex + ")`
  var latAndLonRegex = latOrLonRegex + '%2C' + latOrLonRegex
  var pickupRegex = new RegExp(pinImageSource + '%7Cscale%3A2%7C' + latAndLonRegex, 'g');
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

  setInfo('Reaching out to Google to compute the distance between ' + start + ' and ' + end, tabId);

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
  var mileageRegex = new RegExp('([0-9]*\.?[0-9]*) (mi|km)', 'g');
  
  // Get the uber match
  var uberMatch = mileageRegex.exec(uberPaidForDistance);
  // Reset regex
  mileageRegex.lastIndex = 0;
  // Get the actual match
  var actualMatch = mileageRegex.exec(actualDistance);

  // Error handling: This shouldn't happen.
  if (!actualMatch || !uberMatch || actualMatch.length < 2 || uberMatch.length < 2)
  {
    setError('Could not parse mileages:<br/>' +
             '<br/>actual=' + actualDistance +
             '<br/>uber paid for=' + uberPaidForDistance +
             '<br/>actual match=' + actualMatch +
             '<br/>uber match=' + uberMatch,
             tabId);
    return;
  }

  var actualFloat = parseFloat(actualMatch[1])
  var uberPaidFloat = parseFloat(uberMatch[1])

  // Standardize to miles
  var googleUnits = actualMatch[2]
  var uberUnits = actualMatch[2]
  if (uberUnits == 'km')
  {
    uberPaidFloat *= 0.621371;
  }
  if (googleUnits == 'km')
  {
    actualFloat *= 0.621371;
  }

  var percentDiff = (actualFloat - uberPaidFloat) / actualFloat
  ga('send', 'event', 'fairness', 'absoluteDifferenceTimes100', Math.round((actualFloat - uberPaidFloat) * 100));
  ga('send', 'event', 'fairness', 'percentDifference', Math.round(percentDiff*100));

  if (actualFloat <= uberPaidFloat) {
    setAcceptable('As best I can tell, you were paid fairly.', tabId);
  } else if (percentDiff < 0.10) {
    setAcceptable(`You were underpaid by less than 10% - I don't see a problem here, probably just the difference between Uber and Google's algorithms.`, tabId);
  } else {
    let helpUrl = 'https://www.reddit.com/r/UberEATS/comments/i2jyyj/14_emails_and_126_minutes_on_the_phone_later_uber/'
    let text = 'Uber paid you for ' + uberPaidForDistance + ' but the travel distance was actually ' + actualDistance + '.<br/><br/>'
    text += '<br/>Want to do something about it? Call UberEATS support, ask for a supervisor, and explain that you were underpaid.'
    text += '<br/>If you need advice getting paid fairly, reach out on the <a href=\"' + helpUrl + '\" target=\"_blank\">reddit thread</a>.'
    setCheated(text, tabId);
  }
}

// Callback for when the Google Maps API returns directions
function callbackDirectionsComplete(response, status, uberPaidForDistance, tabId) {
  setInfo('Directions request received from google.', tabId)

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
function callbackFinishedReadingPage(tabId, result) {
  setIcon('loading128.gif', tabId)

  let pickupLatLon = result['pickupLatLon'];
  let dropoffLatLon = result['dropoffLatLon'];
  let uberPaidForDistance = result['uberPaidForDistance']
  queryGoogleForDistance(pickupLatLon, dropoffLatLon, uberPaidForDistance, tabId);
}

function handleAnalyticsFromContentScript(returnValue) {
  if (!returnValue)
  {
    ga('send', 'event', 'howWasUberPaidFound', 'errorInParsing');
  } else {
    ga('send', 'event', 'howWasUberPaidFound', returnValue.howUberPaidForWasFound);
  }
}

// Returns true if there were errors
function handleErrorsFromContentScript(tabId, returnValue) {
  let errorMessage = 'Could not find the data we were looking for on this page. '
  errorMessage += `If you're okay with it, can you hit Ctrl+S to save the page data, `
  errorMessage += 'then attach it in an email to the developer, along with this message:'
  errorMessage += '<br/><br/>'
  
  let wereThereErrors = false;
  if (!returnValue) {
    errorMessage += '"Failed to parse anything"'
    wereThereErrors = true;
  } else {
    if (!returnValue.pickupLatLon || !returnValue.dropoffLatLon) {
      errorMessage += '"Failed to parse the pickup/dropoff locations"'
      wereThereErrors = true;
    } else if (!returnValue.uberPaidForDistance) {
      errorMessage += '"Failed to parse the distance"'
      wereThereErrors = true;
    }
  }

  if (wereThereErrors) {
    setError(errorMessage, tabId);
  }

  return wereThereErrors;
}

// Runs the end-to-end cheat detector
function runCheatDetector(tabId) {
  chrome.tabs.executeScript(
      tabId,
      {
       file: 'js/contentScript.js',
       runAt: 'document_idle'
      },
      function(result) {
        let returnValue = result[0];

        handleAnalyticsFromContentScript(returnValue);
        let wereThereErrors = handleErrorsFromContentScript(tabId, returnValue);
        if (!wereThereErrors) {
          callbackFinishedReadingPage(tabId, returnValue);
        }
      }
  )
}

// Adds a listener for a page load on the Uber payments page
chrome.webNavigation.onCompleted.addListener(
  function(details) {
    var tabId = details.tabId;
    if (!isGoogleAPILoaded)
    {
      setError('Please wait...the Google Maps API has not yet loaded', tabId)
      return;
    }

    setIcon('loading128.gif', tabId);
    runCheatDetector(tabId);
  }, {
  url: [
    {
      hostSuffix: 'drivers.uber.com',
      pathPrefix: '/p3/payments/v2/trips/',
    }
  ]}
)

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
