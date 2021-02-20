'use strict';

const { LatLon,
        RouteCoordinates,
        DataFromStatement,
        DataFromGoogle,
        MessageDestination } = require('./classes.js')
const models = require('./models.js');

// Sets the extension icon
function setIcon(iconName, msgDestination) {
  if (msgDestination.frameId == 0) {
    chrome.pageAction.setIcon({
        path: 'icons/' + iconName,
        tabId: msgDestination.tabId
    });
  }
}

// Sets the status using the storage API to pass it to the popup
function _setStatus(className, text, msgDestination, showTutorialVideo) {
  let status = {
    className: className,
    text: text,
    showTutorialVideo: showTutorialVideo
  };
  let key = msgDestination.makeKeyFor();
  let storedObject = {}
  storedObject[key] = status
  chrome.storage.local.set(storedObject);
}

// Sets an error message
function setError(errorMessage, msgDestination) {
  console.log('Error: ' + errorMessage)

  setIcon('error.png', msgDestination);
  let text = '<strong>Encountered an error.</strong><br/>';
  text += errorMessage;
  text += '<br/><br/>Please contact the developer at ubercheats@arminsamii.com to address this.';
  _setStatus('warning', text, msgDestination, true)
}

// Sets a tutorial message
function setTut(message, msgDestination) {
  message = 'Next step: ' + message
  _setStatus('info', message, msgDestination, true)
}

// Sets an info message
function setInfo(message, msgDestination) {
  _setStatus('info', message, msgDestination, false)
}

// Sets a message signifying UberEats paid you fairly
function setAcceptable(message, msgDestination) {
  setIcon('acceptable.png', msgDestination);
  _setStatus('acceptable', message, msgDestination, false)
}

// Sets a message signifying UberEats underpaid you
function setCheated(message, msgDestination) {
  setIcon('cheated.png', msgDestination);
  _setStatus('cheated', message, msgDestination, false)
}

// Returns the latitude/longitude given a google maps image URL
// Finds the lat/lon directly preceded by preceededRegex
function getLatLonPrecededBy(preceededRegex, googleImageSource) {
  var numberRegex = '[-]?[0-9]*';
  var latOrLonRegex = '(' + numberRegex + '.' + numberRegex + ')';
  var latAndLonRegex = latOrLonRegex + '[%0-9]*C' + latOrLonRegex;
  var pickupRegex = new RegExp(preceededRegex + latAndLonRegex, 'g');
  var match = pickupRegex.exec(googleImageSource);
  if (!match) {
    return null;
  }
  var pickupLatitude = match[1];
  var pickupLongitude = match[2];
  return new LatLon(pickupLatitude, pickupLongitude);
}

function googleImageSourceToRoute(googleImageSource) {
  // Regex match the source URL, which looks like:
  // https://[...]car-pickup-pin.png%7Cscale%3A2%7C11.11111111111111%2C-11.11111111111111&[...]
  //             car-dropoff-pin.png%7Cscale%3A2%7C22.22222222222222%2C-22.22222222222222 // last dropoff
  //                                            %7C33.33333333333333%2C-33.33333333333333&[...] // additional dropoff (waypoint)
  // We have also seen: ...cloudfront.net%252Fmaps%252Fhelix%252Fpickup.png%257Cscale%253A2%257C25.0402312579%252C121.5575271548...
  let imagesource = googleImageSource;
  let pickupLatLon = getLatLonPrecededBy(     'pickup[^.]*.png[%0-9]*Cscale[^.]*7C', imagesource);
  let endDropoffLatLon = getLatLonPrecededBy('dropoff[^.]*.png[%0-9]*Cscale[^.]*7C', imagesource);
  let additionalDropoff = getLatLonPrecededBy(endDropoffLatLon.lon + '%7C', imagesource);

  let route = new RouteCoordinates(pickupLatLon);
  if (additionalDropoff) {
    route.addDropoff(additionalDropoff);
  }
  route.addDropoff(endDropoffLatLon);

  return route;
}

function makeGoogleRouteFrom(routeCoordinates) {
  let numDropoffs = routeCoordinates.getNumDropoffLocations();

  let waypoints = [];
  for (let i = 0; i < numDropoffs-1; ++i) {
    waypoints.push({
      location: routeCoordinates.getGoogleDropoff(i),
      stopover: true
    });
  }

  let route = {
    origin: routeCoordinates.getGooglePickup(),
    destination: routeCoordinates.getGoogleDropoff(numDropoffs-1),
    waypoints: waypoints,
    travelMode: 'DRIVING'
  }
  return route;
}

