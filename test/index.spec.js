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

const ava = require('ava')
const jsf = require('json-schema-faker')
const merge = require('lodash.merge')
const range = require('lodash.range')
const uniq = require('lodash.uniq')
const skhema = require('..')
const metaSchema = require('./meta-schema.json')
const MERGE_TEST_CASES = require('./merge.json')
const SCORE_TEST_CASES = require('./score.json')

const AXIOM_ITERATIONS = 100
const SCHEMA_ITERATIONS = 50

jsf.option({
	optionalsProbability: 0.8
})

// Restrict required fields to prevent properties from appearing twice
const generateValidSchema = (schema) => {
	const result = jsf.generate(schema)
	result.required = uniq(result.required)
	return skhema.normaliseRequires(result)
}

ava.test('.match() should validate a matching object', (test) => {
	const result = skhema.match({
		type: 'object'
	}, {
		foo: 'bar'
	})

	test.deepEqual(result, {
		valid: true,
		errors: [],
		score: 1
	})
})

ava.test('.match() should report back an error if no schema', (test) => {
	const result = skhema.match(null, {
		foo: 'bar'
	})

	test.deepEqual(result, {
		valid: false,
		errors: [
			'no schema'
		],
		score: 0
	})
})

ava.test('.match() should report back a single error', (test) => {
	const result = skhema.match({
		type: 'object',
		properties: {
			foo: {
				type: 'number'
			}
		}
	}, {
		foo: 'bar'
	})

	test.deepEqual(result, {
		valid: false,
		errors: [
			'data.foo should be number'
		],
		score: 0
	})
})

ava.test('.match() should report back more than one error', (test) => {
	const result = skhema.match({
		type: 'object',
		properties: {
			foo: {
				type: 'number'
			},
			bar: {
				type: 'string'
			}
		},
		required: [ 'foo', 'bar' ]
	}, {
		foo: 'bar'
	})

	test.deepEqual(result, {
		valid: false,
		errors: [
			'data.foo should be number',
			'data should have required property \'bar\''
		],
		score: 0
	})
})

ava.test('.match() should not match if the schema is not a valid schema', (test) => {
	const result = skhema.match({
		hello: 'foobar'
	}, {
		foo: 'bar'
	})

	test.deepEqual(result, {
		valid: false,
		errors: [
			'invalid schema'
		],
		score: 0
	})
})

ava.test('.match() should not fail if an unknown format is used', (test) => {
	const schema = {
		type: 'string',
		format: 'foobar'
	}

	const testValue = 'foobar'

	test.true(skhema.match(schema, testValue).valid)
})

ava.test('.isValid() should return true if there is a match', (test) => {
	const result = skhema.isValid({
		type: 'object'
	}, {
		foo: 'bar'
	})

	test.true(result)
})

ava.test('.isValid() should return false if there is no match', (test) => {
	const result = skhema.isValid({
		type: 'object',
		properties: {
			foo: {
				type: 'number'
			}
		}
	}, {
		foo: 'bar'
	})

	test.false(result)
})

ava.test('.isValid() should pass if an unknown format is used', (test) => {
	const schema = {
		type: 'string',
		format: 'foobar'
	}

	const testValue = 'foobar'

	test.true(skhema.isValid(schema, testValue))
})

ava.test('.isValid() should allow keywords to be added', (test) => {
	const schema = {
		type: 'string',
		regexp: {
			pattern: 'OBA',
			flags: 'i'
		}
	}

	const testValue = 'foobar'

	test.is(
		skhema.isValid(schema, testValue, {
			keywords: [ 'regexp' ]
		}),
		true
	)
})

ava.test('.validate() should not throw if the object matches the schema', (test) => {
	test.notThrows(() => {
		skhema.validate({
			type: 'object'
		}, {
			foo: 'bar'
		})
	})
})

ava.test('.validate() with options.schemaOnly should not throw if the schema is valid', (test) => {
	test.notThrows(() => {
		skhema.validate({
			type: 'object',
			properties: {
				foo: {
					type: 'string'
				}
			},
			require: [ 'foo' ]
		}, null, {
			schemaOnly: true
		})
	})
})

