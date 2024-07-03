import Router from "express-promise-router";

import formidable from "formidable";

import multer from "multer";
import fs from "fs";
import util from "util";
import * as DB from "../dynamoDB/DocumentReference.js";

import * as constants from "../common/constants.js";

import { s3StoreFile, s3GetFile, s3DeleteFile } from "../utils/S3Storage.js";
import { getCompanyId, getFullUser } from "../utils/getCompanyId.js";
import { getCompany } from "../dynamoDB/Company.js";

const upload = multer({ dest: "uploads/" });

const unlinkFile = util.promisify(fs.unlink);
// const upload = multer();

const router = Router();

router.post("/create-doc-ref", upload.single("data"), async (req, res) => {
  try {
    const meta = req.user["https://andesdocs.com/meta"].metadata;
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

    let andesDockerDoc = false;

    if (meta.andes_docker) {
      andesDockerDoc = true;
    }

    let filePath = req.body.docName;

    if (company) {
      filePath = `${company}_${req.body.docName}`;
    }

    const store = await s3StoreFile("andesdocuments01", filePath, req.file);

    const fileUrl = store.Location;

    const newDocRef = {
      companyId: user.companyId,
      companyName: company,
      documentType: req.body.documentType,
      fileName: req.body.fileNameNoExtension || null,
      filePath,
      fileUrl,
      createdBy: user.name,
      userId: req.user.sub,
      creatorPhotoUrl: user.photoUrl,
      versionId: req.body.versionId,
      versionNumber: req.body.versionNumber,
      date: req.body.date,
      size: req.body.size,
      updateDate: req.body.updateDate,
      format: req.body.format,
      andesDockerDoc,
      expirationDate: req.body.expirationDate || null,
    };
    if (store.Location) {
      await unlinkFile(req.file.path);
      await DB.upsertDocReference(newDocRef);
      res.status(200).json({
        documentSaved: true,
        document: {
          ...newDocRef,
          dateCreated: req.body.date,
          documentId: req.body.date,
        },
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

export const getAllCompanyDocRefs = async (user, companyId, meta) => {
  let docList = await DB.getAllCompanyDocs(companyId);

  if (!docList || !docList.Items) {
    return null;
  }

  let finalList = docList.Items;

  // this code is used for limit reaching
  if (docList.LastEvaluatedKey) {
    let docList2 = await DB.getAllCompanyDocsWithStartKey(
      companyId,
      docList.LastEvaluatedKey.documentId
    );

    finalList = [...docList2.Items, ...docList.Items];
  }

  if (user.documentShare === false) {
    const filteredList = finalList.filter((doc) => doc.userId === user.userId);
    finalList = filteredList;
  }
  if (!meta.andes_docker) {
    const filteredList = finalList.filter((doc) => {
      return doc.andesDockerDoc === false || doc.andesDockerDoc === "false";
    });
    finalList = filteredList;
  }

  return finalList;
};

router.get("/get-company-docs", async (req, res) => {
  try {
    const meta = req.user["https://andesdocs.com/meta"].metadata;
    const user = await getFullUser(req.user.sub);

    if (!user) res.status(400).send(constants.noUserError);

    if (user.companyId) {
      const companyId = user.companyId;
      let docList = await getAllCompanyDocRefs(user, companyId, meta);

      if (!docList) {
        res.status(400).send(constants.systemError);
      }

      res.status(200).json({ documents: docList });
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

router.post("/get-one-doc", async (req, res) => {
  try {
    const companyId = await getCompanyId(req.user.sub);
    if (!companyId) res.status(400).send(constants.noUserError);

    const docId = req.body.documentId;
    const docFound = await DB.getOneDoc(docId, companyId);
    if (docFound.Items && docFound.Items.length > 0)
      res.status(200).json({ document: docFound.Items[0] });
    else res.status(200).json({ document: null });
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

router.post("/edit-document", async (req, res) => {
  const newDoc = req.body;
  try {
    const companyId = await getCompanyId(req.user.sub);
    if (!companyId) res.status(400).send(constants.noUserError);

    if (companyId === newDoc.companyId) {
      await DB.editDocReference(newDoc);
      res.status(200).json({ documentSaved: true });
    } else {
      res.status(400).send(constants.permissionError);
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

router.post(
  "/save-edited-document",
  upload.single("data"),
  async (req, res) => {
    const newDoc = req.body;
    const companyId = await getCompanyId(req.user.sub);
    if (!companyId) res.status(400).send(constants.noUserError);

    try {
      if (companyId === newDoc.companyId) {
        const store = await s3StoreFile(
          "andesdocuments01",
          req.body.filePath,
          req.file
        );

        if (store.Location) {
          await unlinkFile(req.file.path);

          const dbDocData = newDoc;

          if (dbDocData.data) delete dbDocData.data;

          await DB.editDocReference(dbDocData);
          res.status(200).json({ documentSaved: true });
        }
      } else {
        res.status(400).send(constants.permissionError);
      }
    } catch (error) {
      console.log(error.message);
      res.status(400).send(constants.systemError);
    }
  }
);

router.post("/downlad-doc-s3", async (req, res) => {
  try {
    if (req.body.documentPath) {
      const getDoc = await s3GetFile("andesdocuments01", req.body.documentPath);
      res.status(200).json(getDoc);
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

router.post("/delete-document", async (req, res) => {
  const docToDelete = req.body;
  try {
    const companyId = await getCompanyId(req.user.sub);
    if (!companyId) res.status(400).send(constants.noUserError);

    if (companyId === docToDelete.companyId) {
      await DB.deleteDocReference(
        docToDelete.documentId,
        docToDelete.companyId
      );
      await s3DeleteFile("andesdocuments01", docToDelete.filePath);
      res.status(200).json({ documentDeleted: true });
    } else {
      res.status(400).send(constants.permissionError);
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

export default router;