// Queries Google Maps for the distance between the start and end points,
// then asynchronously compares that value to what UberEats paid you for
// If there are dropoffs, asks google to try multiple possible routes
// nextSleepTimeoutMs: if we are over the limit, how long should we wait til we
// query google again?
function queryGoogleForDistance(dataFromStatement, msgDestination, nextSleepTimeoutMs=500) {
  let coords0 = dataFromStatement.routeCoordinates;
  let coords1 = dataFromStatement.routeCoordinates.getReversedDropoffRoute();

  let directionsService = new google.maps.DirectionsService();
  let start = coords0.getGooglePickup(); // same for both coords0 and coords1

  let numDropoffs = coords0.getNumDropoffLocations();
  let needsToCompareTwoRoutes = numDropoffs > 1;

  // TODO this does not support all permutations of waypoints
  let route0 = makeGoogleRouteFrom(coords0);
  let route1 = makeGoogleRouteFrom(coords1); // might not be used

  setInfo('Reaching out to Google to compute the distance ' + coords0, msgDestination);

  var firstResponse = null;
  let callback = function(response, status) {
    if (status == 'OVER_QUERY_LIMIT') {
      setTimeout(() => {
        console.log('Sleeping for ' + nextSleepTimeoutMs + 'ms to avoid OVER_QUERY_LIMIT');
        queryGoogleForDistance(dataFromStatement, msgDestination, nextSleepTimeoutMs*2);
      }, nextSleepTimeoutMs);
      return;
    }

    if (firstResponse === null) {
      firstResponse = getDataFromGoogleResponse(response, status, msgDestination);

      // Don't wait for the second response if not needed
      if (!needsToCompareTwoRoutes) {
        compareDistances(dataFromStatement, firstResponse, msgDestination);
      }
    } else {
      const secondResponse = getDataFromGoogleResponse(response, status, msgDestination);

      if (firstResponse.actualDistanceFloatMi < secondResponse.actualDistanceFloatMi) {
        compareDistances(dataFromStatement, firstResponse, msgDestination);
      } else {
        compareDistances(dataFromStatement, secondResponse, msgDestination);
      }
    }
  }

  directionsService.route(route0, callback);

  if (needsToCompareTwoRoutes) {
    directionsService.route(route1, callback);
  }
}