ava.test('.validate() with options.schemaOnly should throw if the schema is invalid', (test) => {
	test.throws(() => {
		skhema.validate({
			type: 'object',
			properties: {
				foo: {
					type: 'string',
					enum: [ 'a', 'a' ]
				}
			},
			require: [ 'foo' ]
		}, null, {
			schemaOnly: true
		})
	})
})

ava.test('.validate() should throw if there is a single error', (test) => {
	test.throws(() => {
		skhema.validate({
			type: 'object',
			properties: {
				foo: {
					type: 'number'
				}
			}
		}, {
			foo: 'bar'
		})
	}, skhema.SchemaMismatch)
})

ava.test('.validate() should throw if there is more than one error', (test) => {
	test.throws(() => {
		skhema.validate({
			type: 'object',
			properties: {
				foo: {
					type: 'number'
				},
				bar: {
					type: 'string'
				}
			},
			required: [ 'foo', 'bar' ]
		}, {
			foo: 'bar'
		})
	}, skhema.SchemaMismatch)
})

ava.test('.validate() should throw if the schema is not valid', (test) => {
	test.throws(() => {
		skhema.validate({
			type: 'object',
			properties: {
				name: {
					enum: [ 'foo', 'foo' ]
				}
			}
		})
	})
})

ava.test('.validate() should not fail if an unknown format is used', (test) => {
	const schema = {
		type: 'string',
		format: 'foobar'
	}

	const testValue = 'foobar'

	test.notThrows(() => {
		skhema.validate(schema, testValue)
	})
})

ava.test('.validate() should allow keywords to be added', (test) => {
	const schema = {
		type: 'string',
		regexp: {
			pattern: 'OBA',
			flags: 'i'
		}
	}

	const testValue = 'foobar'

	test.notThrows(() => {
		skhema.validate(schema, testValue, {
			keywords: [ 'regexp' ]
		})
	})
})

ava.test('.filter() should throw an error if no object is provided', (test) => {
	test.throws(() => {
		skhema.filter({
			type: 'object'
		})
	})
})

ava.test('.filter() should throw on an invalid schema', (test) => {
	test.throws(() => {
		skhema.filter({
			type: 'object',
			properties: {
				foo: {
					enum: 1
				}
			}
		}, {
			foo: 'bar'
		})
	}, skhema.InvalidSchema)
})

ava.test('.filter() should remove additional properties from a top level object', (test) => {
	const element = {
		foo: 1,
		bar: 'foo',
		baz: 'qux'
	}

	const result = skhema.filter({
		type: 'object',
		properties: {
			foo: {
				type: 'number'
			},
			bar: {
				type: 'string'
			}
		},
		required: [ 'foo', 'bar' ],
		additionalProperties: false
	}, element)

	test.deepEqual(result, {
		foo: 1,
		bar: 'foo'
	})
})

ava.test('.filter() should not remove properties given explicit additionalProperties', (test) => {
	const result = skhema.filter({
		type: 'object',
		additionalProperties: true,
		properties: {
			foo: {
				type: 'number'
			},
			bar: {
				type: 'string'
			}
		},
		required: [ 'foo', 'bar' ]
	}, {
		foo: 1,
		bar: 'foo',
		baz: 'qux'
	})

	test.deepEqual(result, {
		foo: 1,
		bar: 'foo',
		baz: 'qux'
	})
})

ava.test('.filter() should return null if there is no match', (test) => {
	const result = skhema.filter({
		type: 'object',
		properties: {
			foo: {
				type: 'number'
			},
			bar: {
				type: 'string'
			}
		},
		required: [ 'foo', 'bar' ]
	}, {
		foo: 'hello',
		bar: 'foo',
		baz: 'qux'
	})

	test.deepEqual(result, null)
})

ava.test('.filter() should remove additional properties from a nested object', (test) => {
	const value = {
		foo: 1,
		bar: {
			baz: 'hello',
			qux: {
				foo: 'bar'
			}
		},
		baz: 'qux'
	}

	const result = skhema.filter({
		type: 'object',
		properties: {
			foo: {
				type: 'number'
			},
			bar: {
				type: 'object',
				properties: {
					baz: {
						type: 'string'
					}
				},
				required: [ 'baz' ],
				additionalProperties: false
			}
		},
		required: [ 'foo', 'bar' ],
		additionalProperties: false
	}, value)

	test.deepEqual(result, {
		foo: 1,
		bar: {
			baz: 'hello'
		}
	})
})

