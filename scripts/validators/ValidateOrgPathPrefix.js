const BaseValidator = require('./BaseValidator');

/**
 * Ensures that all API paths are fixed with /orgs/{org_id}
 *
 * This makes sure the API endpoint as exposed to API Proxy
 * matches the documentation exactly. This is necessary for the
 * SDK to send a request correctly.
 */
class ValidateOrgPathPrefix extends BaseValidator {
  validate() {
    this._forEachPath(path => {
      const isValid = path.startsWith('/orgs/{org_id}/');

      if (isValid) {
        return;
      }

      if (this.type === 'private') {
        this._warnPath(
          path,
          '',
          'Path does not begin with "/org/{org_id}/". If this api is made public, it will require this org prefix in order to integrate successfully with API Proxy.'
        );
        return;
      }

      this._failPath(path, '', 'Path must begin with "/org/{org_id}/"');
    });
  }
}

module.exports = ValidateOrgPathPrefix;
