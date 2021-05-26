const User = require('../../models/User');
const DirectChat = require('../../models/DirectChat');
const authCheck = require('../functions/authCheck');
const Organization = require('../../models/Organization');
const { NotFound } = require('../../core/errors');
const requestContext = require('../../core/libs/talawa-request-context');

module.exports = async (parent, args, context) => {
  authCheck(context);

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

  const org = await Organization.findOne({ _id: args.data.organizationId });
  if (!org) {
    throw new NotFound([
      {
        message: requestContext.translate('organization.notFound'),
        code: 'organization.notFound',
        param: 'organization',
      },
    ]);
  }

  const usersInChat = [];

  // add users to cat
  for await (const userId of args.data.userIds) {
    // console.log(userId);
    const user = await await User.findOne({ _id: userId });
    if (!user) {
      throw new NotFound([
        {
          message: requestContext.translate('user.notFound'),
          code: 'user.notFound',
          param: 'user',
        },
      ]);
    }
    usersInChat.push(user);
  }

  let directChat = new DirectChat({
    creator: user,
    users: usersInChat,
    organization: org,
  });

  directChat = await directChat.save();

  return directChat._doc;
};
