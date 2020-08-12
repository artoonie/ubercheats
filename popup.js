let changeColor = document.getElementById('changeColor');
let bkg = chrome.extension.getBackgroundPage();

chrome.storage.sync.get('color', function(data) {
  changeColor.style.backgroundColor = data.color;
  changeColor.setAttribute('value', data.color);
});













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

function isDistanceBetweenAccurate(startLatLon, endLatLon, uberPaidForDistance) {
  bkg.console.log("Computing distance between coordinates " + startLatLon + " and " + endLatLon);

  let directionsService = new google.maps.DirectionsService();
  let start = new google.maps.LatLng(parseFloat(startLatLon[0]), parseFloat(startLatLon[1]));
  let end = new google.maps.LatLng(parseFloat(endLatLon[0]), parseFloat(endLatLon[1]));

  const route = {
    origin: start,
    destination: end,
    travelMode: 'DRIVING'
  }

  directionsService.route(route, function(response, status) {
    callbackDirectionsComplete(response, status, uberPaidForDistance);
  });
}

function compareDistances(actualDistance, uberPaidForDistance) {
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
    window.alert(uberPaidForDistance)
    window.alert("Could not parse mileages:\n" +
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
    window.alert("As best I can tell, you were paid fairly.");
  }
  else
  {
    window.alert("Uber paid you for " + uberPaidForDistance + " but you actually drove for " + actualDistance);
  }
}

function callbackDirectionsComplete(response, status, uberPaidForDistance) {
  bkg.console.log("Directions request received from google.")

  if (status !== 'OK') {
    window.alert('Directions request failed due to ' + status);
    return -1;
  } else {
    var directionsData = response.routes[0].legs[0]; // Get data about the mapped route
    if (!directionsData) {
      window.alert('Directions request failed');
      return -1;
    }
    else {
      // Success!
      actualDistance = directionsData.distance.text;
      compareDistances(actualDistance, uberPaidForDistance)
    }
  }
}

var isLoadingComplete = false;
window.googleAPiFinishedLoadingCallback = function() {
  isLoadingComplete = true;
}

  changeColor.onclick = function(element) {
    let color = element.target.value;
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      bkg.console.log("Trying to execute script");
      if (!isLoadingComplete)
      {
        bkg.console.log("TODO not loaded yet- make a loading icon or sumn");
        return;
      }
      chrome.tabs.executeScript(
          tabs[0].id,
          {file: 'contentScript.js'},
          function(result) {
            actualResult = result[0];
            pickupLatLon = actualResult['pickupLatLon'];
            dropoffLatLon = actualResult['dropoffLatLon'];
            uberPaidForDistance = actualResult['uberPaidForDistance']
            actualDistance = isDistanceBetweenAccurate(pickupLatLon, dropoffLatLon, uberPaidForDistance);
          }
      )
    });
  };
