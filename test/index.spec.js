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

const _ = require('lodash')
const ava = require('ava')
const skhema = require('..')
const MERGE_TEST_CASES = require('./merge.json')
const SCORE_TEST_CASES = require('./score.json')

const customFormats = {
	foobar: (value) => {
		return value === 'foobar'
	}
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

ava.test('.match() should fail if an unknown format is used', (test) => {
	const schema = {
		type: 'string',
		format: 'foobar'
	}

	const testValue = 'foobar'

	test.throws(() => {
		skhema.match(schema, testValue)
	})
})

ava.test('.match() should allow custom formats to be added', (test) => {
	const schema = {
		type: 'string',
		format: 'foobar'
	}

	const testValue = 'foobar'

	test.is(
		skhema.match(schema, testValue, {
			customFormats
		}).valid,
		true
	)
})

ava.test('.match() should allow keywords to be added', (test) => {
	const schema = {
		type: 'string',
		regexp: {
			pattern: 'OBA',
			flags: 'i'
		}
	}

	const testValue = 'foobar'

	test.is(
		skhema.match(schema, testValue, {
			keywords: [ 'regexp' ]
		}).valid,
		true
	)
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

ava.test('.isValid() should fail if an unknown format is used', (test) => {
	const schema = {
		type: 'string',
		format: 'foobar'
	}

	const testValue = 'foobar'

	test.throws(() => {
		skhema.isValid(schema, testValue)
	})
})

ava.test('.isValid() should allow custom formats to be added', (test) => {
	const schema = {
		type: 'string',
		format: 'foobar'
	}

	const testValue = 'foobar'

	test.is(
		skhema.isValid(schema, testValue, {
			customFormats
		}),
		true
	)
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

ava.test('.validate() should not throw if the schema is valid', (test) => {
	test.notThrows(() => {
		skhema.validate({
			type: 'object'
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

ava.test('.validate() should fail if an unknown format is used', (test) => {
	const schema = {
		type: 'string',
		format: 'foobar'
	}

	const testValue = 'foobar'

	test.throws(() => {
		skhema.validate(schema, testValue)
	})
})

ava.test('.validate() should allow custom formats to be added', (test) => {
	const schema = {
		type: 'string',
		format: 'foobar'
	}

	const testValue = 'foobar'

	test.notThrows(() => {
		skhema.validate(schema, testValue, {
			customFormats
		})
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

ava.test('.filter() should remove additional properties from a top level object', (test) => {
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
		foo: 1,
		bar: 'foo',
		baz: 'qux'
	})

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

ava.test('.filter() should not remove properties given explicit additionalProperties and force: true', (test) => {
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
	}, {
		force: true
	})

	test.deepEqual(result, {
		foo: 1,
		bar: 'foo'
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
				required: [ 'baz' ]
			}
		},
		required: [ 'foo', 'bar' ]
	}, {
		foo: 1,
		bar: {
			baz: 'hello',
			qux: {
				foo: 'bar'
			}
		},
		baz: 'qux'
	})

	test.deepEqual(result, {
		foo: 1,
		bar: {
			baz: 'hello'
		}
	})
})

ava.test('.filter() should correctly interpret fragments inside anyOf', (test) => {
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
		]
	}, {
		foo: 'hello',
		bar: 'foo',
		baz: 'qux'
	})

	test.deepEqual(result, {
		foo: 'hello'
	})
})

ava.test('.filter() should correctly use top level properties when interpreting fragments inside anyOf', (test) => {
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
		}
	}, {
		foo: 'hello',
		bar: 'foo',
		baz: 'qux'
	})

	test.deepEqual(result, {
		foo: 'hello',
		bar: 'foo'
	})
})

ava.test('.filter() should fail if an unknown format is used', (test) => {
	const schema = {
		type: 'string',
		format: 'foobar'
	}

	const testValue = 'foobar'

	test.throws(() => {
		skhema.filter(schema, testValue)
	})
})

ava.test('.filter() should allow custom formats to be added', (test) => {
	const schema = {
		type: 'string',
		format: 'foobar'
	}

	const testValue = 'foobar'

	test.deepEqual(
		skhema.filter(schema, testValue, {
			customFormats
		}),
		testValue
	)
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

_.each(MERGE_TEST_CASES, (testCase, index) => {
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

_.each(SCORE_TEST_CASES, (testCase, index) => {
	ava.test(`.scoreMatch() should merge test case ${index}`, (test) => {
		const result = skhema.scoreMatch(testCase.schema, testCase.object)
		test.is(result, testCase.expected)
	})
})
