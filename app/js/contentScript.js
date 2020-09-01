class DataFromContentScript {
  constructor(googleImageSource, uberPaidForString, howUberPaidForWasFound, tripId) {
    this.googleImageSource = googleImageSource;
    this.uberPaidForString = uberPaidForString;
    this.howUberPaidForWasFound = howUberPaidForWasFound;
    this.tripId = tripId;
  }
}

// Reads the page sources and returns the google image source which contains the route.
function getGoogleImageSource(dom) {
  images = dom.getElementsByTagName('img')
  let i;
  let googleImageSource = null;
  for (i = 0; i < images.length; i++) {
    if (images[i]['src'].includes('https://maps.googleapis.com')) {
      googleImageSource = images[i]['src'];
  	  break;
    }
  }
  return googleImageSource;
}

// Courtesy of https://stackoverflow.com/a/14284815/1057105
function getElementByXpath(dom, path) {
  return dom.evaluate(path, dom, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

// Read the Uber site for the distance
// Returns a tuple, first the data, second how the data was found for tracking
function readUberPaidForDistance(dom) {
  // e.g. "5.5 mi" or "0.2 km"
  let mileageRegex = /[^0-9]([0-9]+\.?[0-9]*)\s+(mi|km)/g

  // First, try the xpath that works for me
  let element = getElementByXpath(dom, `//*[@id="root"]/div/div/div/div/div/div/div[2]/div/div[4]/div/div[2]/div[2]`)
  if (element && mileageRegex.exec(element.innerHTML))
  {
    return [element.innerHTML, 'by-xpath'];
  }

  // If that doesn't work, try getting the second element by the class name
  durationAndDistanceElements = dom.getElementsByClassName('cu cv');
  if (durationAndDistanceElements.length == 2)
  {
    element = durationAndDistanceElements[1];
    if (element && mileageRegex.exec(element.innerHTML))
    {
      return [element.innerHTML, 'by-classname'];
    }
  }

  // If that doesn't work, try parsing the entire page
  let rootElement = dom.documentElement.innerHTML;
  if (rootElement.length < 100) {
      return [null, 'no-root-element']
  }

  // First look for for e.g. "Distance[...]5.5 mi"
  let regex = /Distance[^0-9]*([0-9]*\.?[0-9]*) (mi|km)/g
  let matches = regex.exec(rootElement)
  if (matches && mileageRegex.exec(element.innerHTML))
  {
    // Return distance + space + mi/km
    return [matches[1] + ` ` + matches[2], 'by-regex']
  }
  // If that doesn't work, just look for "5.5 mi"...this could
  // more easily appear in other formats, but doesn't, so
  // this should be fine as a fallback.
  matches = mileageRegex.exec(rootElement)
  if (matches)
  {
    // Return distance + space + mi/km
    return [matches[1] + ` ` + matches[2], 'by-dangerous-regex']
  }

  return [null, 'wasnt-found'];
}

// Gets the tripId - which, for now, is just the page URL
function getTripId() {
  return window.location.href;
}

// Compute and return all data
function getAllData() {
  let googleImageSource = getGoogleImageSource(document);
  let uberPaidForDistanceTuple = readUberPaidForDistance(document);
  let tripId = getTripId();

  return new DataFromContentScript(
    googleImageSource,
    uberPaidForDistanceTuple[0], uberPaidForDistanceTuple[1],
    tripId);
}

// This gets passed to the executor
getAllData();
