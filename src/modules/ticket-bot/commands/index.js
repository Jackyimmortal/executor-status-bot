'use strict';

const { Collection } = require('discord.js');
const ticketPanel = require('./ticket-panel');
const ticketClose = require('./ticket-close');
const ticketAdd = require('./ticket-add');
const ticketRemove = require('./ticket-remove');
const ticketHelp = require('./ticket-help');

const commandsList = [
  ticketPanel,
  ticketClose,
  ticketAdd,
  ticketRemove,
  ticketHelp
];

const commandsCollection = new Collection();
for (const cmd of commandsList) {
  commandsCollection.set(cmd.data.name, cmd);
}

module.exports = {
  commandsList,
  commandsCollection
};
