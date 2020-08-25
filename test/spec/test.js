const m = require('./mocks.js');
const bg = require('../../app/js/background-functions.js');

describe('Test background', () => {
  it('Check the data sent to popup - which must not change to maintain backwards compatibility', () => {
    let routeCoordinatesFake = new bg.RouteCoordinates(1, 2, 3, 4);
    let dataFromStatement = new bg.DataFromStatement(1.0, "2.2 km", routeCoordinatesFake, "http://fake/tripid/0");
    let dataFromGoogle = new bg.DataFromGoogle(5.5, "5.5 mi");
    let data = bg.computeDataToStoreForSummaryTable(dataFromStatement, dataFromGoogle);
    expect(data.url).toEqual("http://fake/tripid/0");
    expect(data.percentDifference).toBeGreaterThan(1.1); // the threshold at which we complain
    expect(data.actualFloat).toEqual(5.5);
    expect(data.uberPaidForFloat).toEqual(1.0);
    expect(data.routeLatLon).toEqual({
        pickupLatLon: [1, 2],
        dropoffLatLon: [3, 4]
    });
  }),
  it('Check conversion from km to mi', () => {
    expect(bg.distanceStringToMilesFloat("5.5 mi", 0)).toEqual(5.5);
    expect(Math.abs(bg.distanceStringToMilesFloat("1.609334 km", 0)-1.0)).toBeLessThan(.001);
    expect(Math.abs(bg.distanceStringToMilesFloat("1 mi", 0)-1.0)).toBeLessThan(.001);
    expect(Math.abs(bg.distanceStringToMilesFloat("0.1 mi", 0)-0.1)).toBeLessThan(.001);
  }),
  it('Check google API calls correctly identify cheated vs acceptable', () => {
    m.setupGlobalMocks();

    // Fake coordinates
    let routeCoordinates = new bg.RouteCoordinates(40.106507, -79.578185, 39.673911, -79.865928);
    let tripId = "http://fake/id/"
    let dataFromStatement = new bg.DataFromStatement(32.5, "32.5 mi", routeCoordinates, tripId);

    // Query google (with fake, synchronous callbacks)
    bg.queryGoogleForDistance(dataFromStatement, 0);

    // This should be marked as acceptable: 32.5 miles is within 10% of what we expect (35)
    expect(m.localChromeStorage.data.tab0.className).toEqual("acceptable");
    expect(m.pageAction.path).toEqual('icons/acceptable.png')

    // Query google again, with 25 mi / 40.23 km
    dataFromStatement = new bg.DataFromStatement(25, "40.2 km", routeCoordinates, tripId);
    bg.queryGoogleForDistance(dataFromStatement, 0);

    // This should be marked as cheated: 25 miles is more than 10% away
    expect(m.localChromeStorage.data.tab0.className).toEqual("cheated");
    expect(m.pageAction.path).toEqual('icons/cheated.png')
  }),
  it('Check that multiple instances of the same data is not stored twice, and no analytics sent', () => {
    m.setupGlobalMocks();

    // Fake coordinates
    let routeCoordinatesFake = new bg.RouteCoordinates(1, 2, 3, 4);
    let tripId = "http://fake/id/";
    let key = "comparisons_" + tripId;
    let dataFromStatement1 = new bg.DataFromStatement(32.501, "32.5 mi", routeCoordinatesFake, tripId);
    let dataFromStatement2 = new bg.DataFromStatement(32.5,   "32.5 mi", routeCoordinatesFake, tripId);

    // Query google
    bg.queryGoogleForDistance(dataFromStatement1, 0);
    m.syncChromeStorage.data[key].customFieldToEnsureNotOverridden = true
    expect(m.syncChromeStorage.data[key].customFieldToEnsureNotOverridden).toEqual(true);
    let numAnalytics = m.allAnalytics.length;

    // Query again - ensure data is not overridden, and no analytics sent
    bg.queryGoogleForDistance(dataFromStatement1, 0);
    expect(m.syncChromeStorage.data[key].customFieldToEnsureNotOverridden).toEqual(true);
    expect(m.allAnalytics.length).toEqual(numAnalytics);

    // Query with a slightly different value - ensure data is overridden, and analytics sent
    bg.queryGoogleForDistance(dataFromStatement2, 0);
    expect(m.syncChromeStorage.data[key].customFieldToEnsureNotOverridden).toEqual(undefined);
    expect(m.allAnalytics.length).toBeGreaterThan(numAnalytics);
  });
})
