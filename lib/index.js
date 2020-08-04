/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *		http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const AJV = require('ajv')
const ajvKeywords = require('ajv-keywords')
const clone = require('deep-copy')
const jsf = require('json-schema-faker')
const mergeSchema = require('json-schema-merge-allof')
const {
	TypedError
} = require('typed-error')
const LRUCache = require('./lru-cache')
const {
	concat,
	has,
	intersection,
	isString,
	isUndefined,
	mapValues,
	mean,
	merge,
	mergeWith,
	omit,
	union,
	uniq
} = require('./util')

const cache = new LRUCache()

/**
 * @module skhema
 */

// Adds extra keywords to an AJV instance using the `ajv-keywords` package.
// This method mutates the AJV instance.
const configureAjv = (ajv) => {
	const keywords = [
		'formatMaximum',
		'formatMinimum',

		// The regexp keyword is used by rendition to do case insensitive pattern
		// matching via the AJV package.
		// See https://github.com/epoberezkin/ajv-keywords#regexp
		'regexp'
	]

	keywords.forEach((keyword) => {
		ajvKeywords(ajv, [ keyword ])
	})

	ajv.addFormat('markdown', isString)
	ajv.addFormat('mermaid', isString)
}

const JSON_SCHEMA_SCHEMA = {
	$schema: 'http://json-schema.org/draft-07/schema#',
	$id: 'jellyfish-meta-schema',
	title: 'Core schema meta-schema',
	definitions: {
		schemaArray: {
			type: 'array',
			minItems: 1,
			items: {
				$ref: '#'
			}
		},
		nonNegativeInteger: {
			type: 'integer',
			minimum: 0
		},
		nonNegativeIntegerDefault0: {
			allOf: [
				{
					$ref: '#/definitions/nonNegativeInteger'
				},
				{
					default: 0
				}
			]
		},
		simpleTypes: {
			enum: [
				'array',
				'boolean',
				'integer',
				'null',
				'number',
				'object',
				'string'
			]
		},
		stringArray: {
			type: 'array',
			items: {
				type: 'string'
			},
			uniqueItems: true,
			default: []
		}
	},
	type: [ 'object', 'boolean' ],
	properties: {
		$id: {
			type: 'string',
			format: 'uri-reference'
		},
		$schema: {
			type: 'string',
			format: 'uri'
		},
		$ref: {
			type: 'string',
			format: 'uri-reference'
		},
		$comment: {
			type: 'string'
		},
		title: {
			type: 'string'
		},
		description: {
			type: 'string'
		},
		default: true,
		readOnly: {
			type: 'boolean',
			default: false
		},
		examples: {
			type: 'array',
			items: true
		},
		multipleOf: {
			type: 'number',
			exclusiveMinimum: 0
		},
		maximum: {
			type: 'number'
		},
		exclusiveMaximum: {
			type: 'number'
		},
		minimum: {
			type: 'number'
		},
		exclusiveMinimum: {
			type: 'number'
		},
		maxLength: {
			$ref: '#/definitions/nonNegativeInteger'
		},
		minLength: {
			$ref: '#/definitions/nonNegativeIntegerDefault0'
		},
		pattern: {
			type: 'string',
			format: 'regex'
		},
		additionalItems: {
			$ref: '#'
		},
		items: {
			anyOf: [
				{
					$ref: '#'
				},
				{
					$ref: '#/definitions/schemaArray'
				}
			],
			default: true
		},
		maxItems: {
			$ref: '#/definitions/nonNegativeInteger'
		},
		minItems: {
			$ref: '#/definitions/nonNegativeIntegerDefault0'
		},
		uniqueItems: {
			type: 'boolean',
			default: false
		},
		contains: {
			$ref: '#'
		},
		maxProperties: {
			$ref: '#/definitions/nonNegativeInteger'
		},
		minProperties: {
			$ref: '#/definitions/nonNegativeIntegerDefault0'
		},
		required: {
			$ref: '#/definitions/stringArray'
		},
		additionalProperties: {
			$ref: '#'
		},
		definitions: {
			type: 'object',
			additionalProperties: {
				$ref: '#'
			},
			default: {}
		},
		properties: {
			type: 'object',
			additionalProperties: {
				$ref: '#'
			},
			default: {}
		},
		patternProperties: {
			type: 'object',
			additionalProperties: {
				$ref: '#'
			},
			propertyNames: {
				format: 'regex'
			},
			default: {}
		},
		dependencies: {
			type: 'object',
			additionalProperties: {
				anyOf: [
					{
						$ref: '#'
					},
					{
						$ref: '#/definitions/stringArray'
					}
				]
			}
		},
		propertyNames: {
			$ref: '#'
		},
		const: true,
		enum: {
			type: 'array',
			items: true,
			minItems: 1,
			uniqueItems: true
		},
		type: {
			anyOf: [
				{
					$ref: '#/definitions/simpleTypes'
				},
				{
					type: 'array',
					items: {
						$ref: '#/definitions/simpleTypes'
					},
					minItems: 1,
					uniqueItems: true
				}
			]
		},
		format: {
			type: 'string'
		},
		contentMediaType: {
			type: 'string'
		},
		contentEncoding: {
			type: 'string'
		},
		if: {
			$ref: '#'
		},
		then: {
			$ref: '#'
		},
		else: {
			$ref: '#'
		},
		allOf: {
			$ref: '#/definitions/schemaArray'
		},
		anyOf: {
			$ref: '#/definitions/schemaArray'
		},
		oneOf: {
			$ref: '#/definitions/schemaArray'
		},
		not: {
			$ref: '#'
		}
	},
	default: true
}

