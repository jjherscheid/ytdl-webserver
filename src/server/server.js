const Hapi = require('@hapi/hapi')
const Boom = require('@hapi/boom')
const Inert = require('@hapi/inert')
const mkdirp = require('mkdirp')
const fs = require('fs');
const path = require('path')
const youtube = require('./handlers/youtube');
const { bool } = require('prop-types');

const PASSWORD = process.env.PASSWORD || 'testing';
let busy = false;

const server = new Hapi.Server({
  port: process.env.PORT || 3000,
  routes: {
    files: {
      relativeTo: path.join(__dirname, '../../public')
    }
  }
})

const provision = async () => {
  await server.register(Inert)

  // TODO add notifications to app
  // TODO remove duplicate downloads from ui
  server.route({
    method: 'GET',
    path: '/{path*}',
    handler: {
      directory: {
        path: '.',
        listing: false,
        index: true
      }
    }
  })

  server.route({
    method: 'POST',
    path: '/download',
    handler: (request, reply) => {
      if (busy) {
        reply(Boom.serverUnavailable('Busy'));
        return;
      }
      busy = true;
      const url = request.payload.url
      const psw = request.payload.code

      console.log(psw);
      if (psw != PASSWORD) {
        clearFolder();
        throw new Error('invalid');
      }

      const options = {
        path: path.join(__dirname, '../../public/temp'),
        audioOnly: true
      }

      mkdirp(options.path, err => {
        if (err) {
          throw err
        }
      })

      return youtube.download(url, options).finally(() => busy = false);
    }
  })

  server.route({
    method: 'GET',
    path: '/request/{video}',
    handler: (request, h) => {
      const videoName = encodeURIComponent(request.params.video)
      return h.file(path.join('temp', decodeURIComponent(videoName)))
    }
  })

  server.route({
    method: 'GET',
    path: '/clearall',
    handler: (request, h) => {

      clearFolder();
      return { message: '200 OK' };
    }
  })

  await server.start()

  console.log('Server running at:', server.info.uri)
}

provision()

function clearFolder() {
  var directory = path.join(__dirname, '../../public/temp');
  fs.readdir(directory, (err, files) => {
    if (err)
      throw err;

    for (const file of files) {
      fs.unlink(path.join(directory, file), err => {
        if (err)
          throw err;
      });
    }
  });
}

