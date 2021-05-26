const User = require('../../models/User');
const Organization = require('../../models/Organization');
const authCheck = require('../functions/authCheck');
const { NotFound, ConflictError, Unauthorized } = require('../../core/errors');
const requestContext = require('../../core/libs/talawa-request-context');

module.exports = async (parent, args, context) => {
  authCheck(context);
  // ensure organization exists
  const org = await Organization.findOne({ _id: args.organizationId });
  if (!org) {
    throw new NotFound([
      {
        message: requestContext.translate('organization.notFound'),
        code: 'organization.notFound',
        param: 'organization',
      },
    ]);
  }

  // ensures organization is public
  if (!org._doc.isPublic) {
    throw new Unauthorized([
      {
        message: requestContext.translate('organization.notAuthorized'),
        code: 'organization.notAuthorized',
        param: 'organizationAuthorization',
      },
    ]);
  }

  // ensure user exists
  const user = await User.findOne({ _id: context.userId });
  if (!user) {
    throw new NotFound([
      {
        message: requestContext.translate('user.notFound'),
        code: 'user.notFound',
        param: 'user',
      },
    ]);
  }

  // check to see if user is already a member
  const members = org._doc.members.filter((member) => member === user.id);
  if (members.length !== 0) {
    throw new ConflictError([
      {
        message: requestContext.translate('user.alreadyMember'),
        code: 'user.alreadyMember',
        param: 'userAlreadyMember',
      },
    ]);
  }

  // add user to organization's members field
  org.overwrite({
    ...org._doc,
    members: [...org._doc.members, user],
  });
  await org.save();

  // add organization to user's joined organization field
  user.overwrite({
    ...user._doc,
    joinedOrganizations: [...user._doc.joinedOrganizations, org],
  });
  await user.save();

  // return user
  return {
    ...user._doc,
    password: null,
  };
};
