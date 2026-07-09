import { User } from '../../models/user.model.js';
import { NotFoundError } from '../../lib/errors.js';

export async function getProfile(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User');

  return {
    id: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function updateProfile(userId: string, data: { displayName?: string }) {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User');

  if (data.displayName) {
    user.displayName = data.displayName;
    await user.save();
  }

  return {
    id: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}

export async function searchUsers(query: string) {
  const users = await User.find({
    displayName: { $regex: query, $options: 'i' },
  })
    .limit(10)
    .select('_id email displayName');

  return users.map((u) => ({
    id: u._id.toString(),
    email: u.email,
    displayName: u.displayName,
  }));
}
