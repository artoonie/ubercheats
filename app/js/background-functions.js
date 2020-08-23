'use strict';

class RouteCoordinates {
  constructor(pickupLat, pickupLon, dropoffLat, dropoffLon) {
    this.pickupLat = pickupLat;
    this.pickupLon = pickupLon;
    this.dropoffLat = dropoffLat;
    this.dropoffLon = dropoffLon;
  }
  getGooglePickup() {
    return new google.maps.LatLng(parseFloat(this.pickupLat), parseFloat(this.pickupLon));
  }
  getGoogleDropoff() {
    return new google.maps.LatLng(parseFloat(this.dropoffLat), parseFloat(this.dropoffLon));
  }
}

class DataFromStatement {
  constructor(uberPaidForFloatMi, uberPaidForString, routeCoordinates, tripId) {
    this.uberPaidForFloatMi = uberPaidForFloatMi;
    this.uberPaidForString = uberPaidForString;
    this.routeCoordinates = routeCoordinates;
    this.tripId = tripId;
  }
}

class DataFromGoogle {
  constructor(actualDistanceFloatMi, actualDistanceString) {
    this.actualDistanceFloatMi = actualDistanceFloatMi;
    this.actualDistanceString = actualDistanceString;
  }
}

function loadGoogleAnalytics() {
  // Standard Google Universal Analytics code
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga'); // Note: https protocol here
  window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
  ga('create', 'UA-175307097-1', 'auto');
  ga('set', 'checkProtocolTask', function(){}); // Removes failing protocol check. @see: http://stackoverflow.com/a/22152353/1958200
  ga('require', 'displayfeatures');
  ga('send', 'pageview', 'popup');
}

// Sets the extension icon
function setIcon(iconName, tabId) {
  chrome.pageAction.setIcon({
      path: 'icons/' + iconName,
      tabId: tabId
  });
}

