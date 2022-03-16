const BaseValidator = require('./BaseValidator');

/**
 * Validates that tags in x-tagGroups reference valid tags
 */
class ValidateXTagGroups extends BaseValidator {
  validate() {
    const xTagGroups = this.doc['x-tagGroups'];

    if (xTagGroups) {
      const validTagNames = this.doc.tags.map(tag => tag.name);

      const invalidTagReferences = xTagGroups
        .map(tagGroup => tagGroup.tags.filter(tag => validTagNames.indexOf(tag) < 0))
        .reduce((a, b) => a.concat(b));

      if (invalidTagReferences.length) {
        this._fail(`Invalid tags referenced in x-tagGroups: ${invalidTagReferences.join(', ')}`);
      }
    }
  }
}

module.exports = ValidateXTagGroups;
