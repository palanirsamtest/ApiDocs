/**
 * Responsible for generating enum types for OpenAPI based off a more robust
 * YAML structure that defines all of our permission sets and resource types.
 *
 * All it does is read in a YAML file, and generate an OpenAPI compatible YAML file.
 */
const expect = require('expect');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

const baseBranch =
  !process.env.IGNORE_REMOTE_COMPARE && !process.env.AWS_ACCOUNT && process.env.SEMAPHORE_GIT_BRANCH !== 'master'
    ? 'origin/main'
    : undefined;

function loadYaml(filePath, gitBranch = undefined) {
  const content = gitBranch
    ? execSync(`git show ${gitBranch}:${filePath}`, { encoding: 'utf8', env: process.env })
    : fs.readFileSync(path.resolve(__dirname, `../${filePath}`), 'utf8');
  return yaml.load(content);
}

function writeYaml(filePath, contents) {
  fs.writeFileSync(path.resolve(__dirname, `../${filePath}`), yaml.dump(contents));
}

function getDuplicates(array, accessor = x => x) {
  const groups = _.groupBy(array, accessor);
  return Object.values(groups)
    .filter(group => group.length > 1)
    .flat();
}

function loadResourceTypePermissions() {
  const filePath = 'apis_private/custom/resource_type_permissions.yml';
  const fileContents = loadYaml(filePath);

  const allResourceTypes = _(fileContents)
    .pickBy((entry, resourceType) => resourceType !== 'ALL')
    .mapValues(({ permissions, ...rest }) => rest)
    .value();
  const allPermissionEntries = Object.entries(fileContents)
    .map(([resourceType, entry]) => Object.entries(entry.permissions || {}))
    .flat();

  // Validate unique permission names
  const duplicateNames = getDuplicates(allPermissionEntries, ([name]) => name);
  if (duplicateNames.length) {
    throw new Error(`Duplicate permission names in ${filePath}: ${duplicateNames}`);
  }

  const allPermissions = Object.fromEntries(allPermissionEntries);

  const baseContents = loadYaml(filePath, baseBranch);
  const basePermissionEntries = Object.entries(baseContents)
    .map(([resourceType, entry]) => Object.entries(entry.permissions || {}))
    .flat();
  const expectedPermissions = Object.fromEntries(basePermissionEntries.map(([name, { value }]) => [name, { value }]));
  try {
    expect(allPermissions).toMatchObject(expectedPermissions);
  } catch (err) {
    throw `Permissions cannot be removed or assigned a different value. Use "deprecated: true" instead.\n${err}`;
  }

  const expectedResourceTypes = _(baseContents)
    .pickBy((entry, resourceType) => resourceType !== 'ALL')
    .mapValues(({ value }) => ({ value }))
    .value();
  try {
    expect(allResourceTypes).toMatchObject(expectedResourceTypes);
  } catch (err) {
    throw `ResourceTypes cannot be removed or assigned a different value. Use "deprecated: true" instead.\n${err}`;
  }

  const resourceTypes = _.pickBy(allResourceTypes, resourceType => !resourceType.deprecated);
  const permissions = _.pickBy(allPermissions, permission => !permission.deprecated);
  const resourceTypePermissions = _(resourceTypes)
    .mapValues((entry, resourceType) =>
      _.pickBy(fileContents['ALL'].permissions, permission => !(permission.except || []).includes(resourceType))
    )
    .mapValues((permissions, resourceType) => ({ ...permissions, ...fileContents[resourceType].permissions }))
    .mapValues(permissions => _.pickBy(permissions, permission => !permission.deprecated))
    .value();

  // Validate unique permission values
  const duplicateValues = getDuplicates(Object.entries(permissions), ([name, permission]) => permission.value);
  if (duplicateValues.length) {
    throw new Error(`Duplicates permission values in ${filePath}: ${duplicateValues.map(([name]) => name)}`);
  }
  // Validate permission categories
  const validCategories = ['System'];
  const invalidCategories = _.pickBy(
    permissions,
    permission => permission.categories && !permission.categories.every(category => validCategories.includes(category))
  );
  if (Object.keys(invalidCategories).length) {
    throw new Error(`Invalid permission categories in ${filePath}: ${Object.keys(invalidCategories)}`);
  }

  return { resourceTypes, permissions, resourceTypePermissions };
}

function generateOpenApiEnums(enums, props = {}) {
  return Object.entries(enums).reduce((content, [enumName, enumObject]) => {
    const objectEntries = Object.entries(enumObject);
    return {
      ...content,
      [enumName]: {
        type: 'integer',
        format: 'int32',
        description: [
          '```',
          objectEntries.map(([key, entry]) => `// ${entry.description}\n   ${key} = ${entry.value}`).join('\n\n'),
          '```'
        ].join('\n'),
        enum: objectEntries.map(([key, entry]) => entry.value),
        'x-enum-descriptions': objectEntries.map(([key, entry]) => entry.description),
        'x-enum-varnames': objectEntries.map(([key, entry]) => key),
        ...props
      }
    };
  }, {});
}

function generateOpenApiEnumFlags(enums) {
  return Object.entries(enums).reduce((content, [enumName, enumObject]) => {
    const entries = {};
    Object.entries(enumObject).forEach(([key]) => {
      entries[key.toLowerCase()] = { type: 'boolean' };
    });
    return { ...content, [enumName]: entries };
  }, {});
}

// Create models from custom schema files
let {
  resourceTypes,
  permissions,
  resourceTypePermissions: uppercaseResourceTypePermissions
} = loadResourceTypePermissions();
const assignablePermissions = _.pickBy(permissions, permission => !(permission.categories || []).includes('System'));
const resourceTypePermissions = _.mapKeys(uppercaseResourceTypePermissions, (permissions, resourceType) =>
  _.upperFirst(_.camelCase(resourceType))
);
const assignableResourceTypePermissions = _(resourceTypePermissions)
  .mapValues((permissions, resourceType) =>
    _.pickBy(permissions, permission => !(permission.categories || []).includes('System'))
  )
  .pickBy(permissions => Object.keys(permissions).length)
  .value();

// Generate OpenApi schema files
writeYaml('apis_private/generated/resource_types.yml', generateOpenApiEnums({ ResourceType: resourceTypes }));
writeYaml('apis_private/generated/permissions.yml', generateOpenApiEnums({ Permission: permissions }));
writeYaml(
  'apis_private/generated/assignable_permissions.yml',
  generateOpenApiEnums({ AssignablePermission: assignablePermissions })
);
writeYaml('apis_private/generated/resource_type_permissions.yml', generateOpenApiEnums(resourceTypePermissions));
writeYaml(
  'apis/schemas/roles/generated/role_permissions.yml',
  generateOpenApiEnumFlags(assignableResourceTypePermissions)
);

// Add generated schemas into schemas.yml
const resourceTypePermissionRefs = Object.keys(resourceTypePermissions).reduce(
  (acc, resourceType) => ({
    ...acc,
    [`${resourceType}Permission`]: { $ref: `./resource_type_permissions.yml#/${resourceType}` }
  }),
  {}
);
const schemas = loadYaml('apis_private/components/schemas.yml');
writeYaml('apis_private/generated/schemas.yml', {
  ...schemas,
  ResourceType: { $ref: './resource_types.yml#/ResourceType' },
  Permission: { $ref: './permissions.yml#/Permission' },
  AssignablePermission: { $ref: './assignable_permissions.yml#/AssignablePermission' },
  ...resourceTypePermissionRefs
});
