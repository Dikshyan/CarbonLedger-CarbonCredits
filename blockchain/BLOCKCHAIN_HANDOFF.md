# CarbonLedger Blockchain Handoff

## 1. Network

- Network: Polygon Amoy Testnet
- Chain ID: 80002
- RPC provider: Alchemy
- Wallet: MetaMask
- Contract type: Solidity smart contract
- Solidity version: 0.8.28

---

## 2. Deployed Contract

**Contract Address**

`0xeCeAD32dA3F76369B78D71EaaEcB4dd73322B6Ee`

**Admin**

`0x5BDEd48dDac0d20dEfEed192092385aB9D653cc4`

**Verifier**

`0x5BDEd48dDac0d20dEfEed192092385aB9D653cc4`

The admin and verifier are currently the same wallet for the SIH testnet deployment.

---

## 3. ABI

The contract ABI is available at:

`CarbonLedgerABI.json`

Frontend and backend developers should use this ABI together with the contract address above.

---

## 4. Project 1

**Project ID**

`1`

**NGO**

`Green Earth NGO`

**Project Report CID**

`bafkreid43ylrdbixgfja2xwusbw44vi6itk6pe4tl3snznjubemweyb7ne`

**MRV Report CID**

`bafkreig5mhmjg7cntgtx6haqefngcwqwfc7hmwoisg76vmceu46nf3jmaa`

**Estimated Carbon**

`338,256.86 tonnes`

**Credits Minted**

`338,256`

---

## 5. Tested Carbon Credit Lifecycle

The following workflow has been successfully tested locally and on Polygon Amoy:

1. Project Registration
2. Project Approval
3. Project Report CID Storage
4. MRV CID Upload
5. MRV Approval
6. Carbon Credit Minting
7. Credit Transfer
8. Credit Retirement

---

## 6. Polygon Amoy Test Results

### Project 1

Initial:

- Minted: 338,256
- Available: 338,256
- Retired: 0

After transferring 1,000 credits:

- Minted: 338,256
- Available: 337,256
- Retired: 0

### Project 2

After receiving 1,000 credits:

- Minted: 0
- Available: 1,000
- Retired: 0

After retiring 500 credits:

- Minted: 0
- Available: 500
- Retired: 500

---

## 7. Important Live Transactions

### Project Registration

`0xad94a0d6d07697c1abc238fbc0ab88b68a76de4b35e5a4eff6bc8679dbcfb62d`

Block:

`45679857`

### MRV Upload

`0x330ff3a20bb6f348bd1863e6908ebe6362530dc8d32cd2d6767900436f7f5ac3`

Block:

`45680810`

### Final Credit Retirement

`0x8f61751b7dca77de227a783f1ddfc8c6a202721da2cc502a6a38f63970922576`

Block:

`45681335`

---

## 8. Contract Function Map

### Project Management

#### `registerProject(string ngoName, string projectCID)`

Registers a new carbon project.

**Access:** Public

**Inputs:**
- `ngoName`
- `projectCID`

Creates a new project and emits:

`ProjectRegistered`

---

#### `approveProject(uint256 projectId)`

Approves a registered project.

**Access:** Verifier only

**Input:**
- `projectId`

Emits:

`ProjectApproved`

---

### MRV Management

#### `uploadMRV(uint256 projectId, string cid)`

Stores the IPFS CID of the project's MRV report.

**Access:** Public

**Inputs:**
- `projectId`
- `cid`

Emits:

`MRVUploaded`

---

#### `approveMRV(uint256 projectId)`

Approves the uploaded MRV report.

**Access:** Verifier only

**Input:**
- `projectId`

Emits:

`MRVApproved`

---

### Carbon Credit Management

#### `mintCarbonCredits(uint256 projectId, uint256 amount)`

Mints carbon credits for an approved project.

**Access:** Verifier only

**Inputs:**
- `projectId`
- `amount`

Emits:

`CreditsMinted`

---

#### `transferCredits(uint256 fromProjectId, uint256 toProjectId, uint256 amount)`

Transfers available credits from one project to another.

**Access:** Public

**Inputs:**
- `fromProjectId`
- `toProjectId`
- `amount`

Emits:

`CreditsTransferred`

---

#### `retireCredits(uint256 projectId, uint256 amount)`

Retires carbon credits so they can no longer be used as available credits.

**Access:** Public

**Inputs:**
- `projectId`
- `amount`

Emits:

`CreditsRetired`

---

### Read Functions

#### `getProject(uint256 projectId)`

Returns the complete project information.

---

#### `isProjectApproved(uint256 projectId)`

Returns whether the project has been approved.

---

#### `isMRVApproved(uint256 projectId)`

Returns whether the MRV report has been approved.

---

#### `getProjectCID(uint256 projectId)`

Returns the Project Report IPFS CID.

---

#### `getMRVCID(uint256 projectId)`

Returns the MRV Report IPFS CID.

---

#### `getProjectOwner(uint256 projectId)`

Returns the project owner's wallet address.

---

#### `getMintedCredits(uint256 projectId)`

Returns the total credits minted for the project.

---

#### `getAvailableCredits(uint256 projectId)`

Returns the currently available credits.

---

#### `getRetiredCredits(uint256 projectId)`

Returns the total retired credits.

---

### Administrative Function

#### `changeVerifier(address newVerifier)`

Changes the verifier address.

**Access:** Contract owner only

**Input:**
- `newVerifier`

Emits:

`VerifierChanged`
## 9. Contract Events

The contract emits the following events:

- `ProjectRegistered`
- `ProjectApproved`
- `MRVUploaded`
- `MRVApproved`
- `CreditsMinted`
- `CreditsTransferred`
- `CreditsRetired`
- `VerifierChanged`

These events can be used by the backend to build transaction history and by the frontend to display project/credit activity.

## 10. Frontend Integration

Frontend needs:

- Contract address
- `CarbonLedgerABI.json`
- Polygon Amoy network
- Chain ID: `80002`

The frontend can use the contract to display:

- Project information
- Approval status
- MRV status
- Project Report CID
- MRV CID
- Minted credits
- Available credits
- Retired credits

Wallet interactions should be signed through MetaMask or another supported wallet.

---

## 11. Backend Integration

Backend needs:

- Contract address
- `CarbonLedgerABI.json`
- Polygon Amoy RPC endpoint
- Appropriate wallet/signer configuration

The backend must obtain its RPC/API credentials and private signing key through environment variables.

**Never commit private keys or API keys to GitHub.**

---

## 12. IPFS Documents

### Project Report

CID:

`bafkreid43ylrdbixgfja2xwusbw44vi6itk6pe4tl3snznjubemweyb7ne`

### MRV Report

CID:

`bafkreig5mhmjg7cntgtx6haqefngcwqwfc7hmwoisg76vmceu46nf3jmaa`

These CIDs are stored on-chain as references to the corresponding documents.

---

## 13. Security

The following must never be committed to Git:

- `.env`
- Private keys
- API keys
- RPC credentials containing secrets

The `.gitignore` already excludes `.env`, `node_modules`, `artifacts`, and `cache`.

---

## 14. Repository

Blockchain implementation branch:

`feature/blockchain-wallet`

Blockchain commit:

`4f84b56`

Repository:

`https://github.com/Hirak505/Bluechain`

---

## 15. Current Status

**Blockchain implementation:** Complete

**Local testing:** Complete

**Polygon Amoy testing:** Complete

**Frontend/backend integration:** Pending

**Production deployment:** Not applicable yet. Current deployment is on Polygon Amoy Testnet.