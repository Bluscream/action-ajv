const core = require("@actions/core");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
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
      loadData(utils.parseInput("schemas", "String")[0]),
    ]);

    const ajv = new Ajv();
    addFormats(ajv);
    core.info("new instance created");
    core.info("schema is" + JSON.stringify(schemas) );
    const validate = ajv.compile(schemas[0]);
    core.info("schema read");
    core.info("data is " + JSON.stringify(data));
    const valid = validate(data[0]);

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
