const marky = require('marky')
const skhema = require('..')
const Bluebird = require('bluebird')
const percentile = require('percentile')
const _ = require('lodash')

const ITERATIONS = 100
const multipleAnyOfSchema = require('./multiple-anyof-schema.json')
const multipleAnyOfElements = require('./multiple-anyof-elements.json')
const nestedAnyOfSchema = require('./nested-anyof-schema.json')
const nestedAnyOfElements = require('./nested-anyof-elements.json')

const logSummary = (entries, title) => {
	if (title) {
		console.log('--------------------')
		console.log(title.toUpperCase())
		console.log('--------------------')
	}

	console.log('\n==== SUMMARY\n')
	const durations = _.sortBy(_.map(entries, 'duration'))

	_.each([ 80, 90, 95, 99 ], (percentage) => {
		console.log(`${percentage}th -> ${percentile(percentage, durations)}ms`)
	})
	console.log(`worst: ${_.last(durations)}\n\n`)
}

Bluebird.each(new Array(ITERATIONS), (_item, index) => {
	marky.mark(`${index}`)
	const element = skhema.filter(multipleAnyOfSchema, _.cloneDeep(multipleAnyOfElements))
	marky.stop(`${index}`)
})
.then(() => {
	const entries = marky.getEntries()
	logSummary(entries, 'MULTIPLE ANYOF')
})
.then(() => {
	return Bluebird.each(new Array(ITERATIONS), (_item, index) => {
		marky.mark(`${index}`)
		const element = skhema.filter(nestedAnyOfSchema, _.cloneDeep(nestedAnyOfElements))
		marky.stop(`${index}`)
	})
	.then(() => {
		const entries = marky.getEntries()
		logSummary(entries, 'NESTED ANYOF')
	})
})
