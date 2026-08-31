import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const abi = JSON.parse(fs.readFileSync("./CarbonLedgerABI.json", "utf-8"));

const provider = new ethers.JsonRpcProvider(process.env.AMOY_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);

app.get("/health", (req, res) => {
  res.json({ status: "ok", wallet: wallet.address });
});

app.post("/project/register", async (req, res) => {
  try {
    const { ngoName, projectCID } = req.body;
    const tx = await contract.registerProject(ngoName, projectCID);
    const receipt = await tx.wait();
    res.json({ txHash: tx.hash, block: receipt.blockNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/project/:id/mrv", async (req, res) => {
  try {
    const { cid } = req.body;
    const tx = await contract.uploadMRV(req.params.id, cid);
    const receipt = await tx.wait();
    res.json({ txHash: tx.hash, block: receipt.blockNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/credits/transfer", async (req, res) => {
  try {
    const { fromProjectId, toProjectId, amount } = req.body;
    const tx = await contract.transferCredits(fromProjectId, toProjectId, amount);
    const receipt = await tx.wait();
    res.json({ txHash: tx.hash, block: receipt.blockNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/credits/retire", async (req, res) => {
  try {
    const { projectId, amount } = req.body;
    const tx = await contract.retireCredits(projectId, amount);
    const receipt = await tx.wait();
    res.json({ txHash: tx.hash, block: receipt.blockNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/project/:id", async (req, res) => {
  try {
    const project = await contract.getProject(req.params.id);
    res.json({
      projectId: project.projectId.toString(),
      ngoName: project.NGOName,
      approved: project.approved,
      owner: project.owner,
      mintedCredits: project.mintedCredits.toString(),
      availableCredits: project.availableCredits.toString(),
      retiredCredits: project.retiredCredits.toString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Blockchain bridge running on port ${process.env.PORT}`);
  console.log(`Signing wallet: ${wallet.address}`);
});

