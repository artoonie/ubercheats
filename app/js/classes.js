// Models only used during local runs of the app, and doesn't need to be syncd across application runs

class LatLon {
  constructor(lat, lon) {
    this.lat = lat;
    this.lon = lon;
  }
  toString() {
    return `(${this.lat}, ${this.lon})`
  }
}

class RouteCoordinates {
  constructor(pickupLatLon) {
    this.pickupLatLon = pickupLatLon
    this.dropoffLatLons = []
  }
  addDropoff(dropoffLatLon) {
    this.dropoffLatLons.push(dropoffLatLon);
  }
  getGooglePickup() {
    return new google.maps.LatLng(parseFloat(this.pickupLatLon.lat), parseFloat(this.pickupLatLon.lon));
  }
  getGoogleDropoff(i) {
    let n = this.getNumDropoffLocations();
    if (i >= n) {
      console.log(`Invalid dropoff location #${i} requested, but only have ${n} available.`)
      return null;
    }
    return new google.maps.LatLng(parseFloat(this.dropoffLatLons[i].lat), parseFloat(this.dropoffLatLons[i].lon));
  }
  getNumDropoffLocations() {
    return this.dropoffLatLons.length;
  }
  toString() {
    let dropoffString = this.dropoffLatLons.reduce((dropoffString, currDropoff) => dropoffString + ' to ' + currDropoff, '');
    return `From ${this.pickupLatLon} ${dropoffString}`
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

class MessageDestination {
  constructor(tabId, frameId) {
    this.tabId = tabId;
    this.frameId = frameId;
  }

 makeKeyFor() {
   return 'tab' + this.tabId + '_' + this.frameId;
 }
}

module.exports = {
  LatLon,
  RouteCoordinates,
  DataFromStatement,
  DataFromGoogle,
  MessageDestination
}
