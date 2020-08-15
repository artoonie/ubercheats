// Returns the latitude/longitude given a google maps image URL
// pinImageSource is either car-pickup-pin.png or car-dropoff-pin.png
function getLatLonFor(pinImageSource, googleMapsImageSource) {
  var numberRegex = '[-]?[0-9]*'
  var latOrLonRegex = '(' + numberRegex + '.' + numberRegex + ')'
  var latAndLonRegex = latOrLonRegex + '%2C' + latOrLonRegex
  var pickupRegex = new RegExp(pinImageSource + '%7Cscale%3A2%7C' + latAndLonRegex, 'g');
  var match = pickupRegex.exec(googleMapsImageSource)
  var pickupLatitude = match[1]
  var pickupLongitude = match[2]
  return [pickupLatitude, pickupLongitude]
}

// Reads the page sources and returns a tuple of tuples representing the lat/lon coordinatens
// of the pickup and dropoff locations.
function computePickupDropoff()
{
  images = document.getElementsByTagName('img')
  let i;
  let googleimage = [];
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

  return [pickupLatLon, dropoffLatLon]
}

// Courtesy of https://stackoverflow.com/a/14284815/1057105
function getElementByXpath(path) {
  return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

// Read the Uber site for the distance
// Returns a tuple, first the data, second how the data was found for tracking
function readUberPaidForDistance()
{
  // First, try the xpath that works for me
  let element = getElementByXpath(`//*[@id="root"]/div/div/div/div/div/div/div[2]/div/div[4]/div/div[2]/div[2]`)
  if (element)
  {
    return [element.innerHTML, 'by-xpath'];
  }

  // If that doesn't work, try getting the second element by the class name
  durationAndDistanceElements = document.getElementsByClassName('cu cv');
  if (durationAndDistanceElements.length == 2)
  {
    element = durationAndDistanceElements[1];
    if (element)
    {
      return [element.innerHTML, 'by-classname'];
    }
  }

  // If that doesn't work, try parsing the entire page
  let rootElement = document.documentElement.innerHTML;
  if (rootElement.length < 100) {
      return [null, 'no-root-element']
  }

  // First look for for e.g. "Distance[...]5.5 mi"
  let regex = /Distance[^0-9]*([0-9]*\.?[0-9]*) (mi|km)/g
  let matches = regex.exec(rootElement)
  if (matches)
  {
    // Return distance + space + mi/km
    return [matches[1] + ` ` + matches[2], 'by-regex']
  }
  // If that doesn't work, just look for "5.5 mi"...this could
  // more easily appear in other formats, but doesn't, so
  // this should be fine as a fallback.
  regex = /[^0-9]([0-9]+\.?[0-9]*)\s+(mi|km)/g
  matches = regex.exec(rootElement)
  if (matches)
  {
    // Return distance + space + mi/km
    return [matches[1] + ` ` + matches[2], 'by-dangerous-regex']
  }

    { 
      let strippedString = document.documentElement.innerHTML.replace(/</gi, "&lt;");
      strippedString = strippedString.replace(/>/gi, "&gt;");
      document.documentElement.innerHTML = `Could not parse the distance! Please send this to Armin: <html><pre>${strippedString}</pre></html>`
    }

  return [null, 'wasnt-found'];
}

// Compute and return all data
function getAllData()
{
  let pickupDropoff = computePickupDropoff();
  let uberPaidForDistanceTuple = readUberPaidForDistance();

  return {
    'pickupLatLon': pickupDropoff[0],
    'dropoffLatLon': pickupDropoff[1],
    'uberPaidForDistance': uberPaidForDistanceTuple[0],
    'howUberPaidForWasFound': uberPaidForDistanceTuple[1],
  }
}
// This gets returned to the executor
getAllData();
