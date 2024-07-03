import Router from "express-promise-router";
import {
  s3DeleteFile,
  s3GetFile,
  s3Store,
  s3StoreFile,
} from "../utils/S3Storage.js";
import * as constants from "../common/constants.js";
import * as DB from "../dynamoDB/CompanyDocuments.js";
import fetch from "node-fetch";
import fs, { cp } from "fs";
import { getCompanyId } from "../utils/getCompanyId.js";

const router = Router();

export const getAllCompanyCustomDocs = async (companyId) => {
  let id = companyId;

  if (companyId === "12357" || companyId === "12355" || companyId === "12354") {
    id = "12346";
  }

  const docList = await DB.getAllCompanyDocs(id);

  if (!docList) return null;
  return docList.Items;
};

router.get("/get-all-company-docs", async (req, res) => {
  try {
    let companyId = await getCompanyId(req.user.sub);

    if (!companyId) {
      res.status(400).send(constants.noUserError);
      return;
    }

    if (
      companyId === "12357" ||
      companyId === "12355" ||
      companyId === "12354"
    ) {
      companyId = "12346";
    }

    const docList = await getAllCompanyCustomDocs(companyId);

    if (!docList) {
      res.status(400).send(constants.systemError);
    }

    res.status(200).json({ documents: docList });
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

router.post("/get-all-company-docs-for-update", async (req, res) => {
  if (req.user["https://andesdocs.com/meta"].metadata.andes_docker === true) {
    try {
      const { companyId } = req.body;
      if (companyId) {
        const docList = await DB.getAllCompanyDocs(companyId);
        res.status(200).json({ documents: docList.Items });
      }
    } catch (error) {
      console.log(error.message);
      res.status(400).send(constants.systemError);
    }
  } else {
    res.status(400).send(constants.systemError);
  }
});

router.post("/get-company-document", async (req, res) => {
  try {
    const { dataPath, generatorVersion } = req.body;
    const questions = await s3GetFile("andesquestiondata", dataPath);
    const parsedQuestions = JSON.parse(questions.Body);

    const document = await s3GetFile("andesdocumentdata", dataPath);
    const parsedDocument = JSON.parse(document.Body);

    let parsedSections = null;
    if (generatorVersion === "2.0") {
      try {
        const sections = await s3GetFile("andessectiondata", dataPath);
        parsedSections = JSON.parse(sections.Body);
      } catch (e) {
        parsedSections = {};
      }
    }

    res.send({
      questions: parsedQuestions,
      document: parsedDocument,
      sections: parsedSections,
    });
  } catch (e) {
    console.log(e.message);
    res.status(400).send(constants.systemError);
  }
});

router.post("/create-company-document", async (req, res) => {
  try {
    const {
      questionData,
      documentData,
      documentName,
      date,
      documentName1,
      documentName2,
      companyId,
      companyName,
      password,
      generatorVersion,
      sectionData,
    } = req.body;

    if (password !== "soyandesdocker") {
      res.status(400).send(constants.passwordError);
      return;
    }
    const filePath = `${documentName}_${companyName}_${date} `;
    if (password === "soyandesdocker") {
      const store1 = await s3Store("andesquestiondata", filePath, {
        ...questionData,
      });

      const store2 = await s3Store("andesdocumentdata", filePath, {
        ...documentData,
      });

      if (!store1 || !store2) {
        res.status(400).send(constants.systemError);
        return;
      }

      if (generatorVersion === "2.0") {
        const store3 = await s3Store("andessectiondata", filePath, {
          ...sectionData,
        });

        if (!store3) {
          res.status(400).send(constants.systemError);
          return;
        }
      }

      const dbStore = await DB.createCompanyDoc({
        companyId,
        documentId: date,
        companyName,
        documentName,
        documentName1,
        documentName2,
        generatorVersion: generatorVersion || "1.0",
        lastUpdated: date,
        dataPath: filePath,
      });

      if (!dbStore) {
        res.status(400).send(constants.systemError);
        return;
      }
      res.send({ saved: true });
    }
  } catch (e) {
    console.log(e.message);
    res.status(400).send(constants.systemError);
  }
});

router.post("/update-company-document-2", async (req, res) => {
  try {
    const {
      questionData,
      documentData,
      documentName,
      date,
      documentId,
      companyId,
      documentName1,
      documentName2,
      companyName,
      password,
      generatorVersion,
      dataPath,
      sectionData,
    } = req.body;
    if (password !== "soyandesdocker") {
      res.status(400).send(constants.passwordError);
      return;
    }
    const store1 = await s3Store("andesquestiondata", dataPath, {
      ...questionData,
    });

    const store2 = await s3Store("andesdocumentdata", dataPath, {
      ...documentData,
    });

    if (!store1 || !store2) {
      res.status(400).send(constants.systemError);
      return;
    }

    if (generatorVersion === "2.0") {
      const store3 = await s3Store("andessectiondata", dataPath, {
        ...sectionData,
      });

      if (!store3) {
        res.status(400).send(constants.systemError);
        return;
      }
    }

    const dbStore = await DB.createCompanyDoc({
      companyId,
      documentId,
      companyName,
      documentName,
      documentName1,
      documentName2,
      generatorVersion: generatorVersion || "2.0",
      lastUpdated: date,
      dataPath,
    });

    if (!dbStore) {
      res.status(400).send(constants.systemError);
      return;
    }
    res.send({ saved: true });
  } catch (e) {
    console.log(e.message);
    res.status(400).send(constants.systemError);
  }
});

router.post("/update-company-document", async (req, res) => {
  try {
    const {
      questionData,
      documentData,
      documentName,
      date,
      documentName1,
      documentName2,
      companyId,
      companyName,
      password,
      prevDocId,
      prevDataPath,
      generatorVersion,
    } = req.body;
    if (password !== "soyandesdocker") {
      res.status(400).send(constants.passwordError);
      return;
    }
    const filePath = `${documentName}_${companyName}_${date} `;
    if (password === "soyandesdocker") {
      const deleteRef = await DB.deleteCompanyDocReference(
        prevDocId,
        companyId
      );

      const store1 = await s3Store("andesquestiondata", filePath, {
        ...questionData,
      });

      const store2 = await s3Store("andesdocumentdata", filePath, {
        ...documentData,
      });

      if (!store1 || !store2) {
        res.status(400).send(constants.systemError);
        return;
      }

      const deleteQuestions = await s3DeleteFile(
        "andesquestiondata",
        prevDataPath
      );

      const deleteDocData = await s3DeleteFile(
        "andesdocumentdata",
        prevDataPath
      );

      const dbStore = await DB.createCompanyDoc({
        companyId,
        documentId: date,
        companyName,
        documentName,
        documentName1,
        documentName2,
        generatorVersion: generatorVersion || "1.0",
        lastUpdated: date,
        dataPath: filePath,
      });

      if (!dbStore) {
        res.status(400).send(constants.systemError);
        return;
      }

      res.send({ saved: true });
    }
  } catch (e) {
    console.log(e.message);
    res.status(400).send(constants.systemError);
  }
});

export default router;
