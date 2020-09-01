const m = require('./mocks.js');
const bg = require('../../app/js/background-functions.js');
const models = require('../../app/js/models.js');

describe('Test background', () => {
  it('Check the data sent to popup - which must not change to maintain backwards compatibility', () => {
    let routeCoordinatesFake = m.createFakeRoute(bg);
    let dataFromStatement = new bg.DataFromStatement(1.0, "2.2 km", routeCoordinatesFake, "http://fake/tripid/0");
    let dataFromGoogle = new bg.DataFromGoogle(5.5, "5.5 mi");
    let data = bg.computeDataToStoreForSummaryTable(dataFromStatement, dataFromGoogle);
    expect(data.url).toEqual("http://fake/tripid/0");
    expect(data.percentDifference).toBeGreaterThan(1.1); // the threshold at which we complain
    expect(data.actualDistanceFloatMi).toEqual(5.5);
    expect(data.uberPaidForFloatMi).toEqual(1.0);
    expect(data.route).toEqual({
        pickupLatLon: [1, 2],
        dropoffLatLons: [[3, 4]]
    });
  }),
  it('Check conversion from km to mi', () => {
    expect(bg.distanceStringToMilesFloat("5.5 mi", 0)).toEqual(5.5);
    expect(Math.abs(bg.distanceStringToMilesFloat("1.609334 km", 0)-1.0)).toBeLessThan(.001);
    expect(Math.abs(bg.distanceStringToMilesFloat("1 mi", 0)-1.0)).toBeLessThan(.001);
    expect(Math.abs(bg.distanceStringToMilesFloat("0.1 mi", 0)-0.1)).toBeLessThan(.001);
  }),
  it('Check that google maps URLs are correctly parsed', () => {
    let singlestopUrl = `https://maps.googleapis.com/maps/api/staticmap?size=360x100&markers=%7Canchor%3Abottom%7Cicon%3Ahttps%3A%2F%2Fd1a3f4spazzrp4.cloudfront.net%2Fmaps%2Fhelix%2Fcar-pickup-pin.png%7Cscale%3A2%7C22.2222222222%2C-11.1111111111%7C22.2222222222%2C-11.1111111111&markers=%7Canchor%3Abottom%7Cicon%3Ahttps%3A%2F%2Fd1a3f4spazzrp4.cloudfront.net%2Fmaps%2Fhelix%2Fcar-dropoff-pin.png%7Cscale%3A2%7C33.3333333333%2C-44.4444444444&path=color%3A0x2DBAE4%`
    let multistopUrl = `https://maps.googleapis.com/maps/api/staticmap?size=360x100&markers=%7Canchor%3Abottom%7Cicon%3Ahttps%3A%2F%2Fd1a3f4spazzrp4.cloudfront.net%2Fmaps%2Fhelix%2Fcar-pickup-pin.png%7Cscale%3A2%7C22.2222222222%2C-11.1111111111%7C22.2222222222%2C-11.1111111111&markers=%7Canchor%3Abottom%7Cicon%3Ahttps%3A%2F%2Fd1a3f4spazzrp4.cloudfront.net%2Fmaps%2Fhelix%2Fcar-dropoff-pin.png%7Cscale%3A2%7C33.3333333333%2C-44.4444444444%7C55.555555%2C-66.666666&path=color%3A0x2DBAE4%`

    let singlestopRoute = bg.googleImageSourceToRoute(singlestopUrl);
    expect(singlestopRoute.getNumDropoffLocations()).toEqual(1);
    expect(singlestopRoute.pickupLatLon).toEqual(new bg.LatLon('22.2222222222', '-11.1111111111'));

    let multistopRoute = bg.googleImageSourceToRoute(multistopUrl);
    expect(multistopRoute.getNumDropoffLocations()).toEqual(2);
    expect(multistopRoute.pickupLatLon).toEqual(singlestopRoute.pickupLatLon);
    expect(multistopRoute.dropoffLatLons[0]).toEqual(new bg.LatLon('55.555555', '-66.666666'));
    expect(multistopRoute.dropoffLatLons[1]).toEqual(singlestopRoute.dropoffLatLons[0]);
  }),
  it('Check google API calls correctly identify cheated vs acceptable', () => {
    m.setupGlobalMocks();

    // Fake coordinates
    let pickup = new bg.LatLon(40.106507, -79.578185);
    let dropoff = new bg.LatLon(39.673911, -79.865928);
    let routeCoordinates = new bg.RouteCoordinates(pickup);
    routeCoordinates.addDropoff(dropoff);
    let tripId = "http://fake/id/"
    let dataFromStatement = new bg.DataFromStatement(32.5, "32.5 mi", routeCoordinates, tripId);

    // Fake message destination
    let messageDestination = new bg.MessageDestination(10, 0);

    // Query google (with fake, synchronous callbacks)
    bg.queryGoogleForDistance(dataFromStatement, messageDestination);

    // This should be marked as acceptable: 32.5 miles is within 10% of what we expect (35)
    expect(m.localChromeStorage.data.tab10_0.className).toEqual("acceptable");
    expect(m.pageAction.path).toEqual('icons/acceptable.png')

    // Query google again, with 25 mi / 40.23 km
    dataFromStatement = new bg.DataFromStatement(25, "40.2 km", routeCoordinates, tripId);
    bg.queryGoogleForDistance(dataFromStatement, messageDestination);

    // This should be marked as cheated: 25 miles is more than 10% away
    expect(m.localChromeStorage.data.tab10_0.className).toEqual("cheated");
    expect(m.pageAction.path).toEqual('icons/cheated.png')
  }),
  it('Check google API calls can handle multi-leg routes', () => {
    m.setupGlobalMocks();

    // Multi-stop trip
    let dropoff2 = new bg.LatLon(55.1, 66.2);
    let dropoff3 = new bg.LatLon(11.1, 22.2);
    let routeCoordinatesFake = m.createFakeRoute(bg);
    routeCoordinatesFake.addDropoff(dropoff2);
    routeCoordinatesFake.addDropoff(dropoff3);
    let tripId = "http://fake/id/"
    let dataFromStatement = new bg.DataFromStatement(3.0, "3.0 mi", routeCoordinatesFake, tripId);

    // Fake message destination
    let messageDestination = new bg.MessageDestination(10, 0);

    // Query google (with fake, synchronous callbacks)
    bg.queryGoogleForDistance(dataFromStatement, messageDestination);

    // Ensure the distance is as expected
    let key = "comparisons_" + tripId;
    expect(m.syncChromeStorage.data[key].route.dropoffLatLons.length).toEqual(3);
    expect(m.syncChromeStorage.data[key].actualDistanceFloatMi).toEqual(6);
    expect(m.syncChromeStorage.data[key].actualDistanceString).toEqual('1 mi + 2 mi + 3 mi');
  }),
  it('Check that multiple instances of the same data is not stored twice, and no analytics sent', () => {
    m.setupGlobalMocks();

    // Fake coordinates
    let routeCoordinatesFake = m.createFakeRoute(bg);
    let tripId = "http://fake/id/";
    let key = "comparisons_" + tripId;
    let dataFromStatement1 = new bg.DataFromStatement(32.501, "32.5 mi", routeCoordinatesFake, tripId);
    let dataFromStatement2 = new bg.DataFromStatement(32.5,   "32.5 mi", routeCoordinatesFake, tripId);

    let messageDestination = new bg.MessageDestination(10, 0);

    // Query google
    bg.queryGoogleForDistance(dataFromStatement1, messageDestination);
    m.syncChromeStorage.data[key].customFieldToEnsureNotOverridden = true
    expect(m.syncChromeStorage.data[key].customFieldToEnsureNotOverridden).toEqual(true);
    let numAnalytics = m.allAnalytics.length;

    // Query again - ensure data is not overridden, and no analytics sent
    bg.queryGoogleForDistance(dataFromStatement1, messageDestination);
    expect(m.syncChromeStorage.data[key].customFieldToEnsureNotOverridden).toEqual(true);
    expect(m.allAnalytics.length).toEqual(numAnalytics);

    // Query with a slightly different value - ensure data is overridden, and analytics sent
    bg.queryGoogleForDistance(dataFromStatement2, messageDestination);
    expect(m.syncChromeStorage.data[key].customFieldToEnsureNotOverridden).toEqual(undefined);
    expect(m.allAnalytics.length).toBeGreaterThan(numAnalytics);
  }),
  it('Check migration from v04 to v05 model', () => {
    m.setupGlobalMocks();

    // Fake coordinates
    let routeCoordinatesFake = m.createFakeRoute(bg);
    let tripId = "http://fake/id/";
    let key = "comparisons_" + tripId;
    let dataFromStatement = new bg.DataFromStatement(32.501, "32.5 mi", routeCoordinatesFake, tripId);
    let dataFromGoogle = new bg.DataFromGoogle(5.5, "5.5 mi");
    let fakePercentDiff = 1.2;

    let v04 = new models.StoredData_V0_4(dataFromStatement, dataFromGoogle, fakePercentDiff);
    let v05 = new models.StoredData_V0_5(dataFromStatement, dataFromGoogle, fakePercentDiff);
    let v05_migrated_explicitly = new models.StoredData_V0_5(v04);
    expect(v05_migrated_explicitly).toEqual(v05);
    let v05_migrated_implicitly = models.migrateToLatest(v04);
    expect(v05_migrated_explicitly).toEqual(v05_migrated_implicitly);
  });
})
