const BaseValidator = require('./BaseValidator');

/**
 * Validates that the content-type documented matches our guidelines of adhering to
 * JSON API Spec. We do not want a plethora of content-types. We should be strict
 * and particular about what we support within any particular version of the API.
 *
 * `application/json` is treated as an exception in cases where it makes more sense,
 * or is intuitive, to use JSON content rather than forcing it into JSON API format.
 */
class ValidateContentTypes extends BaseValidator {
  validate() {
    this._forEachRequestBody((requestBody, method, path) => {
      Object.keys(requestBody.content).forEach(contentType => {
        switch (contentType) {
          case 'multipart/form-data': // Important to support end-points that involve file uploads
          case 'application/vnd.api+json':
          case 'application/vnd.api+json;ext=bulk':
            break;
          case 'application/json':
            this._warnPath(path, method, `Use JSON API content-type rather than "${contentType}" in request`);
            break;
          default:
            this._failPath(path, method, `Invalid content-type "${contentType}" used in request`);
            break;
        }
      });
    });

    this._forEachResponse((response, method, path) => {
      if (!response.content) {
        return;
      }
      Object.keys(response.content).forEach(contentType => {
        switch (contentType) {
          case 'application/vnd.api+json':
            break;
          case 'application/json':
            this._warnPath(path, method, `Use JSON API content-type rather than "${contentType}" in response`);
            break;
          default:
            this._failPath(path, method, `Invalid content-type "${contentType}" used in response`);
            break;
        }
      });
    });
  }
}

module.exports = ValidateContentTypes;
