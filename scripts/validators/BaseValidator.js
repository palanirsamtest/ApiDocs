/**
 * Validators tend to share various helpers such as how to traverse
 * the specification, and how to output errors and warnings in a consistent fashion.
 * This base class holds onto those common methods to make the implementation of
 * each validator simpler and more concise.
 */
class BaseValidator {
  constructor(doc, type) {
    this.doc = doc;
    this.type = type; // type is one of "public", "private"
    this.valid = true; // Technically should be undefined, but for simplicity start this way for now
  }

  /**
   * Intended to be overridden by subclasses with real implementation
   * that performs a particular validation.
   */
  validate() {
    throw 'Not Implemented';
  }

  _fail(message) {
    this.valid = false;
    console.error(`[FAILED] ${message}`);
  }

  _failPath(path, method, message) {
    this.valid = false;
    this._fail(`${message} (${path}#${method})`);
  }

  _warnPath(path, method, message) {
    this._warn(`${message} (${path}#${method})`);
  }

  _warn(message) {
    console.warn(`[WARN] ${message}`);
  }

  _forEachPath(func) {
    Object.entries(this.doc.paths).forEach(entry => {
      const [path, pathEntries] = entry;
      func(path, pathEntries);
    });
  }

  _forEachPathMethod(func) {
    this._forEachPath((path, pathEntries) => {
      Object.entries(pathEntries).forEach(pathEntry => {
        const [method, methodDef] = pathEntry;

        if (!['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
          return; // Ignore if block is not an intended method
        }

        func(methodDef, method, path);
      });
    });
  }

  _forEachRequestBody(func) {
    this._forEachPathMethod((methodDef, method, path) => {
      if (methodDef.requestBody) {
        func(methodDef.requestBody, method, path);
      }
    });
  }

  _forEachResponse(func) {
    this._forEachPathMethod((methodDef, method, path) => {
      Object.values(methodDef.responses).forEach(response => {
        func(response, method, path);
      });
    });
  }
}

module.exports = BaseValidator;
