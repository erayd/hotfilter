/*                                 ISC License
 *
 * Copyright (c) 2020, Erayd LTD
 *
 * Permission to use, copy, modify, and/or distribute this software for any purpose
 * with or without fee is hereby granted, provided that the above copyright notice
 * and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT,
 * OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE,
 * DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS
 * ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

"use strict";

const Bitfield = require("bitfield");
const crypto = require("crypto");

module.exports = class HotFilter {
    constructor(width, depth, demoteAt = 0.01) {
        Object.defineProperties(this, {
            width: { value: width, writable: false, enumerable: true },
            depth: { value: depth, writable: false, enumerable: true },
            demoteAt: { value: demoteAt, writable: false, enumerable: true },
            touch: { value: touch, writable: false, enumerable: false },
            get: { value: get, writable: false, enumerable: false }
        });

        var lifetime = 0;

        // create a new bitfield & seed for each level
        var filter = [];
        var seed = [];
        while (depth--) {
            filter.push(new Bitfield(1 << width));
            let hash = crypto.createHash("sha1");
            hash.update(Buffer.from([depth]));
            seed.push(hash.digest().readUInt32LE() & ((1 << width) - 1));
        }

        // use node's native crypto to produce hash values quickly
        function hash(data) {
            let hash = crypto.createHash("sha1");
            hash.update(data);
            return hash.digest().readUInt32LE() & ((1 << width) - 1);
        }

        // clamp key values to something hashable
        function clamp(key) {
            // clamp key value (converted types are prefixed to avoid collision; e.g.
            // n and "n" look the same when n is converted to a string for hashing,
            // but they should be considered unique, as they differ in type)
            if (typeof key === "number") {
                let prefix = "fuD4ElwE4r7z";
                key = prefix + key.toString();
            }

            return key;
        }

        // check or touch a key value
        function slot(key, touch = false) {
            let h = hash(clamp(key));
            let i;
            for (i = 0; i < this.depth; i++) {
                if (!filter[i].get(h ^ seed[i])) {
                    if (touch) {
                        filter[i].set(h ^ seed[i]);
                    } else if (i === 0) {
                        return 0;
                    }
                    break;
                }
            }

            return ++i;
        }

        // touch a key value
        function touch(key) {
            let i = slot.call(this, key, true);

            // run demotion
            if (i === 1) {
                ++lifetime;
                if (1 - Math.exp(-1 / ((1 << width) / lifetime)) >= demoteAt) {
                    lifetime = 0;
                    seed.push(seed.shift());
                    filter.shift();
                    filter.push(new Bitfield(1 << width));
                }
            }

            // current number of times this item has been touched
            return i;
        }

        // get a key's current depth
        function get(key) {
            return slot.call(this, key, false);
        }
    }
};