ava.test('.filter() should correctly interpret fragments inside anyOf', (test) => {
	const element = {
		foo: 'hello',
		bar: 'foo',
		baz: 'qux'
	}

	const result = skhema.filter({
		type: 'object',
		anyOf: [
			{
				properties: {
					foo: {
						type: 'string'
					}
				},
				additionalProperties: false
			}
		]
	}, element)

	test.deepEqual(result, {
		foo: 'hello'
	})
})

ava.test('.filter() should correctly use top level properties when interpreting fragments inside anyOf', (test) => {
	const element = {
		foo: 'hello',
		bar: 'foo',
		baz: 'qux'
	}

	const result = skhema.filter({
		type: 'object',
		anyOf: [
			{
				properties: {
					foo: {
						type: 'string'
					}
				}
			}
		],
		properties: {
			bar: {
				type: 'string'
			}
		},
		additionalProperties: false
	}, element)

	test.deepEqual(result, {
		foo: 'hello',
		bar: 'foo'
	})
})

ava.test('.filter() should insert fields which are required', (test) => {
	const schema = {
		type: 'object',
		properties: {},
		required: [ 'foo' ]
	}

	const element = {
		foo: true
	}

	test.is(true, skhema.isValid(schema, element))

	const filtered = skhema.filter(schema, element)

	test.is(true, skhema.isValid(schema, filtered))
})

ava.test('\
.filter() if additionalProperties is undefined, it should behave the same as \
"additionalProperties: true" \
', (test) => {
	const users = [
		{
			id: '1',
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			id: '2',
			slug: 'user-johndoe',
			type: 'user'
		}
	]

	const result1 = skhema.filter({
		properties: {
			slug: {
				type: 'string'
			}
		}
	}, users)

	test.deepEqual(result1, [
		{
			id: '1',
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			id: '2',
			slug: 'user-johndoe',
			type: 'user'
		}
	])

	const result2 = skhema.filter({
		properties: {
			slug: {
				type: 'string'
			}
		},
		additionalProperties: true
	}, users)

	test.deepEqual(result1, result2)
})

ava.test('\
.filter() when merging anyOf branch against base schema, if \
additionalProperties is false on the anyOf, then the anyOf properties \
overwrite the base properties for simple schemas \
', (test) => {
	const users = [
		{
			id: '1',
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			id: '2',
			slug: 'user-johndoe',
			type: 'user'
		}
	]

	const result = skhema.filter({
		type: 'object',
		anyOf: [
			{
				type: 'object',
				properties: {
					slug: {
						type: 'string'
					}
				},
				required: [ 'slug' ],
				additionalProperties: false
			}
		],
		required: [ 'type' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'user'
			}
		}
	}, users)

	test.deepEqual(result, [
		{
			slug: 'user-janedoe'
		}, {
			slug: 'user-johndoe'
		}
	])
})

ava.test('\
.filter() when merging anyOf branch against base schema, if \
additionalProperties is false on the anyOf, then the anyOf properties overwrite \
the base properties for schemas with nested objects \
', (test) => {
	const users = [
		{
			id: '1',
			slug: 'user-janedoe',
			type: 'user',
			data: {
				password: 'password123',
				email: 'janedoe@example.com'
			}
		},
		{
			id: '2',
			slug: 'user-johndoe',
			type: 'user',
			data: {
				password: 'Password!1',
				email: 'janedoe@example.com'
			}
		}
	]

	const result = skhema.filter({
		type: 'object',
		anyOf: [
			{
				type: 'object',
				properties: {
					slug: {
						type: 'string'
					},
					data: {
						type: 'object',
						properties: {
							email: {
								type: 'string'
							}
						},
						additionalProperties: false
					}
				},
				required: [ 'slug', 'data' ],
				additionalProperties: true
			}
		],
		properties: {
			type: {
				type: 'string',
				const: 'user'
			},
			data: {
				type: 'object',
				properties: {
					password: {
						type: 'string'
					}
				},
				additionalProperties: true
			}
		},
		required: [ 'type', 'data' ],
		additionalProperties: true
	}, users)

	test.deepEqual(result, [
		{
			id: '1',
			slug: 'user-janedoe',
			type: 'user',
			data: {
				email: 'janedoe@example.com'
			}
		},
		{
			id: '2',
			slug: 'user-johndoe',
			type: 'user',
			data: {
				email: 'janedoe@example.com'
			}
		}
	])
})

