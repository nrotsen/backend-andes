import Router from "express-promise-router";
import { s3GetFile, s3Store } from "../utils/S3Storage.js";
import * as constants from "../common/constants.js";
import * as DB from "../dynamoDB/StartedReference.js";
import { getCompanyId, getFullUser } from "../utils/getCompanyId.js";

const router = Router();
router.post("/create-started", async (req, res) => {
  try {
    const user = await getFullUser(req.user.sub);

    if (!user || !user.companyId) {
      res.status(400).send(constants.noUserError);
      return;
    }

    let company = null;
    const compData = await getCompany(user.companyId);
    if (compData.Item) {
      company = compData.Item.companyName || "NO_COMPANY_NAME";
    }

    if (!company) {
      res.status(400).send(constants.systemError);
      return;
    }

    const filePath = `${req.body.documentType}_${company}_${req.body.date} `;

    const store = await s3Store("andesstarted01", filePath, {
      ...req.body.answers,
    });
    if (store) {
      const paramsForTableSave = {
        companyId: user.companyId,
        companyName: company,
        documentId: `${req.body.date}`,
        sessionUrl: req.body.sessionUrl,
        currentSection: req.body.currentSection,
        filePath,
        fileName: req.body.documentType,
        type: req.body.documentType,
        dateCreated: req.body.date,
        createdBy: user.name,
        creatorPhotoUrl: user.photoUrl,
        userId: req.user.sub,
        delFlg: 0,
        description: null,
        dataPath: req.body.dataPath,
      };

      await DB.upsertStartedDocument(paramsForTableSave);
      res.status(200).send({ saved: true });
    }
  } catch (e) {
    console.log(e.message);
    res.status(400).send(constants.systemError);
  }
});

export const getAllStartedDocsByUser = async (user, companyId) => {
  const docList = await DB.getAllStartedDocs(companyId);
  if (!docList || !docList.Items) {
    return null;
  }
  let finalList = docList.Items;
  const filteredList = finalList.filter((doc) => doc.userId === user.userId);
  finalList = filteredList;
  return finalList;
};

router.get("/get-all-started-docs", async (req, res) => {
  try {
    const user = await getFullUser(req.user.sub);
    if (!user) {
      res.status(400).send(constants.noUserError);
      return;
    }
    const docList = await getAllStartedDocsByUser(user, user.companyId);
    if (!docList) {
      res.status(400).send(constants.systemError);
    }
    res.status(200).json({ documents: docList });
  } catch (error) {
    console.log(error.message);
  }
});

router.post("/get-started-from-s3", async (req, res) => {
  try {
    const store = await s3GetFile("andesstarted01", req.body.id);
    const parsed = JSON.parse(store.Body);
    res.send({ ...parsed });
  } catch (e) {
    console.log(e.message);
    res.status(400).send(constants.systemError);
  }
});

export default router;