// Converts "1.2 mi" or "6 km" to the float equivalent in miles
function distanceStringToMilesFloat(distanceString, msgDestination) {
  var mileageRegex = new RegExp('([0-9]*\.?[0-9]*) (mi|km)', 'g');
  
  // Get the uber match
  var match = mileageRegex.exec(distanceString);

  // Error handling: This shouldn't happen.
  if (!match || match.length < 2)
  {
    setError('Could not parse mileages:<br/>' +
             '<br/>string=' + distanceString +
             '<br/>match=' + match,
             msgDestination);
    return null;
  }

  let floatValueMiOrKm = parseFloat(match[1])

  // Error handling: This shouldn't happen.
  if (isNaN(floatValueMiOrKm))
  {
    setError('Could not parse float for: ' + match[1], msgDestination);
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
  if (dataFromGoogle.actualDistanceFloatMi == undefined || dataFromStatement.uberPaidForFloatMi == undefined) {
    throw new Error('Should never get to this calculation with undefined data');
  }
  return (dataFromGoogle.actualDistanceFloatMi - dataFromStatement.uberPaidForFloatMi) / dataFromStatement.uberPaidForFloatMi;
}

// Using the provided distances, determines what message and icon should be shown to the user
function compareDistancesAndSetPopupText(dataFromStatement, dataFromGoogle, msgDestination) {
  var percentDiff = calculatePercentDiff(dataFromStatement, dataFromGoogle);
  if (dataFromGoogle.actualDistanceFloatMi <= dataFromStatement.uberPaidForFloatMi) {
    setAcceptable('As best I can tell, you were paid fairly.', msgDestination);
  } else if (percentDiff < 0.10) {
    setAcceptable(`You were underpaid by less than 10% - I don't see a problem here, probably just the difference between Uber and Google's algorithms.`, msgDestination);
  } else {
    let helpUrlReddit = 'https://www.reddit.com/r/UberEATS/comments/icdu0y/ubercheats_is_now_live_check_if_ubereats_has/' // also in popup.js
    let helpUrlTwitter = 'https://twitter.com/ArminSamii/status/1295857106080456706' // also in popup.js
    let text = 'Uber paid you for ' + dataFromStatement.uberPaidForString + ' but the travel distance was actually ' + dataFromGoogle.actualDistanceString + '.<br/><br/>'
    text += '<br/>Want to do something about it? Call UberEATS support, ask for a supervisor, and explain that you were underpaid.'
    text += '<br/>If you need advice getting paid fairly, reach out on <a href=\"' + helpUrlReddit + '\" target=\"_blank\">Reddit</a> or <a href=\"' + helpUrlTwitter + '\" target=\"_blank\">Twitter</a>.'
    setCheated(text, msgDestination);
  }
}

function logToGoogleAnalytics(dataFromStatement, dataFromGoogle) {
  // Send data to google analytics
  // Include the old, incorrect percent diff calculation to keep data consistent
  let percentDiff = calculatePercentDiff(dataFromStatement, dataFromGoogle);
  let oldPercentDiffCalculation = (dataFromGoogle.actualDistanceFloatMi - dataFromStatement.uberPaidForFloatMi) / dataFromGoogle.actualDistanceFloatMi
  let absoluteDifferenceTimes100 = Math.round((dataFromGoogle.actualDistanceFloatMi - dataFromStatement.uberPaidForFloatMi) * 100);
  ga('send', 'event', 'fairness', 'absoluteDifferenceTimes100', absoluteDifferenceTimes100);
  ga('send', 'event', 'fairness', 'percentDifference', Math.round(oldPercentDiffCalculation * 100));
  ga('send', 'event', 'fairness', 'percentDifferenceCorrected', Math.round(percentDiff * 100));


  // Use the custom metrics
  ga('set', 'metric1', absoluteDifferenceTimes100);
}

// Callback for when storeAndAnalyzeDistances reads the key.
function computeDataToStoreForSummaryTable(dataFromStatement, dataFromGoogle) {
  var percentDiff = calculatePercentDiff(dataFromStatement, dataFromGoogle);
  return new models.StoredData_V0_5(dataFromStatement, dataFromGoogle, percentDiff)
}

// Store locally and send to google analytics if this URL is unique
function storeAndAnalyzeDistances(dataFromStatement, dataFromGoogle) {
  var key = 'comparisons_' + dataFromStatement.tripId;
  chrome.storage.local.get(key, function(data) {
      let newData = computeDataToStoreForSummaryTable(dataFromStatement, dataFromGoogle);
      if (key in data && data[key].percentDifference == newData.percentDifference)
      {
        // Computation hasn't changed, don't send to Google Analytics or store data twice
        return;
      }

      logToGoogleAnalytics(dataFromStatement, dataFromGoogle);

      let storedObject = {};
      storedObject[key] = newData;
      chrome.storage.local.set(storedObject);
  });
}

// Converts to miles, compares the distances, saves to local cache, and sends to google analytics
function compareDistances(dataFromStatement, dataFromGoogle, msgDestination) {
  // Analyze the distance and show result to user
  compareDistancesAndSetPopupText(dataFromStatement, dataFromGoogle, msgDestination);

  // Accumulate data locally and on Google Analytics
  storeAndAnalyzeDistances(dataFromStatement, dataFromGoogle);
}

function getTotalDistanceOfAllLegsMeters(legs) {
  return legs.reduce((totalDistance, leg) => totalDistance + leg.distance.value, 0);
}

function metersToMiles(meters) {
  return meters / 1609.34;
}

// Callback for when the Google Maps API returns directions
function getDataFromGoogleResponse(response, status, msgDestination) {
  setInfo('Directions request received from google.', msgDestination)

  if (status !== 'OK') {
    let msg = 'Directions request failed due to ' + status;
    setError(msg, msgDestination);
    throw new Error(msg);
  }

  let legs = response.routes[0].legs; // Get data about the mapped route
  if (!legs) {
    let msg = 'Directions request failed';
    setError(msg, msgDestination);
    throw new Error(msg);
  }

  // Success! Find the shortest-distance route to give Uber the benefit of the doubt
  let bignumber = 9999999999;
  let minRouteMeters = bignumber;
  let legsOfShortestRoute = legs;
  response.routes.forEach(function(route, routeIndex, array) {
    let thisRouteDistanceMeters = getTotalDistanceOfAllLegsMeters(route.legs);
    if (thisRouteDistanceMeters < minRouteMeters) {
      minRouteMeters = thisRouteDistanceMeters;
      legsOfShortestRoute = route.legs;
    }
  });
  if (minRouteMeters == bignumber) {
    // Nothing happened in loop - this is an error
    let msg = 'Could not find a valid route from google maps';
    setError(msg, msgDestination);
    throw new Error(msg);
  }

  let actualDistanceString = legsOfShortestRoute.map(leg => leg.distance.text).join(' + ')
  let actualDistanceFloatMi = metersToMiles(minRouteMeters);
  let dataFromGoogle = new DataFromGoogle(actualDistanceFloatMi, actualDistanceString)

  if(actualDistanceString == undefined) {
    let msg = 'Bad data returned from Google from leg count ' + legsOfShortestRoute.length;
    setError(msg, msgDestination);
    throw new Error(msg);
  }
  if(actualDistanceFloatMi == undefined) {
    let msg = 'Could not parse float from ' + minRouteMeters + ' meters';
    setError(msg, msgDestination);
    throw new Error(msg);
  }

  return dataFromGoogle;
}

// Callback for when the content-script finished running and returned data from the page
function callbackFinishedReadingPage(msgDestination, result) {
  console.log('finished reading page');
  setIcon('loading128.gif', msgDestination)

  let tripId = result.tripId;

  let route = googleImageSourceToRoute(result.googleImageSource);
  let uberPaidForString = result.uberPaidForString;
  let uberPaidForFloatMi = distanceStringToMilesFloat(uberPaidForString, msgDestination);

  if (!uberPaidForString) {
    let msg = 'string from image was invalid: ' + uberPaidForString;
    setError(msg, msgDestination);
    throw new Error(msg);
  }
  if (!uberPaidForFloatMi) {
    let msg = 'mileage parsing was invalid';
    setError(msg, msgDestination);
    throw new Error(msg);
  }

  let dataFromStatement = new DataFromStatement(uberPaidForFloatMi, uberPaidForString, route, tripId);
  queryGoogleForDistance(dataFromStatement, msgDestination);
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
function handleErrorsFromContentScript(msgDestination, returnValue) {
  let errorMessage = 'Could not find the data we were looking for on this page. '
  errorMessage += `If you're okay with it, can you hit Ctrl+S to save the page data, `
  errorMessage += 'then attach it in an email to the developer, along with this message:'
  errorMessage += '<br/><br/>'
  
  let wereThereErrors = false;
  if (!returnValue) {
    errorMessage += '"Failed to parse anything"'
    wereThereErrors = true;
  } else {
    if (!returnValue.googleImageSource) {
      errorMessage += `"Failed to parse the google maps image source"`
      wereThereErrors = true;
    } else if (!returnValue.uberPaidForString) {
      errorMessage += '"Failed to parse the distance"'
      wereThereErrors = true;
    }
  }

  if (wereThereErrors) {
    setError(errorMessage, msgDestination);
  }

  return wereThereErrors;
}

// Runs the end-to-end cheat detector for a single trip
function runCheatDetectorOnTrip(msgDestination) {
  chrome.tabs.executeScript(
      msgDestination.tabId,
      {
       file: 'js/contentScript.js',
       runAt: 'document_idle',
       frameId: msgDestination.frameId
      },
      function(result) {
        let returnValue = result[0];

        handleAnalyticsFromContentScript(returnValue);
        let wereThereErrors = handleErrorsFromContentScript(msgDestination, returnValue);
        if (!wereThereErrors) {
          callbackFinishedReadingPage(msgDestination, returnValue);
        }
      }
  )
}

// Runs the end-to-end cheat detector for a single trip
function runCheatDetectorOnStatement(msgDestination) {
  chrome.tabs.executeScript(
      msgDestination.tabId,
      {
       file: 'js/contentScriptStatement.js',
       runAt: 'document_idle',
       frameId: msgDestination.frameId
      },
      function(result) {
        let returnValue = result[0];
        let numTrips = returnValue.length;
        let messageString = `Found ${numTrips} trips in this statement.<br/>Note: you no longer need to click each trip in this statement.`;
        setInfo(messageString, msgDestination);
      }
  )
}

module.exports = {DataFromGoogle,
                  DataFromStatement,
                  MessageDestination,
                  RouteCoordinates,
                  LatLon,
                  computeDataToStoreForSummaryTable,
                  distanceStringToMilesFloat,
                  googleImageSourceToRoute,
                  queryGoogleForDistance,
                  runCheatDetectorOnTrip,
                  runCheatDetectorOnStatement,
                  setError,
                  setIcon,
                  setInfo,
                  setTut}
