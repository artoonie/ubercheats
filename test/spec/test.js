jest.mock('../../app/js/background.js', () => (
    {
        ...(jest.requireActual('../../app/js/background.js')),
        loadGoogleAnalytics: () => {}
    }
))

const bg = require('../../app/js/background-functions.js');

describe('Test background', () => {
  it('check stored data', () => {
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
  it('check mi to km conversions', () => {
    expect(bg.distanceStringToMilesFloat("5.5 mi", 0)).toEqual(5.5);
    expect(Math.abs(bg.distanceStringToMilesFloat("1.609334 km", 0)-1.0)).toBeLessThan(.001);
    expect(Math.abs(bg.distanceStringToMilesFloat("1 mi", 0)-1.0)).toBeLessThan(.001);
    expect(Math.abs(bg.distanceStringToMilesFloat("0.1 mi", 0)-0.1)).toBeLessThan(.001);
  });
})