ava.test('.filter() The additionalProperties property is not defaulted to false in anyOf branches', (test) => {
	const users = [
		{
			id: '1',
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			id: '2',
			slug: 'user-johndoe',
			type: 'user'
		}
	]

	const implicit = skhema.filter({
		type: 'object',
		anyOf: [
			{
				type: 'object',
				properties: {
					slug: {
						type: 'string'
					}
				},
				required: [ 'slug' ]
			}
		],
		properties: {
			type: {
				type: 'string',
				const: 'user'
			}
		},
		required: [ 'type' ],
		additionalProperties: false
	}, users)

	test.deepEqual(implicit, [
		{
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			slug: 'user-johndoe',
			type: 'user'
		}
	])
})

ava.test('.filter() "additionalProperties: true" is respected inside an anyOf branch', (test) => {
	const users = [
		{
			id: '1',
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			id: '2',
			slug: 'user-johndoe',
			type: 'user'
		}
	]

	const result = skhema.filter({
		type: 'object',
		anyOf: [
			{
				type: 'object',
				properties: {
					slug: {
						type: 'string'
					}
				},
				required: [ 'slug' ],
				additionalProperties: true
			}
		],
		properties: {
			type: {
				type: 'string',
				const: 'user'
			}
		},
		required: [ 'type' ],
		additionalProperties: false
	}, users)

	test.deepEqual(result, [
		{
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			slug: 'user-johndoe',
			type: 'user'
		}
	])
})

ava.test('\
.filter() if additionalProperties is true on the base schema and undefined \
inside the anyOf branch, no values should be filtered \
', (test) => {
	const users = [
		{
			id: '1',
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			id: '2',
			slug: 'user-johndoe',
			type: 'user'
		}
	]

	const result = skhema.filter({
		type: 'object',
		anyOf: [
			{
				type: 'object',
				properties: {
					slug: {
						type: 'string'
					}
				},
				required: [ 'slug' ]
			}
		],
		required: [ 'type' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'user'
			}
		}
	}, users)

	test.deepEqual(result, [
		{
			id: '1',
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			id: '2',
			slug: 'user-johndoe',
			type: 'user'
		}
	])
})

ava.test('\
.filter() if additionalProperties is true on the base schema and false inside \
the anyOf branch, values should be filtered, but the anyOf properties will \
override the base schema properties \
', (test) => {
	const users = [
		{
			id: '1',
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			id: '2',
			slug: 'user-johndoe',
			type: 'user'
		}
	]

	const result = skhema.filter({
		type: 'object',
		anyOf: [
			{
				type: 'object',
				properties: {
					slug: {
						type: 'string'
					}
				},
				required: [ 'slug' ],
				additionalProperties: false
			}
		],
		required: [ 'type' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'user'
			}
		}
	}, users)

	test.deepEqual(result, [
		{
			slug: 'user-janedoe'
		},
		{
			slug: 'user-johndoe'
		}
	])
})

ava.test('\
.filter() if additionalProperties is false on the base schema and true \
inside the anyOf branch, values should be filtered by combining the base \
schema and anyOf branch properties \
', (test) => {
	const users = [
		{
			id: '1',
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			id: '2',
			slug: 'user-johndoe',
			type: 'user'
		}
	]

	const result = skhema.filter({
		type: 'object',
		anyOf: [
			{
				type: 'object',
				properties: {
					slug: {
						type: 'string'
					}
				},
				required: [ 'slug' ],
				additionalProperties: true
			}
		],
		required: [ 'type' ],
		additionalProperties: false,
		properties: {
			type: {
				type: 'string',
				const: 'user'
			}
		}
	}, users)

	test.deepEqual(result, [
		{
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			slug: 'user-johndoe',
			type: 'user'
		}
	])
})

ava.test('axioms: match(a) => match(filter(a))', (test) => {
	// This only holds if the generated schema does not have required fields
	// which are not present in properties
	range(SCHEMA_ITERATIONS).forEach(() => {
		const schema = generateValidSchema(metaSchema)

		range(AXIOM_ITERATIONS).forEach(() => {
			const element = jsf.generate(schema)

			const shouldPass = skhema.match(schema, element)

			test.is(shouldPass.valid, true)

			const filtered = skhema.filter(schema, element)

			const filterResult = skhema.match(schema, filtered)

			test.is(filterResult.valid, true)
		})
	})
})

