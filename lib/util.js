const concat = require('lodash/concat')
const intersection = require('lodash/intersection')
const mapValues = require('lodash/mapValues')
const merge = require('lodash/merge')
const mergeWith = require('lodash/mergeWith')
const omit = require('lodash/omit')
const union = require('lodash/union')
const uniq = require('lodash/uniq')

exports.isString = (value) => {
	return Object.prototype.toString.call(value) === '[object String]'
}

exports.has = (object, key) => {
	return object ? object.hasOwnProperty(key) : false
}

exports.isUndefined = (value) => {
	// eslint-disable-next-line no-undefined
	return value === undefined
}

exports.mean = (array) => {
	let sum = 0
	for (const value of array) {
		sum += value
	}

	return sum / array.length
}

exports.concat = concat
exports.intersection = intersection
exports.mapValues = mapValues
exports.merge = merge
exports.mergeWith = mergeWith
exports.omit = omit
exports.union = union
exports.uniq = uniq