/**
 * @summary Schema mismatch error
 * @public
 * @type {Error}
 */
exports.SchemaMismatch = class SchemaMismatch extends TypedError {}

/**
 * @summary Incompatible schemas error
 * @public
 * @type {Error}
 */
exports.IncompatibleSchemas = class IncompatibleSchemas extends TypedError {}

/**
 * @summary Invalid schema error
 * @public
 * @type {Error}
 */
exports.InvalidSchema = class InvalidSchema extends TypedError {}

/**
 * @summary Restrict a schema using another schema
 * @function
 * @public
 *
 * @description Removes values from a subject schema so that a value that
 * matches the resulting schema will also validate against the restricting
 * schema.
 *
 * @param {Object} subjectSchema - schema
 * @param {Object} restrictingSchema - schema
 * @returns {Object} restricted schema
 *
 * @example
 * const result = skhema.restrictSchema({
 *	 type: 'object',
 *	 properties: {
 *		 foo: {
 *			 type: 'number'
 *		 },
 *		 bar: {
 *			 type: 'string'
 *		 }
 *	 },
 *	 required: [ 'foo' ]
 * }, {
 *	 type: 'object',
 *	 properties: {
 *		 foo: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 additionalProperties: false,
 *	 required: [ 'foo' ]
 * })
 *
 * console.log(result)
 * > {
 * >   type: 'object',
 * >   properties: {
 * >  	 foo: {
 * >  		 type: 'number'
 * >  	 },
 * >   },
 * >   additionalProperties: false,
 * >   required: [ 'foo' ]
 * > }
 */
exports.restrictSchema = (subjectSchema, restrictingSchema) => {
	jsf.option({
		alwaysFakeOptionals: true
	})

	const subjectNode = jsf.generate(subjectSchema)
	const targetNode = jsf.generate(restrictingSchema)

	const node = merge(subjectNode, targetNode)

	const filteredNode = exports.filter(restrictingSchema, node)

	// Recursively mutate a schema by removing properties that do not appear in
	// object
	const restrict = (schema, object) => {
		if (schema.properties) {
			Object.keys(schema.properties).forEach((key) => {
				if (!object.hasOwnProperty(key)) {
					delete schema.properties[key]
					return
				}

				const value = schema.properties[key]

				if (value.type === 'object') {
					restrict(value, object[key])
				}
			})
		}

		return schema
	}

	const newSchema = restrict(clone(subjectSchema), filteredNode)

	return newSchema
}

/**
 * @summary Score a schema match by specificity
 * @function
 * @public
 *
 * @description Score a matching object and schema based on specificity. Only
 * works with values that are valid against the provided schema
 *
 * @param {Object} schema - JSON schema
 * @param {Object} object - object
 * @returns {Number} score
 *
 * @example
 * const score = skhema.scoreMatch({
 *	 type: 'object'
 * }, {
 *	 foo: 'bar'
 * })
 *
 * console.log(result) // -> 1
 */