// Sets the status using the storage API to pass it to the popup
function _setStatus(className, text, tabId, showTutorialVideo) {
  let status = {
    className: className,
    text: text,
    showTutorialVideo: showTutorialVideo
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
  _setStatus('warning', text, tabId, true)
}

// Sets a tutorial message
function setTut(message, tabId) {
  message = 'Next step: ' + message
  _setStatus('info', message, tabId, true)
}

// Sets an info message
function setInfo(message, tabId) {
  _setStatus('info', message, tabId, true)
}

// Sets a message signifying UberEats paid you fairly
function setAcceptable(message, tabId) {
  setIcon('acceptable.png', tabId);
  _setStatus('acceptable', message, tabId, false)
}

// Sets a message signifying UberEats underpaid you
function setCheated(message, tabId) {
  setIcon('cheated.png', tabId);
  _setStatus('cheated', message, tabId, false)
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
function queryGoogleForDistance(dataFromStatement, tabId) {
  let coords = dataFromStatement.routeCoordinates;

  let directionsService = new google.maps.DirectionsService();
  let start = coords.getGooglePickup();
  let end = coords.getGoogleDropoff();

  setInfo('Reaching out to Google to compute the distance between ' + start + ' and ' + end, tabId);

  const route = {
    origin: start,
    destination: end,
    travelMode: 'DRIVING'
  }

  directionsService.route(route, function(response, status) {
    callbackDirectionsComplete(response, status, dataFromStatement, tabId);
  });
}

// Converts "1.2 mi" or "6 km" to the float equivalent in miles
function distanceStringToMilesFloat(distanceString, tabId) {
  var mileageRegex = new RegExp('([0-9]*\.?[0-9]*) (mi|km)', 'g');
  
  // Get the uber match
  var match = mileageRegex.exec(distanceString);

  // Error handling: This shouldn't happen.
  if (!match || match.length < 2)
  {
    setError('Could not parse mileages:<br/>' +
             '<br/>string=' + distanceString +
             '<br/>match=' + match,
             tabId);
    return null;
  }

  let floatValueMiOrKm = parseFloat(match[1])

  // Error handling: This shouldn't happen.
  if (isNaN(floatValueMiOrKm))
  {
    setError('Could not parse float for: ' + match[1]);
    return null;
  }

  // Standardize to miles
  var units = match[2];
  if (units == 'km') {
    return floatValueMiOrKm * 0.621371;
  } else {
    return floatValueMiOrKm;
  }
}

// Percent difference between the actual distance and what uber paid
function calculatePercentDiff(dataFromStatement, dataFromGoogle) {
  return (dataFromGoogle.actualDistanceFloatMi - dataFromStatement.uberPaidForFloatMi) / dataFromStatement.uberPaidForFloatMi;
}

// Using the provided distances, determines what message and icon should be shown to the user
function compareDistancesAndSetPopupText(dataFromStatement, dataFromGoogle, tabId) {
  var percentDiff = calculatePercentDiff(dataFromStatement, dataFromGoogle);
  if (dataFromGoogle.actualDistanceFloatMi <= dataFromStatement.uberPaidForFloatMi) {
    setAcceptable('As best I can tell, you were paid fairly.', tabId);
  } else if (percentDiff < 0.10) {
    setAcceptable(`You were underpaid by less than 10% - I don't see a problem here, probably just the difference between Uber and Google's algorithms.`, tabId);
  } else {
    let helpUrlReddit = 'https://www.reddit.com/r/UberEATS/comments/icdu0y/ubercheats_is_now_live_check_if_ubereats_has/' // also in popup.js
    let helpUrlTwitter = 'https://twitter.com/ArminSamii/status/1295857106080456706' // also in popup.js
    let text = 'Uber paid you for ' + dataFromStatement.uberPaidForString + ' but the travel distance was actually ' + dataFromGoogle.actualDistanceString + '.<br/><br/>'
    text += '<br/>Want to do something about it? Call UberEATS support, ask for a supervisor, and explain that you were underpaid.'
    text += '<br/>If you need advice getting paid fairly, reach out on <a href=\"' + helpUrlReddit + '\" target=\"_blank\">Reddit</a> or <a href=\"' + helpUrlTwitter + '\" target=\"_blank\">Twitter</a>.'
    setCheated(text, tabId);
  }
}

function logToGoogleAnalytics(dataFromGoogle, dataFromStatement) {
  // Send data to google analytics
  // Include the old, incorrect percent diff calculation to keep data consistent
  let percentDiff = calculatePercentDiff(dataFromGoogle, dataFromStatement);
  let oldPercentDiffCalculation = (dataFromGoogle.actualDistanceFloatMi - dataFromStatement.uberPaidForFloatMi) / dataFromGoogle.actualDistanceFloatMi
  let absoluteDifferenceTimes100 = Math.round((dataFromGoogle.actualDistanceFloatMi - dataFromStatement.uberPaidForFloatMi) * 100);
  ga('send', 'event', 'fairness', 'absoluteDifferenceTimes100', absoluteDifferenceTimes100);
  ga('send', 'event', 'fairness', 'percentDifference', Math.round(oldPercentDiffCalculation * 100));
  ga('send', 'event', 'fairness', 'percentDifferenceCorrected', Math.round(percentDiff * 100));
}

// Callback for when storeAndAnalyzeDistances reads the key.
function computeDataToStoreForSummaryTable(dataFromStatement, dataFromGoogle) {
  var percentDiff = calculatePercentDiff(dataFromStatement, dataFromGoogle);
  return {
    'url': dataFromStatement.tripId,
    'uberPaidForDistance': dataFromStatement.uberPaidForString,
    'actualDistance': dataFromGoogle.actualDistanceString,
    'uberPaidForFloat': dataFromStatement.uberPaidForFloatMi,
    'actualFloat': dataFromGoogle.actualDistanceFloatMi,
    'percentDifference': percentDiff,
    'routeLatLon': {
        'pickupLatLon': [dataFromStatement.routeCoordinates.pickupLat, dataFromStatement.routeCoordinates.pickupLon],
        'dropoffLatLon': [dataFromStatement.routeCoordinates.dropoffLat, dataFromStatement.routeCoordinates.dropoffLon],
    }
  }
}

// Store locally and send to google analytics if this URL is unique
function storeAndAnalyzeDistances(dataFromStatement, dataFromGoogle) {
  var key = 'comparisons_' + dataFromStatement.tripId;
  chrome.storage.sync.get(key, function(data) {
      let newData = computeDataToStoreForSummaryTable(dataFromStatement, dataFromGoogle);
      if (key in data && data[key].percentDifference == newData.percentDifference)
      {
        // Computation hasn't changed, don't send to Google Analytics or store data twice
        console.log('Data already logged, not sending to GA: ' + key);
        return;
      }

      logToGoogleAnalytics(dataFromGoogle, dataFromStatement);

      let storedObject = {};
      storedObject[key] = newData;
      chrome.storage.sync.set(storedObject);
  });
}

// Converts to miles, compares the distances, saves to local cache, and sends to google analytics
function compareDistances(dataFromStatement, dataFromGoogle, tabId) {
  // Analyze the distance and show result to user
  compareDistancesAndSetPopupText(dataFromStatement, dataFromGoogle, tabId);

  // Accumulate data locally and on Google Analytics
  storeAndAnalyzeDistances(dataFromStatement, dataFromGoogle);
}

// Callback for when the Google Maps API returns directions
function callbackDirectionsComplete(response, status, dataFromStatement, tabId) {
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
      // Success! Find the shortest-distance route to give Uber the benefit of the doubt
      let minRouteMeters = 9999999999;
      let legOfShortestRoute = directionsData;
      response.routes.forEach(function(route, routeIndex, array) {
        let thisRouteDistanceMeters = route.legs[0].distance.value
        if (thisRouteDistanceMeters < minRouteMeters)
        {
          minRouteMeters = thisRouteDistanceMeters;
          legOfShortestRoute = route.legs[0];
        }
      });
      let actualDistanceString = legOfShortestRoute.distance.text;
      let actualDistanceFloatMi = distanceStringToMilesFloat(actualDistanceString);
      if (actualDistanceFloatMi == null) {
        //error
        return;
      }
      let dataFromGoogle = new DataFromGoogle(actualDistanceFloatMi, actualDistanceString)

      compareDistances(dataFromStatement, dataFromGoogle, tabId);
    }
  }
}

