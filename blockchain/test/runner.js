import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RPC_URL = "http://127.0.0.1:8545";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Standard Hardhat default private keys
const privateKeys = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Account #0 (Admin / Verifier)
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // Account #1 (Project Owner 1)
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // Account #2 (Project Owner 2 / Buyer)
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // Account #3 (Stranger)
];

const artifactPath = path.resolve(__dirname, "../artifacts/contracts/CarbonLedger.sol/CarbonLedger.json");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

let passCount = 0;
let failCount = 0;
const nonceMap = {};

function assert(condition, message) {
  if (!condition) {
    failCount++;
    console.error(`  [FAIL] ${message}`);
    throw new Error(message);
  } else {
    passCount++;
    console.log(`  [PASS] ${message}`);
  }
}

async function getNextNonce(address) {
  const onChainNonce = await provider.getTransactionCount(address, "latest");
  if (nonceMap[address] === undefined || nonceMap[address] < onChainNonce) {
    nonceMap[address] = onChainNonce;
  }
  const nonce = nonceMap[address];
  nonceMap[address] += 1;
  return nonce;
}

async function sendTx(wallet, contract, method, ...args) {
  const nonce = await getNextNonce(wallet.address);
  const tx = await contract.connect(wallet)[method](...args, { nonce });
  return await tx.wait();
}

async function run() {
  console.log("==================================================================");
  console.log("             CARBONLEDGER SMART CONTRACT TEST SUITE               ");
  console.log("==================================================================");

  const adminWallet = new ethers.Wallet(privateKeys[0], provider);
  const verifierWallet = new ethers.Wallet(privateKeys[0], provider);
  const owner1Wallet = new ethers.Wallet(privateKeys[1], provider);
  const owner2Wallet = new ethers.Wallet(privateKeys[2], provider);
  const strangerWallet = new ethers.Wallet(privateKeys[3], provider);

  console.log("\n1. CONTRACT DEPLOYMENT");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, adminWallet);
  const deployNonce = await getNextNonce(adminWallet.address);
  const contract = await factory.deploy(verifierWallet.address, { nonce: deployNonce });
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  assert(contractAddress.startsWith("0x"), `Contract deployed at: ${contractAddress}`);
  assert((await contract.admin()) === adminWallet.address, `Admin matches deployer: ${adminWallet.address}`);
  assert((await contract.verifier()) === verifierWallet.address, `Verifier matches: ${verifierWallet.address}`);
  assert((await contract.nextProjectId()) === 1n, `nextProjectId initialized to 1`);

  console.log("\n2. PROJECT REGISTRATION");
  await sendTx(owner1Wallet, contract, "registerProject", "Sundarbans Mangrove Project", "QmProjectCID_Sundarbans");
  assert((await contract.nextProjectId()) === 2n, "nextProjectId incremented to 2");

  const project1 = await contract.getProject(1n);
  assert(project1.NGOName === "Sundarbans Mangrove Project", "NGO name stored correctly");
  assert(project1.owner === owner1Wallet.address, "Project owner set correctly");
  assert(project1.approved === false, "Project initially unapproved");
  assert(project1.mrvApproved === false, "MRV initially unapproved");
  assert(project1.mintedCredits === 0n, "Minted credits initially 0");

  console.log("\n3. VERIFIER PROJECT APPROVAL FLOW");
  await sendTx(verifierWallet, contract, "approveProject", 1n);
  assert((await contract.isProjectApproved(1n)) === true, "Project 1 approved by Verifier");

  // Verify stranger cannot approve
  try {
    const unauthNonce = await getNextNonce(strangerWallet.address);
    const txBad = await contract.connect(strangerWallet).approveProject(1n, { nonce: unauthNonce });
    await txBad.wait();
    assert(false, "Stranger was able to approve project (Security violation)");
  } catch (err) {
    assert(true, "Unauthorized approval correctly rejected by modifier");
  }

  console.log("\n4. MRV UPLOAD & VERIFIER APPROVAL");
  await sendTx(owner1Wallet, contract, "uploadMRV", 1n, "QmMRV_Report_2026_CID");
  assert((await contract.getMRVCID(1n)) === "QmMRV_Report_2026_CID", "MRV CID saved");

  await sendTx(verifierWallet, contract, "approveMRV", 1n);
  assert((await contract.isMRVApproved(1n)) === true, "MRV approved by Verifier");

  console.log("\n5. MINTING CARBON CREDITS");
  const mintAmount = 1000n;
  await sendTx(verifierWallet, contract, "mintCarbonCredits", 1n, mintAmount);
  assert((await contract.getMintedCredits(1n)) === 1000n, "Minted credits equals 1000");
  assert((await contract.getAvailableCredits(1n)) === 1000n, "Available credits equals 1000");

  console.log("\n6. SECOND PROJECT SETUP FOR TRANSFER");
  await sendTx(owner2Wallet, contract, "registerProject", "Coastal Buyer Org", "QmProjectCID_Buyer");
  await sendTx(verifierWallet, contract, "approveProject", 2n);
  assert((await contract.isProjectApproved(2n)) === true, "Project 2 approved");

  console.log("\n7. TRANSFERRING CARBON CREDITS");
  const transferAmount = 350n;
  await sendTx(owner1Wallet, contract, "transferCredits", 1n, 2n, transferAmount);
  assert((await contract.getAvailableCredits(1n)) === 650n, "Project 1 balance decreased to 650");
  assert((await contract.getAvailableCredits(2n)) === 350n, "Project 2 balance increased to 350");

  console.log("\n8. RETIRING CARBON CREDITS");
  const retireAmount = 150n;
  await sendTx(owner2Wallet, contract, "retireCredits", 2n, retireAmount);
  assert((await contract.getAvailableCredits(2n)) === 200n, "Project 2 balance decreased to 200");
  assert((await contract.getRetiredCredits(2n)) === 150n, "Project 2 retired credits equals 150");

  console.log("\n9. VERIFIER MANAGEMENT");
  const newVerifierAddress = strangerWallet.address;
  await sendTx(adminWallet, contract, "changeVerifier", newVerifierAddress);
  assert((await contract.verifier()) === newVerifierAddress, "Verifier successfully updated by Admin");

  console.log("\n==================================================================");
  console.log(`BLOCKCHAIN RESULTS SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
