const tape = require('tape');
const bluebird = require('bluebird');
const sequentialise = require('./index.js');

const fail = t => e => { t.fail(e) };

tape('wraps an object transparently, returning object with get as if it was the object', (t) => {
  const object = {
    foo: x => bluebird.delay(100).then(() => x),
    bar: () => 'bar',
    notafunc: 'hmmm',
  };
  const linear = sequentialise(object);

  t.ok(linear instanceof Object);
  t.ok(typeof linear.foo === 'function');
  t.ok(typeof linear.bar === 'function');
  t.same(linear.notafunc, 'hmmm');
  t.end();
});

tape('methods return promises that eventually return the same results as if called on proxied object', (t) => {
  const object = {
    delayed: x => bluebird.delay(10).then(() => x),
    immediate: (a, b) => a + b,
  };
  const linear = sequentialise(object);
  const args = { ok: 'yes', no: null };
  const delayedPromise = linear.delayed(args);
  t.ok(delayedPromise instanceof Promise);
  delayedPromise.then((result) => {
    t.same(result, args);
  }).catch(fail(t));
  const immediatePromise = linear.immediate(2, 3);
  t.ok(immediatePromise instanceof Promise);
  immediatePromise.then((result) => {
    t.same(result, 5);
    t.end();
  }).catch(fail(t));
});

tape('functions are executed sequentially', (t) => {
  const object = {
    delayed: x => bluebird.delay(100).then(() => x),
    immediate: () => 'immediate',
  };
  const linear = sequentialise(object);
  let count = 0;
  linear.delayed('ok').then((result) => {
    count++;
    t.same(result, 'ok');
    t.same(count, 1);
  }).catch(fail(t));
  linear.immediate().then(() => {
    count++;
    t.same(count, 2);
    t.end();
  }).catch(fail(t));
});

tape('when passed arguents more than the original method expects, the last is passed as options to the promise queue', (t) => {
  let retryCount = 0;
  let count = 0;
  const retry = 3;
  const object = {
    delayed: (d, x) => bluebird.delay(d).then(() => x),
    noargs: () => {
      retryCount += 1;
      console.log('count error', retryCount);
      if (retryCount < retry) throw Error('opps');
      return 'no args';
    },
  };
  const linear = sequentialise(object);
  // test retry options
  linear.noargs({ attempts: 4 }).then((res) => {
    count++;
    t.same(count, 1);
    t.same(res, 'no args');
  }).catch(fail(t));
  // test priority
  linear.delayed(100, 'last', { priority: 1 }).then((res) => {
    count++;
    t.same(count, 5);
    t.same(res, 'last');
  }).catch(fail(t));

  linear.delayed(10, 'third', { priority: 2 }).then((res) => {
    count++;
    t.same(count, 3);
    t.same(res, 'third');
  }).catch(fail(t));

  linear.delayed(10, 'fouth', { priority: 2 }).then((res) => {
    count++;
    t.same(count, 4);
    t.same(res, 'fouth');
    t.end();
  }).catch(fail(t));

  linear.delayed(10, 'second', { priority: 4 }).then((res) => {
    count++;
    t.same(count, 2);
    t.same(res, 'second');
  }).catch(fail(t));
});

tape('accepts second argument as options object with ignore property being an array of method names not to sequentialise', (t) => {
  const object = {
    delayed: x => bluebird.delay(100).then(() => x),
    immediate: () => 'immediate',
    ignore: () => 'ignored',
  };
  const linear = sequentialise(object, { ignore: ['immediate', 'ignore'] });
  const delayed = linear.delayed('ok');
  t.notOk(linear.ignore() instanceof Promise);
  t.notOk(linear.immediate() instanceof Promise);
  t.ok(delayed instanceof Promise);
  delayed.then((result) => {
    t.same(result, 'ok');
    t.end();
  }).catch(fail(t));
  t.same(linear.ignore(), 'ignored');
  t.same(linear.immediate(), 'immediate');
});

tape('accepts second argument as options object with promise property being constructor for promise type', (t) => {
  const object = {
    identity: x => x,
  };
  const linear = sequentialise(object, { promise: bluebird });
  const identity = linear.identity('ok');
  t.ok(identity instanceof bluebird);
  identity.then((v) => {
    t.same(v, 'ok');
    t.end();
  })
  .catch(fail(t));
});
