import Router from "express-promise-router";

import * as DB from "../dynamoDB/Company.js";

import * as constants from "../common/constants.js";
import { getCompanyId } from "../utils/getCompanyId.js";

const router = Router();

router.get("/get-company", async (req, res) => {
  try {
    const companyId = await getCompanyId(req.user.sub);
    const company = await DB.getCompany(companyId);
    if (company.Item) {
      res.status(200).json(company.Item);
    } else {
      res.status(404).json(constants.companyNotFound);
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

router.get("/get-all-companies", async (req, res) => {
  try {
    const companies = await DB.getAllCompanies();
    if (companies.Items) {
      res.status(200).json(companies.Items);
    } else {
      res.status(404).json(constants.companyNotFound);
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

router.get("/use-document", async (req, res) => {
  try {
    const companyId = await getCompanyId(req.user.sub);
    const company = await DB.useOneDocument(companyId);
    if (company.Attributes.availableContracts < 1) {
      res.status(200).json({ dowload: false, availableContracts: 0 });
    } else {
      res.status(200).json({
        dowload: true,
        availableContracts: company.Attributes.availableContracts,
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).send(constants.systemError);
  }
});

export default router;
