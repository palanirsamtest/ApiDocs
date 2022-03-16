const BaseValidator = require('./BaseValidator');

/**
 * OpenAPI Generator requires a particular documentation mechanism to understand
 * how to generate its request and response models. When this is not followed,
 * then it generates "inline" models which basically break the usability of the
 * SDK. This validation script protects that.
 *
 * To avoid inline models, it's important that any "schema" for a request body
 * or response body, immediately references ($ref) a schema defined under
 * "#/components/schemas", otherwise OpenAPI generator does not understand what name
 * to use and thus generates an "inline" model with arbitrary suffix to avoid
 * name collision.
 */
class ValidateNoInlineSchemas extends BaseValidator {
  validate() {
    this._forEachRequestBody((requestBody, method, path) => {
      Object.values(requestBody.content).forEach(contentType => {
        if (!contentType.schema['$ref']) {
          this._failPath(path, method, `Inline schema used for request body.`);
        }
      });
    });

    this._forEachResponse((response, method, path) => {
      if (!response.content && response['$ref']) {
        // Higher-level $ref is used. Assumed to be proper
        return;
      }
      // When end-point has no body response, and only a status code
      if (!response.content) {
        return;
      }

      Object.values(response.content).forEach(contentType => {
        if (!contentType.schema['$ref']) {
          this._failPath(path, method, `Inline schema used for response.`);
        }
      });
    });
  }
}

module.exports = ValidateNoInlineSchemas;