ava.test('.filter() should correctly handle "enum" inside "anyOf" with a matching element', (test) => {
	const element = {
		type: 'user',
		data: {
			test: 1
		}
	}

	const result = skhema.filter({
		type: 'object',
		properties: {
			type: {
				type: 'string',
				enum: [ 'user', 'user@1.0.0' ]
			},
			data: {
				type: 'object',
				additionalProperties: true
			}
		},
		anyOf: [
			{
				type: 'object',
				required: [ 'type', 'data' ],
				properties: {
					type: {
						type: 'string',
						enum: [ 'message', 'message@1.0.0' ]
					},
					data: {
						type: 'object',
						additionalProperties: false
					}
				}
			},
			{
				type: 'object',
				required: [ 'type', 'data' ],
				properties: {
					type: {
						type: 'string',
						enum: [ 'user', 'user@1.0.0' ]
					},
					data: {
						type: 'object',
						additionalProperties: false
					}
				}
			}
		]
	}, element)

	test.deepEqual(result, {
		type: 'user',
		data: {}
	})
})

ava.test('.filter() should correctly handle "enums" without modifing them', (test) => {
	// Comment
	const object = {
		id: 'ccdca138-e686-486c-a5df-6661be1102a9',
		slug: 'support-thread-test-thread-10eb964c-70e6-4a50-a0d6-364111416cdd',
		type: 'support-thread',
		active: true,
		version: '1.0.0',
		name: 'test thread',
		tags: [],
		markers: [],
		created_at: '2019-12-02T11:38:44.949Z',
		links: {},
		requires: [],
		capabilities: [],
		data: {
			status: 'open'
		},
		updated_at: null,
		linked_at: {
			'has attached element': '2019-12-02T11:38:45.071Z'
		}
	}

	const schema = {
		type: 'object',
		anyOf: [
			{
				type: 'object',
				properties: {
					type: {
						type: 'string',
						enum: [
							'support-thread'
						]
					}
				}
			}
		],
		properties: {
			type: {
				enum: [
					'message'
				]
			}
		}
	}

	const result = skhema.filter(schema, object)
	test.deepEqual(result, null)
})

ava.test('.filter() should correctly handle "enum" inside "anyOf" with a non matching element', (test) => {
	const element = {
		type: 'message',
		data: {
			test: 1
		}
	}

	const result = skhema.filter({
		type: 'object',
		properties: {
			type: {
				type: 'string',
				enum: [ 'message' ]
			},
			data: {
				type: 'object',
				additionalProperties: true
			}
		},
		anyOf: [
			{
				type: 'object',
				required: [ 'type', 'data' ],
				properties: {
					type: {
						type: 'string',
						enum: [ 'user', 'user@1.0.0' ]
					},
					data: {
						type: 'object',
						additionalProperties: false
					}
				}
			}
		]
	}, element)

	test.deepEqual(result, null)
})

ava.test('axioms: filter(a) == filter(filter(a))', (test) => {
	range(SCHEMA_ITERATIONS).forEach(() => {
		const schema = generateValidSchema(metaSchema)

		range(AXIOM_ITERATIONS).forEach(() => {
			const element = jsf.generate(schema)

			const firstPass = skhema.filter(schema, element)

			test.deepEqual(firstPass, skhema.filter(schema, firstPass))
		})
	})
})

ava.test('normaliseRequires(): will set a property named foo with additionalProperties: false', (test) => {
	const schema = {
		properties: {
			bar: {
				type: 'integer'
			}
		},
		required: [
			'foo',
			'bar'
		],
		additionalProperties: false,
		type: 'object'
	}

	const validSchema = skhema.normaliseRequires(schema)

	test.deepEqual({
		properties: {
			bar: {
				type: 'integer'
			},
			foo: {
				additionalProperties: false
			}
		},
		required: [
			'foo',
			'bar'
		],
		additionalProperties: false,
		type: 'object'
	}, validSchema)
})

