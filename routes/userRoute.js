import Router from "express-promise-router";

import * as constants from "../common/constants.js";

import optionSets from "../data/options.js";

const router = Router();
import { createUser, getUser, updateUser } from "../dynamoDB/Users.js";

const allowedUserIds = [
  "auth0|620bc56d93bacd0069b47a34",
  "google-oauth2|115315436207123843132",
  "google-oauth2|117051697862714644429",
  "google-oauth2|106733260639170181590",
  "google-oauth2|109233222036133673121",
  "google-oauth2|117735272152944602744",
  "auth0|6679a8487adcdd64d50d3240",
];

router.post("/get-or-create-user", async (req, res) => {
  try {
    const userId = req.user.sub;
    if (!userId) {
      res.status(400).send(constants.systemError);
      return;
    }

    const dbUser = await getUser(userId);

    if (!dbUser || !dbUser.Items) {
      res.status(400).send(constants.systemError);
    }

    if (dbUser.Items.length < 1) {
      const metaData = req.user["https://andesdocs.com/meta"].metadata;

      const params = {
        // primary key
        companyId: metaData.company_id ? String(metaData.company_id) : "00000",
        // secondary key
        userId: userId,
        photoUrl: metaData.photoUrl || "",
        role: metaData.role || "user",
        documentShare: metaData.document_share === "user" ? false : true,
        createdAt: String(Date.now()),
        name: metaData.name || req.body.userData.name || "Usuario sin nombre",
        email: req.body.userData.email || "",
      };

      const createdUser = await createUser(params);

      if (createdUser) {
        res.status(200).send({
          user: { ...params, companyId: params.companyId !== "00000" },
          userCreated: true,
        });
      } else res.status(400).send(constants.systemError);
      return;
    } else if (dbUser.Items.length > 0) {
      let internalUser = false;
      //agreguemos una property que se llame internalUser true, si la mando en false

      if (allowedUserIds.includes(userId)) {
        internalUser = true;
      }

      res.status(200).send({
        user: {
          ...dbUser.Items[0],
          companyId: dbUser.Items[0].companyId !== "00000",
          internalUser,
        },
        userCreated: false,
      });
      return;
    }
    res.status(400).send(constants.systemError);
    return;
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

router.post("/update-user", async (req, res) => {
  try {
    const userId = req.user.sub;
    const metaData = req.user["https://andesdocs.com/meta"].metadata;
    if (!userId) {
      res.status(400).send(constants.systemError);
      return;
    }

    if (metaData.andes_docker) {
      const dbUser = await getUser(userId);

      if (!dbUser || !dbUser.Items) {
        res.status(400).send(constants.systemError);
      }

      if (dbUser.Items.length > 0) {
        const updatedUser = {
          ...dbUser.Items[0],
          companyId: req.body.companyId,
        };

        const data = await updateUser(updatedUser);
        if (data) {
          res.status(200).json({ userUpdated: true });
        }
      }
    }

    res.status(400).send(constants.systemError);
    return;
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});
export default router;
