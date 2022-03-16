const BaseValidator = require('./BaseValidator');

/**
 * Ensures that under a single tag, no duplicate operationIds exist.
 *
 * Duplicate operationIds lead to poorly generated SDKs. SDKs rely on tags to
 * figure out how to group functions/methods together. If there is duplication,
 * it causes arbitrary suffix generation to maintain uniqueness, e.g. if
 * `createApp` operation is duplicated for the same tag, then the resulting SDK
 * will have an API object/class with `CreateApp`, `CreateApp_1` functions/methods.
 */
class ValidateUniqueOperationIds extends BaseValidator {
  validate() {
    const uniquePaths = [];
    this._forEachPathMethod((methodDef, method, path) => {
      const operationId = methodDef.operationId;
      if (!operationId) {
        this._failPath(path, method, `operationId not defined.`);
      }

      // While multiple tags should not exist, this implementation takes the more
      // expansive consideration.
      methodDef.tags.forEach(tag => {
        const key = `${tag}#${operationId}`;

        if (uniquePaths.includes(key)) {
          this._failPath(path, method, `Duplicate operationId "${operationId}" detected under the "${tag}" tag`);
        } else {
          uniquePaths.push(key);
        }
      });
    });
  }
}

module.exports = ValidateUniqueOperationIds;
