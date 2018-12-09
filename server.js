const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const environment = process.env.NODE_ENV || 'development';
const configuration = require('./knexfile')[environment];
const database = require('knex')(configuration);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));
app.set('port', process.env.PORT || 3000);
app.locals.title = 'Play BE';

app.get('/', (request, response) => {
  response.send('Play Back End');
});

app.post('/api/v1/songs', (request, response) => {
  const song = request.body;
  const requiredParameter = ['name', 'artist_name', 'genre', 'song_rating'];

  for (let parameter of requiredParameter) {
    if (!song[parameter]) {
      return response
        .status(400)
        .send({ error: `Expected format: { name: <String>, artist_name: <String>, genre: <String>, song_rating: <Integer> }. You're missing a "${parameter}" property.` });
    }
  }

  if ((song['song_rating'] > 100) || (song['song_rating'] < 1)) {
    return response
      .status(400)
      .send( {error: `song_rating: ${song['song_rating']} is invalid. song_rating must be an integer between 1 and 100.` } );
  }

  database('songs').insert(song, ['id', 'name', 'artist_name', 'genre', 'song_rating'])
    .then(song => {
      response.status(201).json({ songs: song[0] })
    })
    .catch(error => {
      response.status(500).json({ error });
    });
});

app.get('/api/v1/favorites', (request, response) => {
  database('songs').select(['id', 'name', 'artist_name', 'genre', 'song_rating'])
  .then((songs) => {
    response.status(200).json(songs);
  })
  .catch((error) => {
    response.status(500).json({error});
  });
});

app.get('/api/v1/songs/:id', (request, response) => {
  database('songs').where('id', request.params.id).select()
    .then(song => {
      if (song.length) {
        response.status(200).json(song);
      } else {
        response.status(404).json({
          error: `Could not find song with id: ${request.params.id}`
        })
      }
    })
    .catch(error => {
      response.status(500).json({error});
    })
})

app.get('/api/v1/playlists/:id/songs', (request, response) => {
  let playlistResponse;
  let songResponse;
  let playlistId = request.params.id;

  database('playlists').where('id', playlistId).select(['id', 'playlist_name'])
    .then(playlists => {
      if(playlists.length) {
        playlistResponse = playlists[0];
      } else {
        response.status(404).json({ error: `Playlist with ID ${playlistId} does not exist` });
      }
    })
    .then(() => {
      database('playlist_songs').where('playlist_id', playlistId)
        .select(['songs.id', 'name', 'artist_name', 'genre', 'song_rating'])
        .join('songs', {'songs.id': 'playlist_songs.song_id'})
        .then(songs => {
          playlistResponse["songs"] = songs;
          response.status(200).json(playlistResponse);
        });
    });
});

pry = require('pryjs');

app.get('/api/v1/playlists', (request, response) => {
  database.raw(`SELECT playlists.id, playlists.playlist_name, array_agg(json_build_object('id', songs.id, 'name', songs.name, 'artist_name', songs.artist_name, 'genre', songs.genre, 'song_rating', songs.song_rating)) as songs
                FROM playlists
                INNER JOIN playlist_songs ON playlists.id = playlist_songs.playlist_id
                INNER JOIN songs ON songs.id = playlist_songs.song_id
                GROUP BY playlists.id
                ORDER BY playlists.id`)
          .then(playlists => {
            response.status(200).json(playlists.rows);
          })
          .catch(error => {
            response.status(500).send({ error })
          });
});

app.post('/api/v1/playlists', (request, response) => {
  const playlist = request.body;

  if(!playlist['playlist_name']) {
    return response
      .status(400)
      .send({ error: `Expected format: { playlist_name: <String> }.` });
  }

  database('playlists').insert(playlist, ['id', 'playlist_name'])
    .then(playlist => {
      response.status(201).json({ playlist: playlist[0] })
    })
    .catch(error => {
      response.status(500).json({ error })
    });
});

app.delete('/api/v1/songs/:id', (request, response) => {
  let songId = request.params.id;

  database('songs').where('id', songId).select()
    .then((song) => {
      if(song.length) {
        database('songs').where('id', songId).del()
          .then(() => {
            response.status(204).end();
          })
          .catch(error => {
            response.status(500).send({ error });
          });
      } else {
        response.status(404).json({ message: `Song with ID ${songId} not found` });
      }
    })
    .catch(error => {
      response.status(500).send({ error });
    });
});

app.post('/api/v1/playlists/:playlist_id/songs/:id', (request, response) => {
  let playlistId = request.params.playlist_id;
  let songId = request.params.id;
  let songName;
  let playlistName;

  database('playlists').where('id', playlistId).select()
    .then(playlists => {
      if(playlists.length) {
        playlistName = playlists[0]['playlist_name'];
      } else {
        response.status(404).send({ error: `Playlist with ID ${playlistId} does not exist` });
      }
    })
    .then(() => {
      database('songs').where('id', songId).select()
        .then(songs => {
          if(songs.length) {
            songName = songs[0]['name'];
          } else {
            response.status(404).send({ error: `Song with ID ${songId} does not exist` });
          }
        })
    .then(() => {
      if(songName && playlistName) {
        database('playlist_songs').insert({ song_id: songId, playlist_id: playlistId })
          .then(data => {
            response.status(201).json({
              message: `Successfully added ${songName} to ${playlistName}`
            });
          })
          .catch(error => {
            response.status(500).send({ error });
          });
      }
      });
    })
    .catch(error => {
      response.status(500).send({ error });
    });
});

app.listen(app.get('port'), () => {
  console.log(`${app.locals.title} is running on ${app.get('port')}.`);
});

module.exports = app;
