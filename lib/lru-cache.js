/*
 * Copyright 2019 resin.io
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

const LRU = require('lru-cache')

// Its fine if its big, as long as it has a limit.
const MAX_CACHE_SIZE = 500

module.exports = class LRUCache {
	constructor () {
		this.lru = new LRU(MAX_CACHE_SIZE)
	}

	put (key, value) {
		this.lru.set(key, value)
	}

	get (key) {
		return this.lru.get(key)
	}

	del (key) {
		this.lru.del(key)
	}

	clear () {
		this.lru.reset()
	}
}