exports.scoreMatch = (schema, object) => {
	const keywords = 	 [
		'additionalItems',
		'additionalProperties',
		'const',
		'contains',
		'enum',
		'exclusiveMaximum',
		'exclusiveMinimum',
		'maxItems',
		'maxLength',
		'maxProperties',
		'maximum',
		'minItems',
		'minLength',
		'minProperties',
		'multipleOf',
		'pattern',
		'patternProperties',
		'propertyNames',
		'type',
		'uniqueItems'
	]

	let score = intersection(Object.keys(schema), keywords).length

	// Score one point for each required key
	if (has(schema, 'required')) {
		score += schema.required.length
	}

	if (schema.properties) {
		Object.keys(schema.properties).forEach((key) => {
			const subSchema = schema.properties[key]

			// Only generate a score for keys that exist on the object
			if (has(object, key)) {
				score += exports.scoreMatch(subSchema, object[key])
			}
		})
	}

	if (schema.items && Array.isArray(object)) {
		score += exports.scoreMatch(schema.items, object[0])
	}

	// Because the exact matching subschema can't be found without rerunning
	// validation, just calculate the mean average of all options
	if (schema.anyOf || schema.oneOf) {
		const subSchemas = schema.anyOf || schema.oneOf
		const potentialScores = subSchemas.map((subSchema) => {
			return exports.scoreMatch(subSchema, object)
		})

		score += Math.ceil(mean(potentialScores))
	}

	return score
}

/**
 * @summary Match an object against a schema
 * @function
 * @public
 *
 * @param {Object} schema - JSON schema
 * @param {Object} object - object
 * @param {Object} [options] - options
 * @param {Boolean} [options.schemaOnly=false] - Only validate the schema
 * @returns {Object} results
 *
 * @example
 * const results = skhema.match({
 *	 type: 'object'
 * }, {
 *	 foo: 'bar'
 * })
 *
 * if (!results.valid) {
 *	 for (const error of results.errors) {
 *		 console.error(error)
 *	 }
 * }
 */
exports.match = (() => {
	const ajv = new AJV({
		allErrors: true,
		unknownFormats: 'ignore',
		cache,

		// Don't keep references to all used
		// schemas in order to not leak memory.
		addUsedSchema: false
	})

	ajv
		.addSchema(JSON_SCHEMA_SCHEMA, 'schema')

	configureAjv(ajv)

	return (schema, object, options = {}) => {
		if (!schema) {
			return {
				valid: false,
				errors: [ 'no schema' ],
				score: 0
			}
		}

		if (!ajv.validate('schema', schema) || !schema.type) {
			return {
				valid: false,
				errors: [ 'invalid schema' ],
				score: 0
			}
		}

		const valid = options.schemaOnly ? true : ajv.validate(schema, object)

		return {
			valid,
			errors: valid ? [] : ajv.errorsText().split(', '),
			score: valid ? exports.scoreMatch(schema, object) : 0
		}
	}
})()

/**
 * @summary Check if an object matches a schema
 * @function
 * @public
 *
 * @description
 * This is a shorthand function for `.match()` which can be used
 * if the caller is not interested in the actual error messages.
 *
 * @param {Object} schema - JSON schema
 * @param {Object} object - object
 * @param {Object} [options] - options
 * @param {Boolean} [options.schemaOnly=false] - Only validate the schema
 * @returns {Boolean} whether the object matches the schema
 *
 * @example
 * const isValid = skhema.isValid({
 *	 type: 'object'
 * }, {
 *	 foo: 'bar'
 * })
 *
 * if (isValid) {
 *	 console.log('The object is valid')
 * }
 */
exports.isValid = (schema, object, options = {}) => {
	return exports.match(schema, object, options).valid
}

/**
 * @summary Validate an object and schema and throw if invalid
 * @function
 * @public
 *
 * @description The `.validate()` method will throw if the provided schema isn't
 * valid or if the object doesn't validate against the schema. If you just want
 * to validate a schema, you use the `schemaOnly` option.
 *
 * @param {Object} schema - JSON schema
 * @param {Object} object - object
 * @param {Object} [options] - options
 * @param {Boolean} [options.schemaOnly=false] - Only validate the schema
 *
 * @example
 * skhema.validate({
 *	 type: 'object'
 * }, {
 *	 foo: 'bar'
 * })
 */
