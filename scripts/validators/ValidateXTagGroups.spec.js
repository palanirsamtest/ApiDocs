const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const ValidateXTagGroups = require('./ValidateXTagGroups');

function getFile(yamlFilePath) {
  const filePath = path.resolve(__dirname, `./fixtures/${yamlFilePath}`);
  return yaml.load(fs.readFileSync(filePath, 'utf8'), {
    noRefs: true
  });
}

const originalConsole = console;
beforeAll(() => {
  console = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
});

afterAll(() => {
  console = originalConsole;
});

describe('ValidateXTagGroups', () => {
  it('passes when tags in x-tagGroups reference valid tags by name', () => {
    const fileContents = getFile('x-tag-groups-correct.yml');
    const validator = new ValidateXTagGroups(fileContents);
    validator.validate();
    expect(validator.valid).toBeTruthy();
  });

  it('passes when no x-tagGroups', () => {
    const fileContents = getFile('x-tag-groups-missing.yml');
    const validator = new ValidateXTagGroups(fileContents);
    validator.validate();
    expect(validator.valid).toBeTruthy();
  });

  it('fails when tags in x-tagGroups reference tag names that are not defined', () => {
    const fileContents = getFile('x-tag-groups-incorrect.yml');
    const validator = new ValidateXTagGroups(fileContents);
    validator.validate();
    expect(validator.valid).toBeFalsy();
  });

  it('prints invalid tags when validation fails', () => {
    const fileContents = getFile('x-tag-groups-incorrect.yml');
    const validator = new ValidateXTagGroups(fileContents);
    const mock = jest.spyOn(validator, '_fail');

    validator.validate();

    expect(mock).toHaveBeenCalledWith('Invalid tags referenced in x-tagGroups: Robot, Story boards');
  });
});
