import Router from "express-promise-router";
import * as DB from "../dynamoDB/Folders.js";
import * as DocumentRefDB from "../dynamoDB/DocumentReference.js";
import * as constants from "../common/constants.js";
import { getFullUser } from "../utils/getCompanyId.js";

const router = Router();

// get folders

export const getCompanyFolders = async (user, companyId) => {
  const folders = await DB.getAllCompanyFolders(companyId);

  if (!folders) {
    return null;
  }

  let finalList = folders.Items;

  if (user.documentShare === false) {
    const filteredList = finalList.filter(
      (folder) => folder.userId === user.userId
    );
    finalList = filteredList;
  }
  return finalList;
};

router.get("/get-company-folders", async (req, res) => {
  try {
    const user = await getFullUser(req.user.sub);

    if (!user) {
      res.status(400).send(constants.noUserError);
    }

    const companyId = user.companyId;
    const folders = await getCompanyFolders(user, companyId);

    if (!folders) {
      res.status(400).send(constants.systemError);
    }

    res.status(200).json({ folders });
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

router.post("/create-folder", async (req, res) => {
  try {
    const user = await getFullUser(req.user.sub);

    if (!user || !user.companyId) {
      res.status(400).send(constants.noUserError);
      return;
    }

    const newFolder = {
      companyId: user.companyId,
      folderId: Date.now().toString(),
      folderName: req.body.folderName,
      updateDate: Date.now().toString(),
      createdBy: user.name,
      userId: req.user.sub,
    };

    const folderCreated = await DB.createFolder(newFolder);

    if (folderCreated) {
      res.status(200).json({ folderSaved: true });
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

router.post("/delete-folder", async (req, res) => {
  try {
    const user = await getFullUser(req.user.sub);

    if (!user || !user.companyId) {
      res.status(400).send(constants.noUserError);
      return;
    }

    const removeOneDocumentFolder = async (folderId, companyId) => {
      const status = await DocumentRefDB.removeDocumentFolder(
        companyId,
        folderId
      );
      return status.Attributes.folder;
    };

    const docRefFolderRemover = async (folderIds, companyId) => {
      const documentsFolders = folderIds.map(async (docId) => {
        const status = await removeOneDocumentFolder(docId, companyId);
        return status;
      });

      const all = await Promise.all(documentsFolders);
      return all;
    };

    const docsToUpdate = req.body.documents;
    const companyId = user.companyId;
    if (
      docsToUpdate &&
      Array.isArray(docsToUpdate) &&
      docsToUpdate.length > 0
    ) {
      const documentsSuccesfullyRemoved = await docRefFolderRemover(
        docsToUpdate,
        companyId
      );

      const checkIfAllFoldersSetToNull = documentsSuccesfullyRemoved.every(
        (doc) => doc === null
      );

      if (checkIfAllFoldersSetToNull) {
        const folderDeleted = await DB.deleteFolder(
          req.body.folderId,
          companyId
        );
        if (folderDeleted) {
          res.status(200).json({ folderDeleted: true });
        }
      } else {
        res.status(400).json({ folderDeleted: false });
      }
    } else {
      const folderDeleted = await DB.deleteFolder(req.body.folderId, companyId);
      if (folderDeleted) {
        res.status(200).json({ folderDeleted: true });
      }
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

router.post("/update-folder-name", async (req, res) => {
  try {
    const user = await getFullUser(req.user.sub);

    if (!user || !user.companyId) {
      res.status(400).send(constants.noUserError);
      return;
    }

    const folderUpdated = await DB.updateFolderName(
      user.companyId,
      req.body.folderId,
      req.body.newFolderName
    );

    if (folderUpdated) {
      res.status(200).json({ folderUpdated: true });
    } else {
      res.status(400).json({ folderUpdated: false });
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

export default router;
