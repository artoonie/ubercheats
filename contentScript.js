// Returns the latitude/longitude given a google maps image URL
// pinImageSource is either car-pickup-pin.png or car-dropoff-pin.png
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

// Reads the page sources and returns a tuple of tuples representing the lat/lon coordinatens
// of the pickup and dropoff locations.
function computePickupDropoff()
{
  console.log("Computing pickup dropoff coords");
  images = document.getElementsByTagName('img')
  let i;
  let googleimage;
  for (i = 0; i < images.length; i++) {
    if (images[i]['src'].includes('https://maps.googleapis.com')) {
  	  googleimage = images[i];
  	  break;
    }
  }

  // Regex match the source URL, which looks like:
  // https://[...]car-pickup-pin.png%7Cscale%3A2%7C11.11111111111111%2C-11.11111111111111&[...]
  //             car-dropoff-pin.png%7Cscale%3A2%7C22.22222222222222%2C-22.22222222222222&[...]
  var imagesource = googleimage['src'];
  var pickupLatLon = getLatLonFor('car-pickup-pin.png', imagesource);
  var dropoffLatLon = getLatLonFor('car-dropoff-pin.png', imagesource);

  console.log("Returning " + [pickupLatLon, dropoffLatLon])
  return [pickupLatLon, dropoffLatLon]
}

// Courtesy of https://stackoverflow.com/a/14284815/1057105
function getElementByXpath(path) {
  return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

function readUberPaidForDistance()
{
  element = getElementByXpath('//*[@id="root"]/div/div/div/div/div/div/div[2]/div/div[4]/div/div[2]/div[2]')
  return element.innerHTML;
}

function getAllData()
{
  pickupDropoff = computePickupDropoff();
  uberPaidForDistance = readUberPaidForDistance();
  return {
    'pickupLatLon': pickupDropoff[0],
    'dropoffLatLon': pickupDropoff[1],
    'uberPaidForDistance': uberPaidForDistance
  }
}
// This gets returned to the executor
getAllData();
