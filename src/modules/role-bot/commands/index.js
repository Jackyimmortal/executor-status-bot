'use strict';

const { Collection } = require('discord.js');
const rolePanel = require('./role-panel');
const roleAdd = require('./role-add');
const roleEdit = require('./role-edit');
const roleList = require('./role-list');
const roleHelp = require('./role-help');

const commandsList = [
  rolePanel,
  roleAdd,
  roleEdit,
  roleList,
  roleHelp
];

const commandsCollection = new Collection();
for (const cmd of commandsList) {
  commandsCollection.set(cmd.data.name, cmd);
}

module.exports = {
  commandsList,
  commandsCollection
};