// Callback for when the content-script finished running and returned data from the page
function callbackFinishedReadingPage(tabId, result) {
  setIcon('loading128.gif', tabId)

  let tripId = result.tripId;

  let pickupLatLon = result.pickupLatLon;
  let dropoffLatLon = result.dropoffLatLon;
  let routeCoordinates = new RouteCoordinates(pickupLatLon[0], pickupLatLon[1], dropoffLatLon[0], dropoffLatLon[1]);

  let uberPaidForString = result.uberPaidForString;
  let uberPaidForFloatMi = distanceStringToMilesFloat(uberPaidForString, tabId);

  if (uberPaidForFloatMi == null) {
    // error
    return;
  }

  let dataFromStatement = new DataFromStatement(uberPaidForFloatMi, uberPaidForString, routeCoordinates, tripId);
  queryGoogleForDistance(dataFromStatement, tabId);
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
      errorMessage += `"Failed to parse the pickup/dropoff locations: ${returnValue}"`
      wereThereErrors = true;
    } else if (!returnValue.uberPaidForString) {
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

module.exports = {DataFromGoogle,
                  DataFromStatement,
                  RouteCoordinates,
                  computeDataToStoreForSummaryTable,
                  distanceStringToMilesFloat,
                  queryGoogleForDistance,
                  runCheatDetector,
                  setError,
                  setIcon,
                  setInfo,
                  setTut,
                  loadGoogleAnalytics}
