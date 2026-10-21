'use strict';

const { Collection } = require('discord.js');

// General commands
const help = require('./general/help');
const executorList = require('./general/executor-list');
const executorInfo = require('./general/executor-info');
const executorSearch = require('./general/executor-search');
const executorPlatform = require('./general/executor-platform');
const statusHealth = require('./general/status-health');
const apiCheck = require('./general/api-check');
const statusRefresh = require('./general/status-refresh');
const statusPanel = require('./general/status-panel');

// Admin commands
const executorAdd = require('./admin/executor-add');
const executorEdit = require('./admin/executor-edit');
const executorRemove = require('./admin/executor-remove');
const executorStatus = require('./admin/executor-status');
const statusSource = require('./admin/status-source');
const statusProvider = require('./admin/status-provider');
const statusConflicts = require('./admin/status-conflicts');
const statusSync = require('./admin/status-sync');
const statusConfig = require('./admin/status-config');

const commandsList = [
  help,
  executorList,
  executorInfo,
  executorSearch,
  executorPlatform,
  statusHealth,
  apiCheck,
  statusRefresh,
  statusPanel,
  executorAdd,
  executorEdit,
  executorRemove,
  executorStatus,
  statusSource,
  statusProvider,
  statusConflicts,
  statusSync,
  statusConfig
];

const commandsCollection = new Collection();
for (const cmd of commandsList) {
  if (cmd.data && cmd.data.name) {
    commandsCollection.set(cmd.data.name, cmd);
  }
}

module.exports = {
  commandsList,
  commandsCollection
};
