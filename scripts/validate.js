/**
 * OpenAPI 3.0's default validation will verify that the document adheres to
 * the specification, but it will not check if e.g. the specification is
 * written in a way that clean SDKs will be generated from it. This script
 * performs such additional validations and performs additional validations
 * specific to Highbond's guidelines for API documentation.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const publicApiDoc = path.resolve(__dirname, '../dist/public/public.yml');
const publicDoc = yaml.load(fs.readFileSync(publicApiDoc, 'utf8'), {
  noRefs: true
});

const privateApiDoc = path.resolve(__dirname, '../dist/private/private.yml');
const privateDoc = yaml.load(fs.readFileSync(privateApiDoc, 'utf8'), {
  noRefs: true
});

/**
 * Validates all rules, based on a convention that each validation
 * is a separate file inside `validates` folder with a particular
 * prefix in its name.
 *
 * @param doc {object} - the bundled YAML file as a JSON object
 * @param type {string} - one of "public", "private"
 * @returns {boolean} whether all validations passed or not.
 */
function validateAllRules(doc, type) {
  let success = true;
  const rulesDir = path.resolve(__dirname, './validators');
  fs.readdirSync(rulesDir).forEach(file => {
    if (!file.startsWith('Validate')) {
      // Use naming convention for validation
      return; // Ignore base class
    }

    // ignore test files
    if (file.endsWith('.spec.js')) {
      return;
    }

    const Validator = require(`${rulesDir}/${file}`);
    const validator = new Validator(doc, type);
    validator.validate();
    success = validator.valid && success;
  });
  return success;
}

if (validateAllRules(publicDoc, 'public') && validateAllRules(privateDoc, 'private')) {
  console.log('Specification passes automated Highbond checks.');
} else {
  console.error('Specification does not pass automated Highbond checks.');
  process.exit(-1);
}