exports.validate = (schema, object = {}, options = {}) => {
	const result = exports.match(schema, object, options)
	if (!result.valid) {
		throw new exports.SchemaMismatch([
			'Invalid object:',
			JSON.stringify(object, null, 2),
			result.errors.map((error) => {
				return `- ${error}`
			}).join('\n')
		].join('\n\n'))
	}
}

/**
 * @summary Merge two or more JSON Schemas
 * @function
 * @public
 *
 * @param {Object[]} schemas - a set of JSON Schemas
 * @returns {Object} merged JSON Schema
 * @param {Object} [options] - options
 * @param {Object} [options.resolvers] - Custom resolvers to use when merging
 * keywords
 *
 * @example
 * const result = skhema.merge([
 *	 {
 *		 type: 'string',
 *		 maxLength: 5,
 *		 minLength: 2
 *	 },
 *	 {
 *		 type: 'string',
 *		 maxLength: 3
 *	 }
 * ])
 *
 * console.log(result)
 * > {
 * >	 type: 'string',
 * >	 maxLength: 3,
 * >	 minLength: 2
 * > }
 */
exports.merge = (schemas, options = {}) => {
	// If no schemas are provided, return a "wildcard" skhema
	if (schemas.length === 0) {
		return {
			type: 'object',
			additionalProperties: true
		}
	}

	if (schemas.length === 1 && schemas[0].type) {
		return schemas[0]
	}

	try {
		const mergedSchemas = mergeSchema({
			type: 'object',
			additionalProperties: true,

			// Remove all falsey values from the 'schemas' array
			allOf: schemas.filter((item) => {
				return Boolean(item)
			}).map((schema) => {
				// If the schema has a single 'anyOf' item, we can treat that as
				// a direct key/value mapping. This can happen when dealing with views
				// created by rendition
				if (!schema.anyOf || schema.anyOf.length !== 1) {
					return schema
				}

				const [ anyOf ] = schema.anyOf

				return merge({}, omit(schema, 'anyOf'), anyOf)
			})
		}, {
			resolvers: merge({
				enum: (values) => {
					return uniq(concat(...values))
				},
				anyOf: (values) => {
					return [
						{
							allOf: values.map((anyOf) => {
								return {
									anyOf
								}
							})
						}
					]
				},

				// When resolving the const keyword, later values should override
				// earlier ones
				const: (values) => {
					return values[1]
				}
			}, options.resolvers)
		})

		// As resolvers can't change the key they're attached to, we do some manual
		// clean up here in the event of two anyOf fields being resolved
		if (mergedSchemas.anyOf && mergedSchemas.anyOf.length === 1) {
			const [ anyOf ] = mergedSchemas.anyOf

			return merge(omit(mergedSchemas, 'anyOf'), anyOf)
		}

		return mergedSchemas
	} catch (error) {
		// A terrible way to identify incompatible schemas
		if (error.message.startsWith('Could not resolve values for path')) {
			throw new exports.IncompatibleSchemas(
				'The schemas can\'t be merged')
		}

		throw error
	}
}

/**
 * @summary Map over a schema, applies the function to itslef and to each subschema
 * @function
 * @private
 *
 * @param {Object} schema - schema
 * @param {Funcion} fn - function
 * @returns {Object} mutated schema
 *
 * @example
 * const schema = mapSchema({
 *		type: 'object',
 *		properties: {
 *		 foo: {
 *			 type: 'string'
 *		 }
 *		},
 *		required: [ 'foo' ]
 * }, (subSchema) => {
 *		subSchema.additionalProperties = false
 * })
 *
 * console.log(schema.additionalProperties)
 * > false
 */
const mapSchema = (schema, fn) => {
	if (schema.type !== 'object') {
		return schema
	}

	const rec = (value) => {
		return mapSchema(value, fn)
	}

	// May mutate schema
	const newSchema = fn(schema)

	newSchema.properties = mapValues(newSchema.properties, rec)

	if (newSchema.anyOf) {
		newSchema.anyOf = newSchema.anyOf.map(rec)
	}

	if (newSchema.allOf) {
		newSchema.allOf = newSchema.allOf.map(rec)
	}

	return newSchema
}

