import { getTeamForUser, getUser } from '@/lib/db/queries';

export async function GET() {
  const user = await getUser();
  if (!user) {
    return Response.json(null);
  }
  const team = await getTeamForUser(user.id);
  return Response.json(team);
}
