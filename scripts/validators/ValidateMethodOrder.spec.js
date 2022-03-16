const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const ValidateMethodOrder = require('./ValidateMethodOrder');
const VMO = new ValidateMethodOrder();

function getFile(yamlFilePath) {
  const filePath = path.resolve(__dirname, `./fixtures/${yamlFilePath}`);
  return yaml.load(fs.readFileSync(filePath, 'utf8'), {
    noRefs: true
  });
}

describe('ValidateMethodOrder', () => {
  describe('methodsAreInPreferredOrder', () => {
    it('should pass when the methods are in the correct order', () => {
      const fileContents = getFile('method-order--correct-order.yml');
      expect(VMO.methodsAreInPreferredOrder(fileContents)).toBeTruthy();
    });

    it('should fail when the methods are in the wrong order', () => {
      const fileContents = getFile('method-order--wrong-order.yml');
      expect(VMO.methodsAreInPreferredOrder(fileContents)).toBeFalsy();
    });

    it('should pass when there are no methods', () => {
      const fileContents = getFile('method-order--no-methods.yml');
      expect(VMO.methodsAreInPreferredOrder(fileContents)).toBeTruthy();
    });

    it('should pass when there is just one method', () => {
      const fileContents = getFile('method-order--one-method.yml');
      expect(VMO.methodsAreInPreferredOrder(fileContents)).toBeTruthy();
    });

    it('should ignore unknown methods', () => {
      const fileContents = getFile('method-order--ignore-unknown-methods.yml');
      expect(VMO.methodsAreInPreferredOrder(fileContents)).toBeTruthy();
    });
  });
});