ava.test('\
.filter() If multiple matching anyOf branches match should be merged correctly \
when both have additionalProperties: false \
', (test) => {
	const users = [
		{
			id: '1',
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			id: '2',
			slug: 'user-johndoe',
			type: 'user'
		}
	]

	const result = skhema.filter({
		type: 'object',
		anyOf: [
			{
				properties: {
					slug: {
						type: 'string',
						const: 'user-janedoe'
					}
				},
				additionalProperties: false,
				required: [ 'slug' ]
			},
			{
				properties: {
					type: {
						type: 'string',
						const: 'user'
					}
				},
				additionalProperties: false,
				required: [ 'type' ]
			}
		],
		properties: {
			id: {
				type: 'string'
			}
		},
		additionalProperties: true
	}, users)

	test.deepEqual(result, [
		{
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			type: 'user'
		}
	])
})

ava.test('\
.filter() If multiple matching anyOf branches match should be merged correctly \
when both have additionalProperties: false and are in a different order \
', (test) => {
	const users = [
		{
			id: '1',
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			id: '2',
			slug: 'user-johndoe',
			type: 'user'
		}
	]

	const result = skhema.filter({
		type: 'object',
		anyOf: [
			{
				properties: {
					type: {
						type: 'string',
						const: 'user'
					}
				},
				additionalProperties: false,
				required: [ 'type' ]
			},
			{
				properties: {
					slug: {
						type: 'string',
						const: 'user-janedoe'
					}
				},
				additionalProperties: false,
				required: [ 'slug' ]
			}
		],
		properties: {
			id: {
				type: 'string'
			}
		},
		additionalProperties: true
	}, users)

	test.deepEqual(result, [
		{
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			type: 'user'
		}
	])
})

ava.test('\
.filter() If multiple matching anyOf branches match should be merged correctly \
when one has additionalProperties: true and the other has false \
', (test) => {
	const users = [
		{
			id: '1',
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			id: '2',
			slug: 'user-johndoe',
			type: 'user'
		}
	]

	const result = skhema.filter({
		type: 'object',
		anyOf: [
			{
				properties: {
					slug: {
						type: 'string',
						const: 'user-janedoe'
					}
				},
				additionalProperties: true,
				required: [ 'slug' ]
			},
			{
				properties: {
					type: {
						type: 'string',
						const: 'user'
					}
				},
				additionalProperties: false,
				required: [ 'type' ]
			}
		],
		properties: {
			id: {
				type: 'string'
			}
		},
		additionalProperties: true
	}, users)

	test.deepEqual(result, [
		{
			id: '1',
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			type: 'user'
		}
	])
})

ava.test('\
.filter() If multiple matching anyOf branches match should be merged correctly \
when both have additionalProperties: true \
', (test) => {
	const users = [
		{
			id: '1',
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			id: '2',
			slug: 'user-johndoe',
			type: 'user'
		}
	]

	const result = skhema.filter({
		type: 'object',
		anyOf: [
			{
				properties: {
					slug: {
						type: 'string',
						const: 'user-janedoe'
					}
				},
				additionalProperties: true,
				required: [ 'slug' ]
			},
			{
				properties: {
					type: {
						type: 'string',
						const: 'user'
					}
				},
				additionalProperties: true,
				required: [ 'type' ]
			}
		],
		properties: {
			id: {
				type: 'string'
			}
		},
		additionalProperties: true
	}, users)

	test.deepEqual(result, [
		{
			id: '1',
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			id: '2',
			slug: 'user-johndoe',
			type: 'user'
		}
	])
})

ava.test('.filter() should pick properties correctly when using anyOf', (test) => {
	const result = skhema.filter({
		type: 'object',
		anyOf: [
			{
				properties: {
					foo: {
						type: 'string'
					}
				},
				required: [ 'foo' ]
			},
			{
				properties: {
					baz: {
						type: 'string'
					}
				},
				required: [ 'baz' ]
			}
		],
		properties: {
			bar: {
				type: 'string'
			}
		}
	}, [
		{
			foo: 'foo',
			bar: 'bar',
			baz: 'baz'
		},
		{
			foo: 'foo',
			bar: 'bar'
		},
		{
			baz: 'baz',
			bar: 'bar'
		},
		{
			bar: 'bar'
		},
		{
			quz: 'quz'
		},
		{
			foo: 'foo',
			baz: 'baz'
		}
	])

	test.deepEqual(result, [
		{
			foo: 'foo',
			bar: 'bar',
			baz: 'baz'
		},
		{
			foo: 'foo',
			bar: 'bar'
		},
		{
			baz: 'baz',
			bar: 'bar'
		},
		{
			foo: 'foo',
			baz: 'baz'
		}
	])
})