/**
 * @summary Force additional properties of a schema
 * @function
 * @private
 *
 * @param {Object} schema - schema
 * @returns {Object} mutated schema
 *
 * @example
 * const schema = allowAdditionalProperties({
 *	 type: 'object',
 *	 properties: {
 *		 foo: {
 *			 type: 'string'
 *		 }
 *	 },
 *	 required: [ 'foo' ]
 * })
 *
 * console.log(schema.additionalProperties)
 * > true
 */
const allowAdditionalProperties = (schema) => {
	return mapSchema(schema, (subSchema) => {
		subSchema.additionalProperties = true
		return subSchema
	})
}

/**
 * @summary Set fields on a schema which are required but do not appear in properties
 * @function
 * @public
 *
 * @param {Object} schema - schema
 * @returns {Object} mutated schema
 *
 * @example
 * const schema = skhema.normaliseRequires({
 *	 type: 'object',
 *	 properties: {},
 *	 required: [ 'foo' ]
 * })
 *
 * console.log(schema.properties)
 * > { foo: { additionalProperties: false } }
 */
exports.normaliseRequires = (schema) => {
	return mapSchema(schema, (subSchema) => {
		if (subSchema.required) {
			subSchema.required.forEach((field) => {
				if (!subSchema.properties[field]) {
					subSchema.properties[field] = {
						additionalProperties: false
					}
				}
			})
		}
		return subSchema
	})
}

/**
 * @summary Filter an object based on a schema
 * @function
 * @public
 *
 * @param {Object} schema - schema
 * @param {Object} object - object
 * @param {Object} [options] - options
 * @param {Boolean} [options.schemaOnly=false] - Only validate the schema
 * @returns {(Object|Null)} filtered object
 *
 * @example
 * const result = skhema.filter({
 *	 type: 'object',
 *	 properties: {
 *		 foo: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 required: [ 'foo' ]
 * }, {
 *	 foo: 1,
 *	 bar: 2
 * })
 *
 * console.log(result)
 * > {
 * >	 foo: 1
 * > }
 */
exports.filter = (() => {
	// Create an instance of AJV that will be used to strip fields from objects
	const filterAjv = new AJV({
		// https://github.com/epoberezkin/ajv#filtering-data
		removeAdditional: true,
		unknownFormats: 'ignore',
		cache,

		// Don't keep references to all used
		// schemas in order to not leak memory.
		addUsedSchema: false
	})

	// Create an instance of AJV that will be used to perform simple matching
	const matchAjv = new AJV({
		allErrors: true,
		unknownFormats: 'ignore',
		cache,

		// Don't keep references to all used
		// schemas in order to not leak memory.
		addUsedSchema: false
	})

	configureAjv(filterAjv)
	configureAjv(matchAjv)

	return (schema, object, options = {}) => {
		if (isUndefined(object)) {
			throw new Error('Object must not be undefined')
		}

		// A flag to help inform the return type
		const calledWithArray = Array.isArray(object)

		// Run all the logic as if this function was called with an array, to help
		// homogenise filter logic
		const items = calledWithArray ? object : [ object ]

		const parse = (thisSchema) => {
			const preparedSchema = exports.normaliseRequires(
				clone(thisSchema)
			)

			// Parse the schema to create a schema that will be used for filtering
			// properties
			const filterValidator = filterAjv.compile(preparedSchema)

			// If the schema uses 'anyOf', each subschema is checked independently. to
			// improve performance when dealing with large collections of elements,
			// validators are created and cached before iterating over the collection
			let fragmentValidators = []
			const baseSchema = omit(preparedSchema, 'anyOf')

			if (preparedSchema.anyOf) {
				fragmentValidators = preparedSchema.anyOf.map((fragment) => {
					const mergedFragment = combineWithBaseSchema(
						baseSchema,
						fragment
					)

					return {
						match: matchAjv.compile(
							allowAdditionalProperties(mergedFragment)
						),
						fragment
					}
				})
			}

			// Reduce is used here due to the behaviour of the AJV `removeAdditional`
			// option, which mutates the object
			const result = []
			for (const item of items) {
				const baseValidator = matchAjv.compile(
					allowAdditionalProperties(clone(baseSchema))
				)

				// Only continue if the base schema matches
				if (baseValidator(item)) {
					const matchers = collectMatchers(item, fragmentValidators)

					// If no branches match we return the main schema validator
					if (matchers.length === 0) {
						if (filterValidator(item)) {
							result.push(item)
						}
					} else {
						// Otherwise we merge the branch fragments together to create a new filterValidator
						const filterSchema = makeFilter(baseSchema, matchers)

						// Check if there are still `anyOf` branches to resolve
						if (filterSchema.anyOf) {
							return parse(filterSchema)
						}

						const mergedFilterValidator = filterAjv.compile(filterSchema)

						if (mergedFilterValidator(item)) {
							result.push(item)
						}
					}
				}
			}

			// If the function was called with an array, return an array, otherwise
			// return the first array element, or null if its undefined
			if (calledWithArray) {
				return result
			}

			return result[0] || null
		}

		try {
			return parse(schema)
		} catch (error) {
			if (error.message.startsWith('schema is invalid:')) {
				throw new exports.InvalidSchema(error.message)
			}

			throw error
		}
	}
})()

