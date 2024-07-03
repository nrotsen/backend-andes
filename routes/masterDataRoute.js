import Router from "express-promise-router";

import * as constants from "../common/constants.js";

import { getCompany } from "../dynamoDB/Company.js";

const router = Router();
import { getFullUser } from "../utils/getCompanyId.js";
import { getAllCompanyCustomDocs } from "./companyDocRoute.js";
import { getAllCompanyDocRefs } from "./docRefRoute.js";
import { getCompanyFolders } from "./foldersRoute.js";
import { getAllStartedDocsByUser } from "./startedDocRoute.js";

router.get("/get-master-data", async (req, res) => {
  try {
    const meta = req.user["https://andesdocs.com/meta"].metadata;
    const user = await getFullUser(req.user.sub);
    if (!user) {
      res.status(400).send(constants.noUserError);
      return;
    }
    const companyId = user.companyId;

    const company = await getCompany(companyId);

    if (!company || !company.Item) {
      res.status(400).send(constants.systemError);
      return;
    }
    const documentReferences = await getAllCompanyDocRefs(
      user,
      companyId,
      meta
    );

    if (!documentReferences) {
      res.status(400).send(constants.systemError);
      return;
    }

    const startedDocs = await getAllStartedDocsByUser(user, user.companyId);
    if (!startedDocs) {
      res.status(400).send(constants.systemError);
      return;
    }

    const folders = await getCompanyFolders(user, companyId);

    if (!folders) {
      res.status(400).send(constants.systemError);
      return;
    }

    const companyCustomDocs = await getAllCompanyCustomDocs(companyId);

    if (!companyCustomDocs) {
      res.status(400).send(constants.systemError);
      return;
    }

    res.status(200).send({
      company: company.Item,
      startedDocs,
      documentReferences,
      folders,
      companyCustomDocs,
    });
    return;
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

export default router;