ava.test('.filter() should not fail if an unknown format is used', (test) => {
	const schema = {
		type: 'string',
		format: 'foobar'
	}

	const testValue = 'foobar'

	test.notThrows(() => {
		skhema.filter(schema, testValue)
	})
})

ava.test('.filter() should allow keywords to be added', (test) => {
	const schema = {
		type: 'string',
		regexp: {
			pattern: 'OBA',
			flags: 'i'
		}
	}

	const testValue = 'foobar'

	test.deepEqual(
		skhema.filter(schema, testValue, {
			keywords: [ 'regexp' ]
		}),
		testValue
	)
})

MERGE_TEST_CASES.forEach((testCase, index) => {
	ava.test(`.merge() should merge test case ${index}`, (test) => {
		if (testCase.expected) {
			const result = skhema.merge(testCase.schemas)
			test.deepEqual(result, testCase.expected)
		} else {
			test.throws(() => {
				skhema.merge(testCase.schemas)
			}, skhema.IncompatibleSchemas)
		}
	})
})

ava.test('.merge() should ignore null values', (test) => {
	const schemas = [
		{
			type: 'object',
			properties: {
				foo: {
					type: 'string'
				}
			},
			required: [ 'foo' ]
		},
		null
	]

	const result = skhema.merge(schemas)

	test.deepEqual(result, {
		type: 'object',
		additionalProperties: true,
		required: [
			'foo'
		],
		properties: {
			foo: {
				type: 'string'
			}
		}
	})
})

ava.test('.merge() should not modify the `anyOf` field on an argument schema', (test) => {
	const schemas = [
		{
			type: 'object',
			anyOf: [
				{
					properties: {
						foo: {
							type: 'string'
						}
					},
					required: [ 'foo' ]
				}
			]
		},
		{
			type: 'object',
			properties: {
				foo: {
					type: 'string'
				}
			},
			required: [ 'foo' ]
		}
	]

	skhema.merge(schemas)

	test.deepEqual(schemas[0], {
		type: 'object',
		anyOf: [
			{
				properties: {
					foo: {
						type: 'string'
					}
				},
				required: [ 'foo' ]
			}
		]
	})
})

ava.test('.merge() should add `additionalProperties` true, if merging an empty array', (test) => {
	const schemas = []

	const finalSchema = skhema.merge(schemas)

	test.deepEqual(finalSchema, {
		type: 'object',
		additionalProperties: true
	})
})

ava.test('.merge() should allow custom resolvers to be provided', (test) => {
	const schema1 = {
		$$links: {
			'has attached element': {
				type: 'object',
				properties: {
					id: {
						type: 'string'
					}
				}
			}
		}
	}

	const schema2 = {
		$$links: {
			'has attached element': {
				type: 'object',
				properties: {
					slug: {
						type: 'string'
					}
				}
			}
		}
	}

	const finalSchema = skhema.merge([ schema1, schema2 ], {
		resolvers: {
			$$links: (values) => {
				return merge(values[0], values[1])
			}
		}
	})

	test.deepEqual(finalSchema, {
		$$links: {
			'has attached element': {
				type: 'object',
				properties: {
					id: {
						type: 'string'
					},
					slug: {
						type: 'string'
					}
				}
			}
		},
		type: 'object',
		additionalProperties: true
	})
})

SCORE_TEST_CASES.forEach((testCase, index) => {
	ava.test(`.scoreMatch() should merge test case ${index}`, (test) => {
		const result = skhema.scoreMatch(testCase.schema, testCase.object)
		test.is(result, testCase.expected)
	})
})

ava.test('.filter() Should pick second anyOf branch despite the first one not matching', (test) => {
	const element = {
		id: 'd5da0783-2531-45af-be38-806e1ea4490c',
		slug: 'view-all-views',
		type: 'view'
	}

	const schema = {
		type: 'object',
		anyOf: [
			{
				additionalProperties: true,
				properties: {
					slug: {
						const: 'user-naaxqdmxcursvae1bj4vzhf63oqv80cz',
						type: 'string'
					}
				},
				required: [
					'slug'
				],
				type: 'object'
			},
			{
				additionalProperties: true,
				properties: {
					id: {
						type: 'string'
					}
				},
				required: [
					'id'
				],
				type: 'object'
			}
		],
		properties: {
			type: {
				type: 'string',
				const: 'view'
			}
		}
	}

	const filtered = skhema.filter(schema, element)

	test.not(filtered, null)
})

