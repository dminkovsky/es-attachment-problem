var ES_HOST = process.env.ES_HOST || 'http://172.17.42.1:9200';
var PDF_URL = 'https://bug1134506.bugzilla.mozilla.org/attachment.cgi?id=8566794';
var INDEX = 'test_index';
var TYPE = 'files';

var elasticsearch = require('elasticsearch');
var Promise = require('bluebird');
var request = Promise.promisifyAll(require('request'));

var client = new elasticsearch.Client({ host: ES_HOST });

var MAPPINGS = {};
MAPPINGS[TYPE] = {
    properties: {
        file: {
            type: 'attachment',
            fields: {
                file: {
                    type: 'string',
                    term_vector: 'with_positions_offsets',
                    store: true
                }
            }
        }
    }
};

function ensureIndex(client, name, mappings) {
    return client.indices.exists({ index: name }).then(function(exists) {
        if (exists) {
            return;
        }
        return client.indices.create({
            index: name,
            body: {
                mappings: mappings
            }
        });
    });
}

ensureIndex(client, INDEX, MAPPINGS).then(function() {
    return request.getAsync(PDF_URL);
}).spread(function(response, body) {
    return client.create({
        index: INDEX,
        type: TYPE,
        body: {
            file: (new Buffer(body)).toString('base64')
        }
    });        
}).catch(function(error) {
    console.log(error.stack);
}).finally(function() {
    client.close();
});
