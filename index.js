const PromiseQueue = require('a-promise-queue');

function sequentialise(obj, opts) {
  const P = (opts && opts.promise) ? opts.promise : Promise;
  const ignore = (opts && Array.isArray(opts.ignore)) ? opts.ignore : [];

  const queue = new PromiseQueue(null, P);

  const handler = {
    get(target, propKey, receiver) {
      if (propKey === 'promiseQueue') return queue;
      const origMethod = target[propKey];
      if (typeof origMethod !== 'function' || (ignore.includes(propKey))) return origMethod;
      return (...args) => {
        const queueOptions = (args.length > origMethod.length) ? args.pop() : undefined;
        return queue.add(origMethod.bind(receiver, ...args), queueOptions);
      };
    },
  };
  return new Proxy(obj, handler);
}

module.exports = sequentialise;
