const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const ValidateOrgPathPrefix = require('./ValidateOrgPathPrefix');

function getFile(yamlFilePath) {
  const filePath = path.resolve(__dirname, `./fixtures/${yamlFilePath}`);
  return yaml.load(fs.readFileSync(filePath, 'utf8'), {
    noRefs: true
  });
}

/**
 * Validates both public and private contents, returning their validation results.
 * @param {*} publicContents    The validation content for the public endpoints
 * @param {*} privateContents   The validation content for the private endpoints
 * @returns { isPublicValid: boolean, isPrivateValid: boolean } The validation results
 */
function validate(publicContents, privateContents) {
  const publicValidator = new ValidateOrgPathPrefix(publicContents, 'public');
  const privateValidator = new ValidateOrgPathPrefix(privateContents, 'private');

  publicValidator.validate();
  privateValidator.validate();

  return {
    isPublicValid: publicValidator.valid,
    isPrivateValid: privateValidator.valid
  };
}

describe('ValidateOrgPathPrefix', () => {
  const originalConsole = console;

  beforeAll(() => {
    console = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
  });

  afterAll(() => {
    console = originalConsole;
  });

  it('passes when all api are prefixed with /orgs/{org_id}/', () => {
    const apis = getFile('org-path-prefix--all-correct.yml');
    expect(validate(apis.public, apis.private)).toEqual({
      isPublicValid: true,
      isPrivateValid: true
    });
  });

  it('fails when some public apis are not prefixed with /orgs/{org_id}/', () => {
    const apis = getFile('org-path-prefix--public-incorrect.yml');
    expect(validate(apis.public, apis.private)).toEqual({
      isPublicValid: false,
      isPrivateValid: true
    });

    expect(console.error.mock.calls[0][0]).toContain(`[FAILED] Path must begin with "/org/{org_id}/" (/assets#)`);
  });

  it('warns when some private apis are not prefixed with /orgs/{org_id}/', () => {
    const apis = getFile('org-path-prefix--public-correct.yml');
    expect(validate(apis.public, apis.private)).toEqual({
      isPublicValid: true,
      isPrivateValid: true
    });

    expect(console.warn.mock.calls[0]).toContain(
      `[WARN] Path does not begin with "/org/{org_id}/". If this api is made public, it will require this org prefix in order to integrate successfully with API Proxy. (/api/groups#)`
    );
  });
});
