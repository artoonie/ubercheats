class GoogleMockDirectionsService {
  constructor() {}
  route(route, callback) {
    let response;
    if (route.waypoints.length > 0) {
      response = this.routeWithWaypoints();
    }
    else {
      response = this.routeWithMultipleResponses();
    }
    let status = "OK";
    callback(response, status);
  }
  routeWithWaypoints() {
    return {
      routes: [{
        legs: [
          {
            distance: {
              value: 1609.34*1, // meters
              text: "1 mi"
            }
          },
          {
            distance: {
              value: 1609.34*2, // meters
              text: "2 mi"
            }
          },
          {
            distance: {
              value: 1609.34*3, // meters
              text: "3 mi"
            }
          }
        ]
      }]
    };
  }
  routeWithMultipleResponses() {
    return {
      routes: [{
        legs: [{
          distance: {
            value: 2*56327, // meters
            text: "70 mi"
          }
        }]
      }, {
        legs: [{
          distance: {
            value: 1*56327, // meters
            text: "35 mi"
          }
        }]
      }, {
        legs: [{
          distance: {
            value: 3*56327, // meters
            text: "105 mi"
          }
        }]
      }]
    };
  }
}

class GoogleMockLatLng {
  constructor(lat, lon) {
    this.lat = lat;
    this.lon = lon;
  }
}

class ChromeStorageMock {
  constructor() {
    this.data = {}
  }
  get(key, callback) {
    if (key == null) {
      callback(this.data);
    }
    // This could also be a list of keys but we don't use that
    if (!(key in this.data)) {
      callback({});
    }

    let data = {}
    data[key] = this.data[key];
    callback(data);
  }
  set(data) {
    for(const key in data) {
      this.data[key] = data[key];
    }
  }
  clear() {
    this.data = {}
  }
}

class ChromePageActionMock {
  constructor() {
  }
  setIcon(data) {
    this.path = data.path
    this.tabId = data.tabId
  }
}

let allAnalytics = []
function googleMockAnalytics(send, event, eventCategory, eventAction, eventLabel, eventValue, fieldsObject) {
  allAnalytics.push([send, event, eventCategory, eventAction, eventLabel, eventValue, fieldsObject]);
}

let googleMockDirections = {
    maps: {
       DirectionsService: GoogleMockDirectionsService,
                  LatLng: GoogleMockLatLng
    }
}

let localChromeStorage = new ChromeStorageMock();
let syncChromeStorage = new ChromeStorageMock();
let pageAction = new ChromePageActionMock();

let chromeMock = {
  storage: {
    sync: syncChromeStorage,
    local: localChromeStorage
  },
  pageAction: pageAction
}

function setupGlobalMocks() {
    global.google = googleMockDirections;
    global.chrome = chromeMock
    global.ga = googleMockAnalytics;
}

function createFakeRoute(bg) {
    let fakePickup = new bg.LatLon(1, 2);
    let fakeDropoff = new bg.LatLon(3, 4);
    let routeCoordinatesFake = new bg.RouteCoordinates(fakePickup);
    routeCoordinatesFake.addDropoff(fakeDropoff);
    return routeCoordinatesFake;
}

module.exports = {localChromeStorage, syncChromeStorage, pageAction, allAnalytics,
                  chromeMock, googleMockDirections, googleMockAnalytics,
                  setupGlobalMocks, createFakeRoute}
