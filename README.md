skhema
======

> JSON Schema utility collection

[![Current Release](https://img.shields.io/npm/v/skhema.svg?style=flat-square)](https://npmjs.com/package/skhema)
[![License](https://img.shields.io/npm/l/skhema.svg?style=flat-square)](https://npmjs.com/package/skhema)
[![Downloads](https://img.shields.io/npm/dm/skhema.svg?style=flat-square)](https://npmjs.com/package/skhema)
[![Dependency status](https://img.shields.io/david/resin-io-modules/skhema.svg?style=flat-square)](https://david-dm.org/resin-io-modules/skhema)

Installation
------------

Install `skhema` by running:

```sh
$ npm install --save skhema
```

Documentation
-------------


* [skhema](#module_skhema)
    * _static_
        * [.SchemaMismatch](#module_skhema.SchemaMismatch) : <code>Error</code>
        * [.IncompatibleSchemas](#module_skhema.IncompatibleSchemas) : <code>Error</code>
        * [.match(schema, object, [options])](#module_skhema.match) ⇒ <code>Object</code>
        * [.isValid(schema, object, [options])](#module_skhema.isValid) ⇒ <code>Boolean</code>
        * [.validate(schema, object, [options])](#module_skhema.validate)
        * [.merge(schemas)](#module_skhema.merge) ⇒ <code>Object</code>
        * [.filter(schema, object, [options])](#module_skhema.filter) ⇒ <code>Object</code> \| <code>Null</code>
    * _inner_
        * [~formatValidationCallback](#module_skhema..formatValidationCallback) : <code>function</code>

<a name="module_skhema.SchemaMismatch"></a>

### skhema.SchemaMismatch : <code>Error</code>
**Kind**: static property of [<code>skhema</code>](#module_skhema)  
**Summary**: Schema mismatch error  
**Access**: public  
<a name="module_skhema.IncompatibleSchemas"></a>

### skhema.IncompatibleSchemas : <code>Error</code>
**Kind**: static property of [<code>skhema</code>](#module_skhema)  
**Summary**: Incompatible schemas error  
**Access**: public  
<a name="module_skhema.match"></a>

### skhema.match(schema, object, [options]) ⇒ <code>Object</code>
**Kind**: static method of [<code>skhema</code>](#module_skhema)  
**Summary**: Match an object against a schema  
**Returns**: <code>Object</code> - results  
**Access**: public  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| schema | <code>Object</code> |  | JSON schema |
| object | <code>Object</code> |  | object |
| [options] | <code>Object</code> |  | options |
| [options.customFormats] | <code>customFormats</code> | <code>{}</code> | custom formats |

**Example**  
```js
const results = skhema.match({
	 type: 'object'
}, {
	 foo: 'bar'
})

if (!results.valid) {
	 for (const error of results.errors) {
		 console.error(error)
	 }
}
```
<a name="module_skhema.isValid"></a>

### skhema.isValid(schema, object, [options]) ⇒ <code>Boolean</code>
This is a shorthand function for `.match()` which can be used
if the caller is not interested in the actual error messages.

**Kind**: static method of [<code>skhema</code>](#module_skhema)  
**Summary**: Check if an object matches a schema  
**Returns**: <code>Boolean</code> - whether the object matches the schema  
**Access**: public  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| schema | <code>Object</code> |  | JSON schema |
| object | <code>Object</code> |  | object |
| [options] | <code>Object</code> |  | options |
| [options.customFormats] | <code>customFormats</code> | <code>{}</code> | custom formats |

**Example**  
```js
const isValid = skhema.isValid({
	 type: 'object'
}, {
	 foo: 'bar'
})

if (isValid) {
	 console.log('The object is valid')
}
```
<a name="module_skhema.validate"></a>

### skhema.validate(schema, object, [options])
**Kind**: static method of [<code>skhema</code>](#module_skhema)  
**Summary**: Validate an object and throw if invalid  
**Access**: public  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| schema | <code>Object</code> |  | JSON schema |
| object | <code>Object</code> |  | object |
| [options] | <code>Object</code> |  | options |
| [options.customFormats] | <code>customFormats</code> | <code>{}</code> | custom formats |

**Example**  
```js
skhema.validate({
	 type: 'object'
}, {
	 foo: 'bar'
})
```
<a name="module_skhema.merge"></a>

### skhema.merge(schemas) ⇒ <code>Object</code>
**Kind**: static method of [<code>skhema</code>](#module_skhema)  
**Summary**: Merge two or more JSON Schemas  
**Returns**: <code>Object</code> - merged JSON Schema  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| schemas | <code>Array.&lt;Object&gt;</code> | a set of JSON Schemas |

**Example**  
```js
const result = skhema.merge([
	 {
		 type: 'string',
		 maxLength: 5,
		 minLength: 2
	 },
	 {
		 type: 'string',
		 maxLength: 3
	 }
])

console.log(result)
> {
>	 type: 'string',
>	 maxLength: 3,
>	 minLength: 2
> }
```
<a name="module_skhema.filter"></a>

### skhema.filter(schema, object, [options]) ⇒ <code>Object</code> \| <code>Null</code>
**Kind**: static method of [<code>skhema</code>](#module_skhema)  
**Summary**: Filter an object based on a schema  
**Returns**: <code>Object</code> \| <code>Null</code> - filtered object  
**Access**: public  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| schema | <code>Object</code> |  | schema |
| object | <code>Object</code> |  | object |
| [options] | <code>Object</code> |  | options |
| [options.force] | <code>Boolean</code> | <code>false</code> | force filter |
| [options.customFormats] | <code>customFormats</code> | <code>{}</code> | custom formats |

**Example**  
```js
const result = skhema.filter({
	 type: 'object',
	 properties: {
		 foo: {
			 type: 'number'
		 }
	 },
	 required: [ 'foo' ]
}, {
	 foo: 1,
	 bar: 2
})

console.log(result)
> {
>	 foo: 1
> }
```
<a name="module_skhema..formatValidationCallback"></a>

### skhema~formatValidationCallback : <code>function</code>
This callback is called when validating a custom format. It should return
true if the value is valid or false otherwise

**Kind**: inner typedef of [<code>skhema</code>](#module_skhema)  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>\*</code> | The value to validate |


Tests
-----

Run the test suite by doing:

```sh
$ npm test
```

Contribute
----------

We're looking forward to support more operating systems. Please raise an issue or even better, send a PR to increase support!

- Issue Tracker: [github.com/resin-io-modules/skhema/issues](https://github.com/resin-io-modules/skhema/issues)
- Source Code: [github.com/resin-io-modules/skhema](https://github.com/resin-io-modules/skhema)

Before submitting a PR, please make sure that you include tests, and that the linter runs without any warning:

```sh
npm run lint
```

Support
-------

If you're having any problem, please [raise an issue](https://github.com/resin-io-modules/skhema/issues/new) on GitHub.

License
-------

The project is licensed under the Apache 2.0 license.
