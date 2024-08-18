const core = require("@actions/core");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { promises: fs } = require("fs");
const glob = require("glob-promise");
const utils = require("@gh-actions-utils/inputs");
const jsyaml = require("js-yaml");

const OUPTUTS = {
  valid: "valid",
  errors: "errors",
};

async function loadFiles(pathOrData) {
  try {
    const files = await glob(pathOrData);
    const data = await Promise.all(
      files.map(async (file) => {
        const contents = await fs.readFile(file, "utf8");
        return { filename: file, contents: jsyaml.load(contents) };
      })
    );
    return data;
  } catch (error) {
    core.setFailed(`Error loading data: ${error.message}`);
    throw error;
  }
}

async function validate() {
  try {
    const [data, schema] = await Promise.all([
      loadFiles(utils.parseInput("data", "String").value),
      loadFiles(utils.parseInput("schema", "String").value),
    ]);

    if (schema.length == 0) {
      core.setFailed("Failed to load the schema");
      core.setOutput(OUPTUTS.valid, false);
      return;
    }

    if (data.length == 0) {
      core.info("Nothing to validate");
      core.setOutput(OUPTUTS.valid, true);
      return;
    }

    const options = {
      strict: utils.parseInput("strict", "boolean", "string"),
      strictSchema: utils.parseInput("strictSchema", "boolean", "string"),
      strictNumbers: utils.parseInput("strictNumbers", "boolean"),
      strictTypes: utils.parseInput("strictTypes", "boolean", "string"),
      strictTuples: utils.parseInput("strictTuples", "boolean", "string"),
      strictRequired: utils.parseInput("strictRequired", "boolean", "string"),
      allowUnionTypes: utils.parseInput("allowUnionTypes", "boolean"),
      allowMatchingProperties: utils.parseInput("allowMatchingProperties","boolean"),
      validateFormats: utils.parseInput("validateFormats", "boolean"),
      allErrors: utils.parseInput("allErrors", "boolean"),
      verbose: utils.parseInput("verbose", "boolean"),
      discriminator: utils.parseInput("discriminator", "boolean"),
      unicodeRegExp: utils.parseInput("unicodeRegExp", "boolean"),
      timestamp: utils.parseInput("timestamp", "string"),
      parseDate: utils.parseInput("parseDate", "boolean"),
      allowDate: utils.parseInput("allowDate", "boolean"),
      int32range: utils.parseInput("int32range", "boolean"),
      $comment: utils.parseInput("comment", "boolean"),
      removeAdditional: utils.parseInput("removeAdditional","boolean","string"),
      useDefaults: utils.parseInput("useDefaults", "boolean", "string"),
      coerceTypes: utils.parseInput("coerceTypes", "boolean", "string"),
      meta: utils.parseInput("meta", "boolean", "json"),
      validateSchema: utils.parseInput("validateSchema", "boolean", "string"),
      addUsedSchema: utils.parseInput("addUsedSchema", "boolean"),
      inlineRefs: utils.parseInput("inlineRefs", "boolean", "integer"),
      passContext: utils.parseInput("passContext", "boolean"),
      loopRequired: utils.parseInput("loopRequired", "integer"),
      loopEnum: utils.parseInput("loopEnum", "integer"),
      ownProperties: utils.parseInput("ownProperties", "boolean"),
      multipleOfPrecision: utils.parseInput("multipleOfPrecision", "integer"),
      messages: utils.parseInput("messages", "boolean"),
      codeEs5: utils.parseInput("codeEs5", "boolean"),
      codeEsm: utils.parseInput("codeEsm", "boolean"),
      codeLines: utils.parseInput("codeLines", "boolean"),
      codeSource: utils.parseInput("codeSource", "boolean"),
      codeOptimize: utils.parseInput("codeOptimize", "boolean", "integer")
    };

    const ajv = new Ajv(options);
    addFormats(ajv);
    if (utils.parseInput("extraFormats", "boolean") === true) {
      core.info("extraFormats is enabled, adding more formats for validation");
      ajv.addFormat("boolean", /^(true|false|0|1|yes|no|enabled|disabled|on|off)$/i); // Temporary solution until https://github.com/ajv-validator/ajv-formats/pull/103 is merged
    }
    core.info("Starting validation");
    const validate = ajv.compile(schema[0].contents);
    const validationArray = data.map((file) => {
      validate(file.contents);
      return {
        filename: file.filename,
        errors: validate.errors,
      };
    });
    const ignoreErrors = utils.parseInput("ignoreErrors", "boolean") === true;
    if (!validationArray.every((validation) => validation.errors == null)) {
      if (ignoreErrors) {
        core.setOutput(OUPTUTS.valid, true);
      } else {
        core.setFailed(
          `Validation errors: ${JSON.stringify(
            validationArray.filter((validation) => validation.errors != null)
          )}`
        );
        core.setOutput(OUPTUTS.valid, false);
      }
      core.setOutput(OUPTUTS.errors, JSON.stringify(validate.errors));
    } else {
      core.setOutput(OUPTUTS.valid, true);
      core.info("Validation successful!");
    }
  } catch (error) {
    const errorMessage = `Failed to validate: ${error.message}`;
    if (ignoreErrors) {
      core.setOutput(OUPTUTS.valid, true);
      core.setOutput(OUPTUTS.errors, errorMessage);
    } else {
      core.setFailed(errorMessage);
    }
  }
}

validate();
