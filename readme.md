# Sequentialise

[![Build Status](https://travis-ci.org/e-e-e/sequentialise.svg?branch=master)](https://travis-ci.org/e-e-e/sequentialise) [![Coverage Status](https://coveralls.io/repos/github/e-e-e/sequentialise/badge.svg?branch=master)](https://coveralls.io/github/e-e-e/sequentialise?branch=master)

Sequentialise is a simple utility for creating simple Proxy objects that force all of an object’s methods to be run sequentially.

This was originally developed to as a helper for querying Sqlite3. Sqlite is limited to one connection at a time and as such is prone to timeout errors when there is heavy querying load. By passing our database object to sequentialise we were able to ensure each query was executed in order and avoid timeout errors.

This library may also be useful for async api interfaces which require enforced linearity.

## Install

```
npm install sequentialise
```

## Interface

`var seqObject = sequentialise(Object toWrap, [Object options])`
Returns a new Proxy of object passed in as the functions first arguments.
Example options:
```js
{
  promise: Promise, // The flavour of promises you want to use. Defaults to native promises
  ignore: ['method', 'names', 'you', 'don’t', 'want', 'sequentialised'], // Array of methods to ignore
}
```

`seqObject.[ALL_METHODS](...args, [Object options])`
All sequentialised methods return promises, which are resolved or rejected in the order in which they are executed.
Example options:
```js
  {
    attempts: number, // if method fails it will retry this many times.
    priority: number, // execution is ordered by priority default = 0.
  }
```

## Caveats

1. Sequentialised methods **can not** reference one another. This will make deadlock condition where the method called within a method is waiting for that one to finish before it can proceed, this will never happens as it is waiting for the nested method to return.
2. Sequentialised methods **should not** use new ES6 ...rest arguments. ...rest arguments are not counted in `function.length` which confuses the calculations used to determine the options argument added by sequentialise.

## How to use

```js
var sequentialise = require('sequentialise');

var delay = (ms) => () => new Promise(resolve => setTimeout(resolve, ms));

var anObject = {
  post: (id, data) => {
    console.log('POST', id, 'with', data);
    return delay(100);
  },
  get: (id) => {
    console.log('GET', id);
    return delay(10);
  },
  echo: (message) => {
    return 'echo:' + message;
  },
  ignoreMe: () => {
    console.log('i can happen whenever');
  }
};

var seqObject = sequentialise(anObject, { ignore: ['ignoreMe'] });

seqObject.post(1, 'this');
seqObject.echo('ping').then(console.log); // original functions don't need to be asynchronous
seqObject.post(2, 'that');
seqObject.post(3, 'and this');
seqObject.get(1, { priority: 1 }); // get takes priority over post
seqObject.ignoreMe(); // happens immediately.
```
