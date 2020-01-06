HotFilter
=========

HotFilter is a library for noticing recurring data. Given a value, it will
return whether it has (probably) seen that value more than n times recently.

```javascript
const HotFilter = require("hotfilter");

let width = 16;
let depth = 3;
let filter = new HotFilter(width, depth);

for (let item of items) {
    if (filter.touch(item)) {
        // item has probably been seen more than 3 times recently
    }
}
```

## API

### new HotFilter (width, depth[, demoteAt])

Creates a new filter with `depth` stages of `width` bits.

| Name     | Default | Description                                 |
| -------- | ------- | ------------------------------------------- |
| width    |         | Size of each stage, in bits as a power of 2 |
| depth    |         | The number of filter stages                 |
| demoteAt | 0.01    | The probability at which stages are demoted |

HotFilter is similar to a bloom filter, but with a temporal component. It has
`depth` bitfields of 2^`width` bits, each of which has a unique hash function.

Every time `touch()` is run, it marks that key in the deepest stage which has
not yet seen it. Rather than the single shared field used by bloom filters,
this allows for the gradual insertion of values over time while still retaining
the high efficiency of bloom filters.

Whenever the probability of collision in the first stage rises above
`demoteAt`, the first stage is discarded (the second stage becomes the first
stage etc.) and a new stage is added at the end.

### .touch(key)

Returns `true` if `key` has been seen more than `depth` times recently, where
'recently' means within the demotion lifetime of the filter stages, or false
otherwise.

HotFilter is available [via npm](https://www.npmjs.com/package/hotfilter):
```bash
npm install hotfilter
```

