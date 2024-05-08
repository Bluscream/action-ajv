const core = require('@actions/core');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { promises: fs } = require('fs');
const glob = require('glob-promise');

async function loadData(pathOrData) {
  try {
    if (pathOrData.startsWith('{')) {
      return JSON.parse(pathOrData);
    } else {
      const files = await glob(pathOrData);
      const data = await Promise.all(files.map(file => fs.readFile(file, 'utf8')));
      return data.map(JSON.parse);
    }
  } catch (error) {
    core.setFailed(`Error loading data: ${error.message}`);
    throw error;
  }
}

async function validate() {
  try {
    const dataInput = core.getInput('data');
    const schemaInput = core.getInput('schema');

    const options = {
      strict: parseBooleanOrString('strict'),
      strictSchema: parseBooleanOrString('strictSchema'),
      strictNumbers: parseBoolean('strictNumbers'),
      strictTypes: parseBooleanOrString('strictTypes'),
      strictTuples: parseBooleanOrString('strictTuples'),
      strictRequired: parseBooleanOrString('strictRequired'),
      allowUnionTypes: parseBoolean('allowUnionTypes'), // *
      allowMatchingProperties: parseBoolean('allowMatchingProperties'),
      validateFormats: parseBoolean('validateFormats'),
      // validation and reporting options:
      $data: core.getInput('data') === 'true', // * TODO
      allErrors: parseBoolean('allErrors'),
      verbose: parseBoolean('verbose'),
      discriminator: parseBoolean('discriminator'),
      unicodeRegExp: parseBoolean('unicodeRegExp'),
      timestamp: core.getInput('timestamp'), // **
      parseDate: parseBoolean('parseDate'),
      allowDate: parseBoolean('allowDate'),
      int32range: parseBoolean('int32range'),
      comment: parseBoolean('comment'), // *
      formats: parseJsonInput('formats'),
      keywords: parseJsonInput('keywords'),
      schemas: parseJsonInput('schemas'),
      logger: core.getInput('logger'),
      loadSchema: core.getInput(''), // *, function(uri: string): Promise {}
      // options to modify validated data:
      removeAdditional: core.getInput('') === 'true',
      useDefaults: core.getInput('') === 'true', // *
      coerceTypes: core.getInput('') === 'true', // *
      // advanced options:
      meta: core.getInput('') === 'true',
      validateSchema: core.getInput('') === 'true',
      addUsedSchema: core.getInput('') === 'true',
      inlineRefs: core.getInput('') === 'true',
      passContext: core.getInput('') === 'true',
      loopRequired: 200, // *
      loopEnum: 200, // NEW
      ownProperties: core.getInput('') === 'true',
      multipleOfPrecision: core.getInput(''), // *
      messages: core.getInput('') === true, // false with JTD
      uriResolver: core.getInput(''),
      codeEs5: core.getInput('codeEs5') === 'true',
      codeEsm: core.getInput('codeEsm') === 'true',
      codeLines: core.getInput('codeLines') === 'true',
      codeSources: core.getInput('codeSources') === 'true',
      codeProcess: core.getInput('codeProcess'),
      codeOptimize: core.getInput('codeOptimize') === 'true',
      codeRegExp: core.getInput('codeRegExp')
    };

    const [data, schema] = await Promise.all([
      loadData(dataInput),
      loadData(schemaInput)
    ]);

    const ajv = new Ajv(options);
    addFormats(ajv);

    const validate = ajv.compile(schema);
    const valid = validate(data);

    if (!valid) {
      core.setFailed(`Validation errors: ${JSON.stringify(validate.errors)}`);
      core.setOutput('result', JSON.stringify({ valid: false, errors: validate.errors }));
    } else {
      core.setOutput('result', JSON.stringify({ valid: true }));
    }
  } catch (error) {
    core.setFailed(`Failed to validate: ${error.message}`);
  }
}

validate();