/**
 * @summary Collect all the filters that match a certain item
 * @function
 * @private
 *
 * @param {Object} item - item to check against
 * @param {Object[]} candidates - candidate matchers
 * @returns {Object[]} valid matchers
 *
 * @example
 * const result = collectMatchers({
 *	 foo: 1
 * }, [{
 *	 type: 'object',
 *	 properties: {
 *		 foo: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 required: [ 'foo' ]
 *	}, {
 *	 type: 'object',
 *	 properties: {
 *		 bar: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 required: [ 'bar' ]
 * }])
 *
 * console.log(result)
 * > [{
 *	 type: 'object',
 *	 properties: {
 *		 foo: {
 *			 type: 'number'
 *		 },
 *	 },
 *	 required: [ 'foo' ]
 * }]
 */
const collectMatchers = (item, candidates) => {
	return candidates.filter((matcher) => {
		return matcher.match(item)
	})
}

/**
 * @summary Combine an array of matched anyOf together
 * @function
 * @private
 *
 * @param {Object[]} matchers - matchers
 * @returns {Object} filter schema
 *
 * @example
 * const result = combineMatchers([{
 *	 type: 'object',
 *	 properties: {
 *		 foo: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 required: [ 'foo' ]
 * }, {
 *	 type: 'object',
 *	 properties: {
 *		 bar: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 required: [ 'bar' ]
 * }])
 *
 * console.log(result)
 * > {
 *	 type: 'object',
 *	 properties: {
 *		 foo: {
 *			 type: 'number'
 *		 },
 *		 bar: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 required: [ 'foo', 'bar' ]
 * }
 */
const combineMatchers = (matchers) => {
	return matchers.reduce((left, right) => {
		return combineAnyOf(left, right.fragment)
	}, {})
}

/**
 * @summary Makes a filter out of matching branches
 * @function
 * @private
 *
 * @param {Object} baseSchema - base schema
 * @param {Object[]} matchers - matchers
 * @returns {Object} filter schema
 *
 * @example
 * const result = makeFilter({
 *	 type: 'object',
 *	 properties: {
 *		 foo: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 required: [ 'foo' ]
 * }, [{
 *	 type: 'object',
 *	 properties: {
 *		 bar: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 required: [ 'bar' ]
 * }])
 *
 * console.log(result)
 * > {
 *	 type: 'object',
 *	 properties: {
 *		 foo: {
 *			 type: 'number'
 *		 },
 *		 bar: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 required: [ 'foo', 'bar' ],
 *	 additionalProperties: false
 * }
 */
const makeFilter = (baseSchema, matchers) => {
	const mergedFragment = combineWithBaseSchema(
		baseSchema,
		combineMatchers(matchers))
	return mergedFragment
}

/**
 * @summary Combine anyOf branches
 * @function
 * @private
 *
 * @param {Object} left - left
 * @param {Object} right - right
 * @returns {Object} merged schema
 *
 * @example
 * const result = combineAnyOf({
 *	 type: 'object',
 *	 properties: {
 *		 foo: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 required: [ 'foo' ]
 * }, {
 *	 type: 'object',
 *	 properties: {
 *		 bar: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 required: [ 'bar' ]
 * })
 *
 * console.log(result)
 * > {
 *	 type: 'object',
 *	 properties: {
 *		 foo: {
 *			 type: 'number'
 *		 },
 *		 bar: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 required: [ 'foo', 'bar' ]
 * }
 */
