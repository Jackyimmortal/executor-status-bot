'use strict';

const readyEvent = require('./ready');
const interactionCreateEvent = require('./interactionCreate');

function registerEvents(client, context) {
  client.once(readyEvent.name, (...args) => readyEvent.execute(...args, context));
  client.on(interactionCreateEvent.name, (...args) => interactionCreateEvent.execute(...args, context));
}

module.exports = {
  registerEvents
};
