jest.mock('../../app/js/background.js', () => (
    {
        ...(jest.requireActual('../../app/js/background.js')),
        loadGoogleAnalytics: () => {}
    }
))

const bg = require('../../app/js/background-functions.js');

describe('Test background', () => {
  it('check stored data', () => {
    let routeLatLonFake = {whatever:0};
    let data = bg.computeDataToStoreForSummaryTable(5.5, 1.0, "5.5 mi", "2.2 km", routeLatLonFake, "http://fake/tripid/0");
    expect(data.url).toEqual("http://fake/tripid/0");
    expect(data.percentDifference).toBeGreaterThan(1.1); // the threshold at which we complain
    expect(data.actualFloat).toEqual(5.5);
    expect(data.uberPaidForFloat).toEqual(1.0);
    expect(data.routeLatLon).toEqual(routeLatLonFake);
  }),
  it('check mi to km conversions', () => {
    let floats = bg.distanceStringsToFloatsInMi("5.5 mi", "2.2 km", 0);
    expect(floats.actualFloat).toEqual(5.5);
    expect(Math.abs(floats.uberPaidForFloat-1.367017)).toBeLessThan(.001);

    floats = bg.distanceStringsToFloatsInMi("1.609334 km", "1.0 mi", 0);
    expect(Math.abs(floats.actualFloat-1.0)).toBeLessThan(.001);
    expect(Math.abs(floats.uberPaidForFloat-1.0)).toBeLessThan(.001);
  });
})
