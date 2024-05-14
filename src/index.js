const core = require("@actions/core");
const Ajv = require("ajv");
const { promises: fs } = require("fs");
const glob = require("glob-promise");
const utils = require("@gh-actions-utils/inputs");
const yaml = require("yaml")

async function loadData(pathOrData) {
  core.info(pathOrData);
  try {
    const files = await glob(pathOrData);
    const data = await Promise.all(
      files.map((file) => fs.readFile(file, "utf8"))
    );
    return data.map(yaml.parse);
  } catch (error) {
    core.setFailed(`Error loading data: ${error.message}`);
    throw error;
  }
}

async function validate() {
  try {
    const [data, schemas] = await Promise.all([
      loadData(utils.parseInput("data", "String")[0]),
      loadData(utils.parseInput("schema", "String")[0]),
    ]);

    const options = {
      $data: data,
      // schemas: schemas,
      strict: utils.parseInput("strict", "Boolean", "String"),
      strictSchema: utils.parseInput("strictSchema", "Boolean", "String"),
      strictNumbers: utils.parseInput("strictNumbers", "Boolean"),
      strictTypes: utils.parseInput("strictTypes", "Boolean", "String"),
      strictTuples: utils.parseInput("strictTuples", "Boolean", "String"),
      strictRequired: utils.parseInput("strictRequired", "Boolean", "String"),
      allowUnionTypes: utils.parseInput("allowUnionTypes", "Boolean"),
      allowMatchingProperties: utils.parseInput("allowMatchingProperties", "Boolean"),
      validateFormats: utils.parseInput("validateFormats", "Boolean"),
      allErrors: utils.parseInput("allErrors", "Boolean"),
      verbose: utils.parseInput("verbose", "Boolean"),
    };

    const ajv = new Ajv(options);

    const validate = ajv.compile(schemas);
    const valid = validate(data);

    if (!valid) {
      core.setFailed(`Validation errors: ${JSON.stringify(validate.errors)}`);
      core.setOutput( "valid", false);
      core.setOutput( "errors", JSON.stringify(validate.errors));
    } else {
      core.setOutput("valid", true);
    }
  } catch (error) {
    core.setFailed(`Failed to validate: ${error.message}`);
  }
}

validate();
