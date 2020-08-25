class GoogleMockDirectionsService {
  constructor() {}
  route(route, callback) {
    let response = {routes: [{
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
    let status = "OK";
    callback(response, status);
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

function googleMockAnalytics(send, event, eventCategory, eventAction, eventLabel, eventValue, fieldsObject) {
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

module.exports = {localChromeStorage, syncChromeStorage, pageAction,
                  chromeMock, googleMockDirections, googleMockAnalytics,
                  setupGlobalMocks}