const combineAnyOf = (left, right) => {
	return combineSchemas(left, right,
		/* eslint-disable consistent-return */
		(objectValue, sourceValue, key, object, source) => {
			if (Array.isArray(objectValue) && key !== 'enum') {
				return union(objectValue, sourceValue)
			}

			if (key === 'enum') {
				return uniq(sourceValue)
			}

			if (key === 'additionalProperties') {
				if (isUndefined(sourceValue) &&
					isUndefined(objectValue)) {
					return true
				}
				if (isUndefined(sourceValue)) {
					return Boolean(objectValue)
				}
				if (isUndefined(objectValue)) {
					return Boolean(sourceValue)
				}
				return Boolean(objectValue) || Boolean(sourceValue)
			}
		}
	)
}

/**
 * @summary Combine branch with base schema
 * @function
 * @private
 *
 * @param {Object} baseSchema - base schema
 * @param {Object} fragment - fragment
 * @returns {Object} merged schema
 *
 * @example
 * const result = combineWithBaseSchema({
 *	 type: 'object',
 *	 properties: {
 *		 foo: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 required: [ 'foo' ],
 *	 additionalProperties: false
 * }, {
 *	 type: 'object',
 *	 properties: {
 *		 bar: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 required: [ 'bar' ],
 *	 additionalProperties: true
 * })
 *
 * console.log(result)
 * > {
 *	 type: 'object',
 *	 properties: {
 *		 foo: {
 *			 type: 'number'
 *		 },
 *		 bar: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 required: [ 'foo', 'bar' ],
 *	 additionalProperties: false
 * }
 */
const combineWithBaseSchema = (baseSchema, fragment) => {
	return combineSchemas(baseSchema, fragment,
		/* eslint-disable consistent-return */
		(objectValue, sourceValue, key, object, source) => {
			if (Array.isArray(objectValue) && key !== 'enum') {
				return union(objectValue, sourceValue)
			}

			// When combining with the baseSchema
			// the enum values need to be merged together with an AND operator
			// to do this we recreate the subschema to use allOf
			if (sourceValue && objectValue && sourceValue.enum && objectValue.enum) {
				const {
					enum: enumObject, ...restObject
				} = objectValue

				const {
					enum: enumSource, ...restSource
				} = sourceValue

				const newObject =	merge(restSource, restObject)

				if (!newObject.allOf) {
					newObject.allOf = []
				}

				newObject.allOf.push({
					enum: enumObject
				}, {
					enum: enumSource
				})

				return newObject
			}

			if (key === 'enum') {
				return uniq(sourceValue)
			}

			if (key === 'additionalProperties') {
				if (isUndefined(sourceValue) &&
					isUndefined(objectValue)) {
					return false
				}
				if (isUndefined(sourceValue)) {
					return Boolean(objectValue)
				}
				if (isUndefined(objectValue)) {
					return Boolean(sourceValue)
				}
				return Boolean(objectValue) && Boolean(sourceValue)
			}
			if (
				key === 'properties' &&
				sourceValue &&
				source.additionalProperties === false
			) {
				return clone(sourceValue)
			}
		}
	)
}

/**
 * @summary Combine two schemas
 * @function
 * @private
 *
 * @param {Object} left - schema
 * @param {Object} right - schema
 * @param {Function} customizer - function describing how to merge additionalProperties
 * @returns {Object} merged schema
 *
 * @example
 * const result = combineSchemas({
 *	 type: 'object',
 *	 properties: {
 *		 foo: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 required: [ 'foo' ],
 *	 additionalProperties: false
 * }, {
 *	 type: 'object',
 *	 properties: {
 *		 bar: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 required: [ 'bar' ],
 *	 additionalProperties: false
 * }, () => true)
 *
 * console.log(result)
 * > {
 *	 type: 'object',
 *	 properties: {
 *		 foo: {
 *			 type: 'number'
 *		 },
 *		 bar: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 required: [ 'foo', 'bar' ],
 *	 additionalProperties: true
 * }
 */
const combineSchemas = (left, right, customizer) => {
	// Merge fragment schema with scehma values defined at the top level
	// - Defaults schema `type` to 'object'
	// - Removes any $id attribute, as we may be compiling the same $id
	//   multiple times
	return omit(mergeWith(
		{
			type: 'object'
		},
		left,
		right,
		customizer
	), [ '$id' ])
}
