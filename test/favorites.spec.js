process.env.NODE_ENV = 'test';

const chai = require('chai');
const should = chai.should();
const chaiHttp = require('chai-http');
const server = require('../server');

const environment = process.env.NODE_ENV || 'development';
const configuration = require('../knexfile')[environment];
const database = require('knex')(configuration);

chai.use(chaiHttp);

describe('API Songs Endpoint', () => {
  beforeEach((done) => {
    database.migrate.rollback()
      .then(() => {
        database.migrate.latest()
          .then(() => {
            return database.seed.run()
            .then(() => done())
            .catch(error => {
              throw error;
            });
          });
      });
  });
  
  describe('PATCH /api/v1/songs/:id', () => {
    it('should update a song', done => {
      chai.request(server)
        .patch('/api/v1/songs/1')
        .send({
          name: 'Foobar'
        })
        .end((err, res) => {
          res.should.have.status(200);
          res.should.be.json;
          res.should.be.a('Object');
          res.body.should.have.property('songs');
          res.body.songs.should.have.property('id');
          res.body.songs.should.have.property('name');
          res.body.songs.should.have.property('artist_name');
          res.body.songs.should.have.property('genre');
          res.body.songs.should.have.property('song_rating');
          res.body.songs.name.should.equal('Foobar');
          done();
        });
    });

    it('should return 404 if song ID not found', done => {
      chai.request(server)
        .patch('/api/v1/songs/1000')
        .send({
          name: 'Foobat'
        })
        .end((err, res) => {
          res.should.have.status(404);
          res.should.be.json;
          res.should.be.a('Object');
          res.body.should.have.property('error');
          res.body.error.should.equal('Song with ID 1000 not found');
          done();
        });
    });

    it('should return a 400 if invalid parameters', done => {
      chai.request(server)
        .patch('/api/v1/songs/1')
        .send({
          name: 'Valid field',
          album: 'Invalid field'
        })
        .end((err, res) => {
          res.should.have.status(400);
          res.should.be.json;
          res.should.be.a('Object');
          res.body.should.have.property('error');
          res.body.error.should.equal('Invalid parameter field <album>');
          done();
        });
    });
  });

  describe('DELETE /api/v1/songs/:id', () => {
    it('should delete a song', done => {
      let songCount;

      database('songs').select()
        .then(songs => {
          songCount = songs.length;
        })
        .then(() => {
          chai.request(server)
            .delete('/api/v1/songs/1')
            .end((err, response) => {
              response.should.have.status(204);
              songCount--;
            });
        })
        .then(() => {
          database('songs').select()
            .then(songs => {
              songs.length.should.equal(songCount);
            })
            .catch(error => console.error({ error }));
        })
        .catch(error => console.error({ error }));
      done();
    });

    it('should return an error if song does not exist', done => {
      chai.request(server)
        .delete('/api/v1/songs/5000')
        .end((err, response) => {
          response.should.have.status(404);
          response.should.be.json;
          response.should.be.a('Object');
          response.body.should.have.property('message');
          response.body.message.should.equal('Song with ID 5000 not found');
          done();
        })
    });
  });

  describe('POST /api/v1/songs', () => {
    it('should create a new song in the database', done => {
      chai.request(server)
        .post('/api/v1/songs')
        .send({
          name: 'Test Song',
          artist_name: 'Test Artist',
          genre: 'Test Genre',
          song_rating: 100
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.should.be.json;
          res.should.be.a('Object');
          res.body.should.have.property('songs');
          res.body.songs.should.have.property('id');
          res.body.songs.should.have.property('name');
          res.body.songs.should.have.property('artist_name');
          res.body.songs.should.have.property('genre');
          res.body.songs.should.have.property('song_rating');
          done();
        })
    });

    it('should not create song if song rating is invalid', done => {
      chai.request(server)
        .post('/api/v1/songs')
        .send({
          name: 'Test Song',
          artist_name: 'Test Artist',
          genre: 'Test Genre',
          song_rating: 202042
        })
        .end((err, res) => {
          res.should.have.status(400)
          res.should.be.json;
          res.should.be.a('Object');
          res.should.have.property('error');
          done();
        })
    });

    it('should not create a song if parameters are missing', done => {
      chai.request(server)
        .post('/api/v1/songs')
        .send({
          name: '',
          artist_name: '',
          genre: '',
          song_rating: ''
        })
        .end((err, res) => {
          res.should.have.status(400)
          res.should.be.json;
          res.should.be.a('Object');
          res.should.have.property('error');
          done();
        })
    });
  });

  describe('GET /api/v1/songs', () => {
    it('should return all favorited songs', done => {
      chai.request(server)
        .get('/api/v1/songs')
        .end((error, response) => {
          response.should.have.status(200);
          response.should.be.json;
          response.should.be.a('Object')
          response.body.should.be.a('Array');
          response.body[0].should.have.property('id');
          response.body[0].should.have.property('name');
          response.body[0].should.have.property('artist_name');
          response.body[0].should.have.property('genre');
          response.body[0].should.have.property('song_rating');
          done();
        });
    });
  });

  describe('GET /api/v1/songs/:id', () => {
    it('should return song by id', done => {
      chai.request(server)
      .get('/api/v1/songs/2')
      .end((error, response) => {
        response.should.have.status(200);
        response.should.be.json;
        response.should.be.a('Object');
        response.body.should.be.a('Array');
        response.body[0].should.have.property('id');
        response.body[0].should.have.property('name');
        response.body[0].should.have.property('artist_name');
        response.body[0].should.have.property('genre');
        response.body[0].should.have.property('song_rating');
        done();
      });
    });

    it('should return error if id does not exist', done => {
      chai.request(server)
      .get('/api/v1/songs/7')
      .end((error, response) => {
        response.should.have.status(404);
        response.body.error.should.equal(`Could not find song with id: 7`);
        done();
      });
    });
  });
});
