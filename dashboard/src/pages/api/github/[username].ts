import { NextApiRequest, NextApiResponse } from "next";
import { fetchUserData } from "~/utils/fetchGithubData";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { username } = req.query;
  const data = await fetchUserData(username as string);
  res.json(data);
}
