const {add, subtract} = require('../../app/js/testablefile');
describe('Give it some context', () => {
  describe('maybe a bit more context here', () => {
    it('gets xpath elements', () => {
      expect(add(1, 2)).toEqual(3);
    });
  });
})
