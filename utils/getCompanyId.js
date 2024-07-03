import { getUser } from "../dynamoDB/Users.js";

export const getCompanyId = async (userId) => {
  try {
    if (!userId) return null;
    const dbUser = await getUser(userId);
    if (
      dbUser.Items.length > 0 &&
      dbUser.Items[0].companyId &&
      dbUser.Items[0].companyId !== "00000"
    ) {
      return dbUser.Items[0].companyId;
    }

    return null;
  } catch {
    return null;
  }
};

export const getFullUser = async (userId) => {
  try {
    if (!userId) return null;
    const dbUser = await getUser(userId);
    if (
      dbUser.Items.length > 0 &&
      dbUser.Items[0].companyId &&
      dbUser.Items[0].companyId !== "00000"
    ) {
      return dbUser.Items[0];
    }

    return null;
  } catch {
    return null;
  }
};
