const fs = require('fs');
const async = require('async');
const _ = require('lodash');
const Benchmark = require('benchmark');
const beauty = require('beautify-benchmark');

const {
  asket,
} = require('ancient-asket/lib/asket');

const {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString
} = require('graphql');

const benchmarks = {
  'array of objects of keys': {
    'asket': () => {
      const resolver = flow => new Promise((resolve) => {
        if (flow.key === 'results') {
          resolve({ ...flow, data: [{ q: 1, w: 2, },{ q: 3, w: 4, }] });
        } else if (flow.key === 'a') {
          resolve({ ...flow, data: flow.path[flow.path.length - 2].data.q });
        } else if (flow.key === 'b') {
          resolve({ ...flow, data: flow.path[flow.path.length - 2].data.w });
        } else {
          resolve({ ...flow, data: {} });
        }
      });
      return {
        fn(defer) {
          asket({
            query: { schema: { fields: { results: { fields: { a: {}, }, }, }, }, },
            resolver,
          }).then((result) => {
            defer.resolve();
          });
        },
        defer: true,
      };
    },
    'graphql': () => {
      const {
        graphql,
        GraphQLSchema,
        GraphQLObjectType,
        GraphQLList,
        GraphQLString
      } = require('graphql');
      
      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'root',
          fields: {
            results: {
              resolve() {
                return [{ q: 1, w: 2, },{ q: 3, w: 4, }];
              },
              type: new GraphQLList(
                new GraphQLObjectType({
                  name: 'item',
                  fields: {
                    a: {
                      type: GraphQLString,
                      resolve(item) {
                        return String(item.q);
                      }
                    },
                    c: {
                      type: GraphQLString,
                      resolve(item) {
                        return String(item.w);
                      }
                    },
                  },
                }),
              ),
            },
          },
        }),
      });
      return {
        fn(defer) {
          graphql(schema, `{ results { a } }`)
          .then((result) => {
            defer.resolve();
          })
        },
        defer: true,
      };
    },
  },
};

const createSuite = (benchmarks, count) => {
  const suite = new Benchmark.Suite();
  for (let t in benchmarks) suite.add(t, benchmarks[t](count));
  return suite;
};

const createSuites = (benchmarks) => {
  const suites = {};
  for (let n in benchmarks) suites[n] = createSuite(benchmarks[n]);
  return suites;
};

const suites = createSuites(benchmarks);

const launch = (suites) => {
  async.eachSeries(
    _.keys(suites),
    (suiteName, next) => {
      console.log(suiteName);
      suites[suiteName].on('cycle', (event) => beauty.add(event.target));
      suites[suiteName].on('complete', (event) => {
        beauty.log();
        next();
      });
      suites[suiteName].run({ async: true });
    },
  );
};

module.exports = {
  benchmarks,
  createSuite,
  createSuites,
  suites,
  launch,
};
