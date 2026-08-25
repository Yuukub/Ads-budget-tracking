export interface NotePermissionShape {
  ownerId: number;
  shares: Array<{ userId: number; canViewSecret: boolean }>;
}

export function notePermission(note: NotePermissionShape, userId: number) {
  const isOwner = note.ownerId === userId;
  const share = note.shares.find((item) => item.userId === userId);
  return {
    isOwner,
    canRead: isOwner || Boolean(share),
    canViewSecret: isOwner || Boolean(share?.canViewSecret),
  };
}
