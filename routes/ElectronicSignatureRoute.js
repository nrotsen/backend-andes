import Router from "express-promise-router";

import * as DB from "../dynamoDB/ElectronicSignatureReference.js";

import * as constants from "../common/constants.js";

import { s3GetFile } from "../utils/S3Storage.js";

import { APIPost, APIGet, APIDelete } from "../utils/Services.js";
import { getCompanyId, getFullUser } from "../utils/getCompanyId.js";
import { getCompany } from "../dynamoDB/Company.js";

const router = Router();

const apiToken = process.env.ZAP_SIGN_TOKEN;

router.post("/request-new-signature", async (req, res) => {
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

    const documentToSign = await s3GetFile(
      "andesdocuments01",
      req.body.filePath
    );

    if (!documentToSign || !req.body.signers || req.body.signers.length < 1) {
      res.status(400).send(constants.systemError);
      return;
    }
    const base64Doc = Buffer.from(documentToSign.Body).toString("base64");

    const signersData = req.body.signers.map((signer, index) => {
      return {
        name: signer.name,
        email: signer.email,
        send_automatic_email: true,
        custom_message: `Hola ${signer.name},  \n ¡Te han enviado un documento para firmar!`,
        lock_email: true,
        lock_phone: true,
        auth_mode: signer.emailValidation
          ? "assinaturaTela-tokenEmail"
          : "assinaturaTela",
        redirect_link: "https://andesdocs.com/",
        order_group: index,
        require_selfie_photo: signer.photo,
        require_document_photo: signer.idCard,
      };
    });

    let fileFormat = {};

    if (req.body.format.toLowerCase() === "pdf") {
      fileFormat = {
        base64_pdf: base64Doc,
      };
    }
    if (req.body.format.toLowerCase() === "word") {
      fileFormat = {
        base64_docx: base64Doc,
      };
    }

    const data = await APIPost(
      "https://api.zapsign.com.br/api/v1/docs/?api_token=bd157c2d-ca42-45cc-9d11-67e8fd5545eebd0ce244-63a7-48b8-946a-5e1696d60422",
      {
        ...fileFormat,
        name: req.body.fileName,
        brand_primary_color: "#a8bbfd",
        brand_name: "Andes Docs",
        observers: ["nicogaggini@hotmail.com"],
        lang: "es",
        brand_logo: "https://andesdocs.com/images/andesdocs.png",
        created_by: user.name || "Usario Sin Nombre",
        signature_order_active: req.body.isSequential,
        signers: signersData,
      }
    );

    if (!data || !data.token) {
      res.status(400).send(constants.systemError);
      return;
    }

    const paramsForDb = {
      companyId: user.companyId,
      companyName: company,
      signedFilePath: null,
      fileName: req.body.fileName,
      userId: req.user.sub,
      createdBy: user.name,
      creatorPhotoUrl: user.photoUrl,
      documentToken: data.token,
      documentId: req.body.documentId,
    };

    await DB.upsertElectronicSignatureReference(paramsForDb);

    res.status(200).send({ status: "ok" });
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

router.post("/get-signature-details", async (req, res) => {
  try {
    const token = req.body.token;
    const details = await APIGet(
      `https://api.zapsign.com.br/api/v1/docs/${token}/?api_token=${apiToken}`
    );
    if (details) res.status(200).send({ details: details });
    else res.status(400).send(constants.systemError);
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

router.post("/get-all-signatures", async (req, res) => {
  try {
    const companyId = await getCompanyId(req.user.sub);
    if (!companyId) res.status(400).send(constants.noUserError);
    const user = await getFullUser(req.user.sub);
    if (!user) res.status(400).send(constants.noUserError);

    const page = req.body.page;

    let finalList = [];

    const data1 = await DB.getAllCompanySignatures(companyId);
    const signatures1 = data1.Items;

    finalList = signatures1;

    // if (data1.LastEvaluatedKey) {
    //   let data2 = await DB.getAllCompanySignaturesWithStartKey(
    //     companyId,
    //     data1.LastEvaluatedKey.signatureId
    //   );
    //   const signatures2 = data2.Items;

    //   finalList = [...signatures1, ...signatures2];
    // }

    let length = 0;
    let returnSignatures = [];
    if (finalList) {
      length = finalList.length;
      let sortedArray = finalList.sort((a, b) => {
        return b.documentId - a.documentId;
      });

      if (user.documentShare === false) {
        const filteredList = sortedArray.filter(
          (sig) => sig.userId === req.user.sub
        );
        sortedArray = filteredList;
      }

      const slicedArray = sortedArray.slice(page * 5, page * 5 + 5);
      const allPromises = [];

      slicedArray.forEach(async (doc) => {
        const docToken = doc.documentToken;
        const promise = APIGet(
          `https://api.zapsign.com.br/api/v1/docs/${docToken}/?api_token=${apiToken}`
        );
        allPromises.push(promise);
      });

      const zapSignatures = await Promise.all(allPromises);

      zapSignatures.forEach((sig) => {
        if (!sig.token) {
          res.status(400).send(constants.systemError);
        }
        const newElement = sig;
        const sigDBData = slicedArray.find(
          (data) => data.documentToken === sig.token
        );
        if (sigDBData) {
          newElement.createdBy = sigDBData.createdBy;
          newElement.creatorPhotoUrl = sigDBData.creatorPhotoUrl;
          newElement.dateCreated = sigDBData.dateCreated;
        }
        returnSignatures.push(newElement);
      });
    }
    res
      .status(200)
      .send({ status: "ok", length: length, signatures: returnSignatures });
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

router.get("/get-all-signatures-view-only", async (req, res) => {
  try {
    const companyId = await getCompanyId(req.user.sub);
    if (!companyId) res.status(400).send(constants.noUserError);
    const user = await getFullUser(req.user.sub);
    if (!user) res.status(400).send(constants.noUserError);

    let finalList = [];

    const data1 = await DB.getAllCompanySignatures(companyId);
    const signatures1 = data1.Items;

    finalList = signatures1;

    if (data1.LastEvaluatedKey) {
      let data2 = await DB.getAllCompanySignaturesWithStartKey(
        companyId,
        data1.LastEvaluatedKey.signatureId
      );
      const signatures2 = data2.Items;

      finalList = [...signatures1, ...signatures2];
    }

    let length = 0;
    let returnSignatures = [];
    if (finalList) {
      length = finalList.length;
      let sortedArray = finalList.sort((a, b) => {
        return b.documentId - a.documentId;
      });

      if (user.documentShare === false) {
        const filteredList = sortedArray.filter(
          (sig) => sig.userId === req.user.sub
        );
        sortedArray = filteredList;
      }

      // const data = await DB.getAllCompanySignatures(companyId);
      // let length = 0;
      // let returnSignatures = [];
      // if (data && data.Items) {
      //   length = data.Items.length;
      //   let sortedArray = data.Items.sort((a, b) => {
      //     return b.documentId - a.documentId;
      //   });

      //   if (user.documentShare === false) {
      //     const filteredList = sortedArray.filter(
      //       (sig) => sig.userId === req.user.sub
      //     );
      //     sortedArray = filteredList;
      //   }

      const allPending = [];

      sortedArray.forEach(async (sig) => {
        if (sig.status === "pending") {
          const docToken = sig.documentToken;
          const promise = APIGet(
            `https://api.zapsign.com.br/api/v1/docs/${docToken}/?api_token=${apiToken}`
          );
          allPending.push(promise);
        } else {
          allPending.push(null);
        }
      });

      const allResolvedPending = await Promise.all(allPending);

      const allDbUpdates = [];

      allResolvedPending.forEach((zapSigData, index) => {
        if (zapSigData) {
          const matchingDBSignature = sortedArray.find(
            (dbSig) => zapSigData.token === dbSig.documentToken
          );

          if (matchingDBSignature) {
            if (
              (matchingDBSignature.signedFile === null &&
                zapSigData.signed_file !== null) ||
              zapSigData.status !== "pending"
            ) {
              const newSignatureToSave = {
                ...matchingDBSignature,
                status: zapSigData.status,
                signedFile: zapSigData.signed_file,
              };
              sortedArray[index] = newSignatureToSave;

              const save = DB.editSignatureRef(newSignatureToSave);
              allDbUpdates.push(save);
            }
          }
        }
      });

      await Promise.all(allDbUpdates);

      res
        .status(200)
        .send({ status: "ok", length: length, signatures: sortedArray });
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

router.post("/delete-signature", async (req, res) => {
  const body = req.body;
  try {
    const companyId = await getCompanyId(req.user.sub);
    if (!companyId) res.status(400).send(constants.noUserError);

    const data = await DB.getAllCompanySignatures(companyId);

    let finalList = data.Items;

    if (data.LastEvaluatedKey) {
      let data2 = await DB.getAllCompanySignaturesWithStartKey(
        companyId,
        data.LastEvaluatedKey.signatureId
      );
      const signatures2 = data2.Items;

      finalList = [...data.Items, ...signatures2];
    }

    const docToDelete = finalList.find(
      (doc) => doc.documentToken === body.token
    );
    if (docToDelete) {
      await DB.deleteSignature(docToDelete.signatureId, docToDelete.companyId);
      res.status(200).json({ signatureDeleted: true });
      return;
    }
    res.status(400).send(constants.systemError);
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

router.post("/update-signature", async (req, res) => {
  const body = req.body;
  try {
    const data = await APIPost(
      `https://api.zapsign.com.br/api/v1/signers/${body.signerToken}/?api_token=${apiToken}`,
      {
        email: body.email,
        send_automatic_email: true,
      }
    );

    if (data.email) {
      res.status(200).json({ signatureUpdated: true });
    } else res.status(400).send(constants.systemError);
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

router.post("/delete-signer", async (req, res) => {
  const body = req.body;
  try {
    const requestResult = await APIDelete(
      `https://api.zapsign.com.br/api/v1/signer/${body.signerToken}/remove/?api_token=${apiToken}`
    );

    if (requestResult === 200) {
      res.status(200).send({ signerDeleted: true });
    } else res.status(400).send(constants.systemError);
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

export default router;
