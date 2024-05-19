const core = require("@actions/core");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { promises: fs } = require("fs");
const glob = require("glob-promise");
const utils = require("@gh-actions-utils/inputs");
const jsyaml = require("js-yaml");

const OUPTUTS = {
  valid: 'valid',
  errors: 'errors',
}

async function loadFiles(pathOrData) {
  try {
    const files = await glob(pathOrData);
    const data = await Promise.all(
      files.map(async (file) => {
        const contents = await fs.readFile(file, "utf8");
        return {filename: file, contents: jsyaml.load(contents)}
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

    const ajv = new Ajv();
    addFormats(ajv);
    const validate = ajv.compile(schema[0].contents);
    const validationArray = data.map((file) => {
      validate(file.contents);
      return {
        filename: file.filename,
        errors: validate.errors
      }
    });

    if (!validationArray.every((validation) => validation.errors == null)) {
      core.setFailed(`Validation errors: ${JSON.stringify(validationArray.filter((validation) => validation.errors != null))}`);
      core.setOutput(OUPTUTS.valid, false);
      core.setOutput(OUPTUTS.errors, JSON.stringify(validate.errors));
    } else {
      core.setOutput(OUPTUTS.valid, true);
      core.info("Validation successful!")
    }
  } catch (error) {
    core.setFailed(`Failed to validate: ${error.message}`);
  }
}

validate();
