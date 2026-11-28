export function mapUserToCommentUser(user: {
  fullName: string | null;
  profilePhoto: string | null;
  username: string | null;
}) {
  return {
    full_name: user.fullName,
    profile_photo: user.profilePhoto,
    username: user.username,
  };
}