ava.test('.filter() should correctly filter using nested anyOf statements', (test) => {
	const element = {
		id: '1',
		slug: 'user-janedoe',
		type: 'user'
	}

	const schema = {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				const: 'user'
			}
		},
		anyOf: [
			{
				type: 'object',
				anyOf: [
					{
						properties: {
							slug: {
								const: 'user-janedoe',
								type: 'string'
							}
						},
						required: [
							'slug'
						],
						type: 'object',
						additionalProperties: true
					}
				]
			}
		],
		required: [
			'type'
		],
		additionalProperties: false
	}

	const filtered = skhema.filter(schema, element)

	test.deepEqual(filtered, {
		slug: 'user-janedoe',
		type: 'user'
	})
})

ava.test('.filter() should not match if the root properties field does not match', (test) => {
	const schema = {
		type: 'object',
		properties: {
			slug: {
				type: 'string',
				const: 'foo'
			}
		},
		anyOf: [ {
			type: 'object',
			properties: {
				slug: {
					type: 'string',
					const: 'bar'
				}
			}
		} ],
		required: [ 'slug' ]
	}

	const element = {
		slug: 'bar'
	}

	const result = skhema.filter(schema, element)

	test.is(result, null)
})

ava.test('.restrictSchema() should remove conflicting schema properties', (test) => {
	const subjectSchema = {
		type: 'object',
		properties: {
			slug: {
				type: 'string',
				pattern: '^user-[a-z0-9-]+$'
			},
			data: {
				type: 'object',
				properties: {
					email: {
						type: 'string',
						format: 'email'
					},
					password: {
						type: 'object',
						properties: {
							hash: {
								type: 'string',
								pattern: '^[a-f0-9]+$'
							}
						},
						required: [ 'hash' ]
					},
					roles: {
						type: 'array',
						items: {
							type: 'string',
							pattern: '^[a-z0-9-]+$'
						}
					}
				},
				required: [
					'email',
					'roles'
				]
			}
		},
		required: [ 'slug', 'data' ]
	}

	const restrictiveSchema = {
		type: 'object',
		properties: {
			id: {
				type: 'string'
			},
			slug: {
				type: 'string',
				not: {
					enum: [
						'user-admin',
						'user-guest',
						'user-actions'
					]
				}
			},
			type: {
				type: 'string',
				const: 'user'
			},
			data: {
				type: 'object',
				required: [ 'email', 'roles' ],
				additionalProperties: false,
				properties: {
					email: {
						type: 'string'
					},
					roles: {
						type: 'array'
					}
				}
			}
		},
		required: [ 'id', 'slug', 'type', 'data' ]
	}

	test.deepEqual(skhema.restrictSchema(subjectSchema, restrictiveSchema), {
		type: 'object',
		properties: {
			slug: {
				type: 'string',
				pattern: '^user-[a-z0-9-]+$'
			},
			data: {
				type: 'object',
				properties: {
					email: {
						type: 'string',
						format: 'email'
					},
					roles: {
						type: 'array',
						items: {
							type: 'string',
							pattern: '^[a-z0-9-]+$'
						}
					}
				},
				required: [
					'email',
					'roles'
				]
			}
		},
		required: [ 'slug', 'data' ]
	})
})

ava.test('.restrictSchema() should correctly handle const', (test) => {
	const subjectSchema = {
		type: 'object',
		properties: {
			slug: {
				type: 'string',
				pattern: 'my_username'
			}
		},
		required: [ 'slug' ]
	}

	const restrictiveSchema = {
		type: 'object',
		properties: {
			id: {
				type: 'number',
				const: 12345
			}
		},
		required: [ 'slug' ]
	}

	test.deepEqual(skhema.restrictSchema(subjectSchema, restrictiveSchema), {
		type: 'object',
		properties: {
			slug: {
				type: 'string',
				pattern: 'my_username'
			}
		},
		required: [ 'slug' ]
	})
})
