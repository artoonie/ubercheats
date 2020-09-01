// Models stored in chrome.storage.sync, that requires migrations between application versions

// Original data storage
class StoredData_V0_4 {
  constructor(dataFromStatement, dataFromGoogle, percentDiff) {
    this.url = dataFromStatement.tripId;
    this.uberPaidForDistance = dataFromStatement.uberPaidForString;
    this.actualDistance = dataFromGoogle.actualDistanceString;
    this.uberPaidForFloat = dataFromStatement.uberPaidForFloatMi;
    this.actualFloat = dataFromGoogle.actualDistanceFloatMi;
    this.percentDifference = percentDiff;
    this.routeLatLon = {
        'pickupLatLon': [dataFromStatement.routeCoordinates.pickupLatLon.lat, dataFromStatement.routeCoordinates.pickupLatLon.lon],
        'dropoffLatLon': [dataFromStatement.routeCoordinates.dropoffLatLons[0].lat, dataFromStatement.routeCoordinates.dropoffLatLons[0].lon],
    }
  }
}

// Migration: better names, multiple dropoffs
class StoredData_V0_5 {
  constructor(dataFromStatement, dataFromGoogle, percentDiff) {
    if (arguments.length == 1) {
      // Assume it's a migration instead
      let v04 = dataFromStatement;
      this.init_from_v04(v04);
      return;
    }

    this.version = '0.5';
    this.url = dataFromStatement.tripId;
    this.uberPaidForString = dataFromStatement.uberPaidForString;
    this.actualDistanceString = dataFromGoogle.actualDistanceString;
    this.uberPaidForFloatMi = dataFromStatement.uberPaidForFloatMi;
    this.actualDistanceFloatMi = dataFromGoogle.actualDistanceFloatMi;
    this.percentDifference = percentDiff;
    this.route = {
        'pickupLatLon': [dataFromStatement.routeCoordinates.pickupLatLon.lat, dataFromStatement.routeCoordinates.pickupLatLon.lon],
        'dropoffLatLons': dataFromStatement.routeCoordinates.dropoffLatLons.map(x => [x.lat, x.lon]),
    }
  }

  init_from_v04(v04) {
    this.version = '0.5';
    this.url = v04.url;
    this.uberPaidForString = v04.uberPaidForDistance;
    this.actualDistanceString = v04.actualDistance;
    this.uberPaidForFloatMi = v04.uberPaidForFloat;
    this.actualDistanceFloatMi = v04.actualFloat;
    this.percentDifference = v04.percentDifference;
    this.route = {
      'pickupLatLon': v04.routeLatLon.pickupLatLon,
      'dropoffLatLons': [v04.routeLatLon.dropoffLatLon]
    }
  }
}

function migrateToLatest(data) {
  let version = '0.4'
  if ('version' in data) {
    version = data.version;
  }

  if (version == '0.5') {
    return data;
  }

  // Run migrations - for now, only one, but more can be added
  return new StoredData_V0_5(data);
}

module.exports = {StoredData_V0_4, StoredData_V0_5, migrateToLatest}
