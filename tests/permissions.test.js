'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PermissionsBitField } = require('discord.js');
const { isUserAdmin } = require('../src/utils/permissions');
const { config } = require('../src/config/config');

test('Permissions: Guild Owner is authorized as Admin', () => {
  const mockInteraction = {
    user: { id: 'user_123' },
    guild: { ownerId: 'user_123' },
    member: {}
  };
  assert.equal(isUserAdmin(mockInteraction), true);
});

test('Permissions: Member with Administrator permission flag', () => {
  const permissions = new PermissionsBitField([PermissionsBitField.Flags.Administrator]);
  const mockInteraction = {
    user: { id: 'user_456' },
    guild: { ownerId: 'other_owner' },
    memberPermissions: permissions,
    member: { permissions }
  };
  assert.equal(isUserAdmin(mockInteraction), true);
});

test('Permissions: Member with ManageGuild permission flag', () => {
  const permissions = new PermissionsBitField([PermissionsBitField.Flags.ManageGuild]);
  const mockInteraction = {
    user: { id: 'user_789' },
    guild: { ownerId: 'other_owner' },
    memberPermissions: permissions,
    member: { permissions }
  };
  assert.equal(isUserAdmin(mockInteraction), true);
});

test('Permissions: Member with configured ADMIN_ROLE_ID', () => {
  config.discord.adminRoleId = '999888777';
  const permissions = new PermissionsBitField([]);
  const mockInteraction = {
    user: { id: 'user_role_holder' },
    guild: { ownerId: 'other_owner' },
    memberPermissions: permissions,
    member: {
      permissions,
      roles: {
        cache: new Map([['999888777', { id: '999888777' }]])
      }
    }
  };
  assert.equal(isUserAdmin(mockInteraction), true);
});

test('Permissions: Standard member without roles or permissions is denied', () => {
  config.discord.adminRoleId = '999888777';
  const permissions = new PermissionsBitField([PermissionsBitField.Flags.SendMessages]);
  const mockInteraction = {
    user: { id: 'regular_user' },
    guild: { ownerId: 'other_owner' },
    memberPermissions: permissions,
    member: {
      permissions,
      roles: {
        cache: new Map()
      }
    }
  };
  assert.equal(isUserAdmin(mockInteraction), false);
});
