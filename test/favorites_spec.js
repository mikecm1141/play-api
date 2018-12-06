process.env.NODE_ENV = 'test';

const chai = require('chai');
const should = chai.should();
const chaiHttp = require('chai-http');
const server = require('../server');

const environment = process.env.NODE_ENV = 'test';
const configuration = require('../knexfile')[environment];
const database = require('knex')(configuration);

chai.use(chaiHttp);

describe('GET /api/v1/songs', () => {
  beforeEach((done) => {
    database.migrate.rollback()
      .then(() => {
        database.migrate.latest()
          .then(() => {
            database.seed.run()
            .then(() => done())
            .catch(error => {
              throw error;
            });
          });
      });
  });

  it('should return all favorited songs', done => {
    chai.request(server)
    .get('/api/v1/songs')
    .end((error, response) => {
      response.should.have.status(200);
      response.should.be.json;
      done();
    });
  });

  it('should return song by id', done => {
    chai.request(server)
    .get('/api/v1/songs/2')
    .end((error, response) => {
      response.should.have.status(200);
      response.should.be.json;
      response.body[0].name.should.equal('Fooey')
      response.body[0].artist_name.should.equal('Bobbie')
      response.body[0].genre.should.equal('Rap')
      response.body[0].song_rating.should.equal(62)
      done();
    })
  });
});
