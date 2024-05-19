# Ajv JSON Schema Validator Action

This GitHub action can be used to validate json and yaml files against a [JSON Schema](https://json-schema.org/).

## Inputs

### `schema`
The schema file used for valiation.

### `data`
The data files to be validated. Glob pattern is supported.

### Additional options
This action supports most of [Ajv options](https://ajv.js.org/options.html).

## Outputs

### `valid`
The result of the validation.

### `errors`
The errors in case the validation failed.

## Example usage

```yaml
name: Validation

on:
  push:
    branches:
      - master

jobs:
  validate-config:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: validate
      uses: ammarlakis/action-ajv@master
      with:
        schema: schemas/account.schema.json
        data: accounts/*.yml
        allErrors: true
```
