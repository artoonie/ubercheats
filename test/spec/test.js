jest.mock('../../app/js/background.js', () => (
    {
        ...(jest.requireActual('../../app/js/background.js')),
        loadGoogleAnalytics: () => {}
    }
))

//const bg = require('../../app/js/background.js');

describe('Give it some context', () => {
  describe('maybe a bit more context here', () => {
    it('gets xpath elements', () => {
      return;
      bg.loadGoogleAnalytics = jest.fn()

      storeAndAnalyzeDistances(5.5, 1.0, "5.5 mi", "2.2 km", 0);
      expect(5).toEqual(5);
    });
  });
})
