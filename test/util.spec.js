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
const util = require('../lib/util')

ava.test('.isString() should return false if the value is a POJO', (test) => {
	test.false(util.isString({}))
})

ava.test('.isString() should return false if the value is a boolean', (test) => {
	test.false(util.isString(true))
})

ava.test('.isString() should return false if the value is null', (test) => {
	test.false(util.isString(null))
})

ava.test('.isString() should return false if the value is undefined', (test) => {
	test.false(util.isString())
})

ava.test('.isString() should return false if the value is a number', (test) => {
	test.false(util.isString(1234))
})

ava.test('.isString() should return false if the value is a function', (test) => {
	test.false(util.isString(() => {
		return true
	}))
})

ava.test('.isString() should return true if the value is a string', (test) => {
	test.true(util.isString('foobar'))
})

ava.test('.isString() should return true if the value is an empty string', (test) => {
	test.true(util.isString(''))
})

ava.test('.has() should return false if the value does not have the declared key', (test) => {
	test.false(util.has({
		foo: 'bar'
	}, 'baz'))
})

ava.test('.has() should return true if the value has the declared key', (test) => {
	test.true(util.has({
		foo: 'bar'
	}, 'foo'))
})

ava.test('.isUndefined() should return false if the value is a POJO', (test) => {
	test.false(util.isUndefined({}))
})

ava.test('.isUndefined() should return false if the value is a boolean', (test) => {
	test.false(util.isUndefined(true))
})

ava.test('.isUndefined() should return false if the value is null', (test) => {
	test.false(util.isUndefined(null))
})

ava.test('.isUndefined() should return false if the value is a number', (test) => {
	test.false(util.isUndefined(1234))
})

ava.test('.isUndefined() should return false if the value is a function', (test) => {
	test.false(util.isUndefined(() => {
		return true
	}))
})

ava.test('.isUndefined() should return false if the value is a string', (test) => {
	test.false(util.isUndefined('foobar'))
})

ava.test('.isUndefined() should return false if the value is an empty string', (test) => {
	test.false(util.isUndefined(''))
})

ava.test('.isUndefined() should return true if the value is undefined', (test) => {
	test.true(util.isUndefined())
})

ava.test('.mean() should return the mean value from an array', (test) => {
	test.is(util.mean([ 1, 2, 3 ]), 2)
})
