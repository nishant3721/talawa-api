const Organization = require('../../models/Organization');
const { NotFound, ConflictError } = require('../../core/errors');
const requestContext = require('../../core/libs/talawa-request-context');

const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const {
  createAccessToken,
  createRefreshToken,
} = require('../../helper_functions/auth');

const uploadImage = require('../../helper_functions/uploadImage');

module.exports = async (parent, args) => {
  const emailTaken = await User.findOne({
    email: args.data.email.toLowerCase(),
  });
  if (emailTaken) {
    throw new ConflictError([
      {
        message: requestContext.translate('email.alreadyExists'),
        code: 'email.alreadyExists',
        param: 'email',
      },
    ]);
  }

  // TODO: this check is to be removed
  let org;
  if (args.data.organizationUserBelongsToId) {
    org = await Organization.findOne({
      _id: args.data.organizationUserBelongsToId,
    });
    if (!org) {
      throw new NotFound([
        {
          message: requestContext.translate('organization.notFound'),
          code: 'organization.notFound',
          param: 'organization',
        },
      ]);
    }
  }

  const hashedPassword = await bcrypt.hash(args.data.password, 12);

  // Upload file
  let uploadImageObj;
  if (args.file) {
    uploadImageObj = await uploadImage(args.file, null);
  }

  let user = new User({
    ...args.data,
    organizationUserBelongsTo: org ? org : null,
    email: args.data.email.toLowerCase(), // ensure all emails are stored as lowercase to prevent duplicated due to comparison errors
    image: uploadImageObj
      ? uploadImageObj.imageAlreadyInDbPath
        ? uploadImageObj.imageAlreadyInDbPath
        : uploadImageObj.newImagePath
      : null,
    password: hashedPassword,
  });

  user = await user.save();
  const accessToken = await createAccessToken(user);
  const refreshToken = await createRefreshToken(user);

  return {
    user: {
      ...user._doc,
      password: null,
    },
    accessToken,
    refreshToken,
  };
};
