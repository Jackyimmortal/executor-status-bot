'use strict';

const { Collection } = require('discord.js');
const ticketPanel = require('./ticket-panel');
const ticketClose = require('./ticket-close');
const ticketAdd = require('./ticket-add');
const ticketRemove = require('./ticket-remove');
const ticketHelp = require('./ticket-help');
const ticketSetNumber = require('./ticket-set-number');

// Credit / Review Commands
const creditCreate = require('./credit-create');
const creditPump = require('./credit-pump');
const creditStats = require('./credit-stats');
const creditPanel = require('./credit-panel');

// Invite & Member Stats Commands
const inviteCheck = require('./invite-check');
const inviteAdd = require('./invite-add');
const inviteTop = require('./invite-top');
const statsSetup = require('./stats-setup');

const commandsList = [
  ticketPanel,
  ticketClose,
  ticketAdd,
  ticketRemove,
  ticketHelp,
  ticketSetNumber,
  creditCreate,
  creditPump,
  creditStats,
  creditPanel,
  inviteCheck,
  inviteAdd,
  inviteTop,
  statsSetup
];

const commandsCollection = new Collection();
for (const cmd of commandsList) {
  commandsCollection.set(cmd.data.name, cmd);
}

module.exports = {
  commandsList,
  commandsCollection
};
