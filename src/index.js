const core = require("@actions/core");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { promises: fs } = require("fs");
const glob = require("glob-promise");
const utils = require("@gh-actions-utils/inputs");
const jsyaml = require("js-yaml");

async function loadData(pathOrData) {
  core.info(pathOrData);
  try {
    const files = await glob(pathOrData);
    const data = await Promise.all(
      files.map((file) => fs.readFile(file, "utf8"))
    );
    return data.map(jsyaml.load);
  } catch (error) {
    core.setFailed(`Error loading data: ${error.message}`);
    throw error;
  }
}

async function validate() {
  try {
    const [data, schemas] = await Promise.all([
      loadData(utils.parseInput("data", "String").value),
      loadData(utils.parseInput("schemas", "String").value),
    ]);

    const ajv = new Ajv();
    addFormats(ajv);
    const validate = ajv.compile(schemas.value);
    const valid = validate(data.value);

    if (!valid) {
      core.setFailed(`Validation errors: ${JSON.stringify(validate.errors)}`);
      core.setOutput("valid", false);
      core.setOutput("errors", JSON.stringify(validate.errors));
    } else {
      core.setOutput("valid", true);
    }
  } catch (error) {
    core.setFailed(`Failed to validate: ${error.message}`);
  }
}

validate();
