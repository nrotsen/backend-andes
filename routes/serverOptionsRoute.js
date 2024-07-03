import Router from "express-promise-router";

import * as constants from "../common/constants.js";

const router = Router();
import { google } from "googleapis";

const credentials = {
  type: "service_account",
  project_id: "andes-docs-cloud-data",
  private_key_id: process.env.PRIVATE_KEY_ID,
  private_key: process.env.PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: "andes-docs-test@andes-docs-cloud-data.iam.gserviceaccount.com",
  client_id: "114418696226550410265",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/andes-docs-test%40andes-docs-cloud-data.iam.gserviceaccount.com",
};

router.post("/get-sheet-data", async (req, res) => {
  console.log(process.env.PRIVATE_KEY);

  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      credentials: credentials,
    });

    const client = await auth.getClient();

    const sheets = google.sheets({ version: "v4", auth: client });

    const response = await sheets.spreadsheets.values.get({
      // spreadsheetId: "1vpSYZZemMoW_IqYibUAox12HHx3d0fMic_5xR4UnHZQ",
      spreadsheetId: req.body.sheetId,
      range: `Sheet1!A1:AC9000`,
    });

    const headers = response.data.values[0];
    const processedData = response.data.values.map((data) => {
      const newObject = {};
      headers.forEach((header, index) => {
        if (data[index]) {
          newObject[header] = data[index];
        } else {
          newObject[header] = "";
        }
      });
      return newObject;
    });

    processedData.splice(0, 1);

    if (processedData) {
      res.status(200).json({ options: processedData });
    } else {
      res.status(400).send(constants.systemError);
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

export default router;
