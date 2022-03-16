const BaseValidator = require('./BaseValidator');
const PREFERRED_METHOD_ORDER = ['get', 'post', 'put', 'patch', 'delete'];

/**
 * Validates that the methods that exist in a yml file follow a pre-defined order.
 */
class ValidateMethodOrder extends BaseValidator {
  methodsAreInPreferredOrder(yamlContents = {}) {
    let success = true;
    const methods = Object.keys(yamlContents).filter(method => PREFERRED_METHOD_ORDER.indexOf(method) > -1);

    methods.forEach((method, index) => {
      if (
        index < methods.length - 1 &&
        PREFERRED_METHOD_ORDER.indexOf(methods[index]) > PREFERRED_METHOD_ORDER.indexOf(methods[index + 1])
      ) {
        success = false;
      }
    });

    return success;
  }

  validate() {
    this._forEachPath((endpointPath, yamlContents) => {
      if (!this.methodsAreInPreferredOrder(yamlContents)) {
        this._failPath(
          endpointPath,
          '',
          `A method is out of order. Please follow preferred order: ${PREFERRED_METHOD_ORDER}`
        );
      }
    });
  }
}

module.exports = ValidateMethodOrder;
