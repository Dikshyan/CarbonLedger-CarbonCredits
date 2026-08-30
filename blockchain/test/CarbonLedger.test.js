// CarbonLedger Smart Contract — Hardhat Tests
// Covers: deployment, project lifecycle, credit minting, transfer, and retirement

import { expect } from "chai";
import hre from "hardhat";

describe("CarbonLedger", function () {
  let carbonLedger;
  let admin, verifier, projectOwner1, projectOwner2, stranger;

  beforeEach(async function () {
    const { ethers } = await hre.network.connect();
    [admin, verifier, projectOwner1, projectOwner2, stranger] =
      await ethers.getSigners();

    const CarbonLedger = await ethers.getContractFactory("CarbonLedger");
    carbonLedger = await CarbonLedger.deploy(verifier.address);
    await carbonLedger.waitForDeployment();
  });

  // ---------------------------------------------------------------------------
  // Deployment
  // ---------------------------------------------------------------------------
  describe("Deployment", function () {
    it("should set the deployer as admin", async function () {
      const { ethers } = await hre.network.connect();
      [admin] = await ethers.getSigners();
      expect(await carbonLedger.admin()).to.equal(admin.address);
    });

    it("should set the verifier correctly", async function () {
      expect(await carbonLedger.verifier()).to.equal(verifier.address);
    });

    it("should initialize nextProjectId to 1", async function () {
      expect(await carbonLedger.nextProjectId()).to.equal(1n);
    });

    it("should revert if verifier is zero address", async function () {
      const { ethers } = await hre.network.connect();
      const CarbonLedger = await ethers.getContractFactory("CarbonLedger");
      await expect(
        CarbonLedger.deploy("0x0000000000000000000000000000000000000000")
      ).to.be.revertedWith("Invalid verifier");
    });
  });

  // ---------------------------------------------------------------------------
  // Project Registration
  // ---------------------------------------------------------------------------
  describe("registerProject", function () {
    it("should register a new project and emit ProjectRegistered", async function () {
      const tx = await carbonLedger
        .connect(projectOwner1)
        .registerProject("Sundarbans NGO", "QmTestCID1");

      await expect(tx)
        .to.emit(carbonLedger, "ProjectRegistered")
        .withArgs(1n, projectOwner1.address, "Sundarbans NGO");
    });

    it("should increment projectId for each registration", async function () {
      await carbonLedger
        .connect(projectOwner1)
        .registerProject("NGO A", "QmCID_A");
      await carbonLedger
        .connect(projectOwner2)
        .registerProject("NGO B", "QmCID_B");

      expect(await carbonLedger.nextProjectId()).to.equal(3n);
    });

    it("should store correct project data", async function () {
      await carbonLedger
        .connect(projectOwner1)
        .registerProject("Sundarbans NGO", "QmTestCID1");

      const project = await carbonLedger.getProject(1n);
      expect(project.NGOName).to.equal("Sundarbans NGO");
      expect(project.owner).to.equal(projectOwner1.address);
      expect(project.approved).to.equal(false);
      expect(project.mrvApproved).to.equal(false);
      expect(project.mintedCredits).to.equal(0n);
      expect(project.availableCredits).to.equal(0n);
      expect(project.retiredCredits).to.equal(0n);
    });

    it("should revert if NGO name is empty", async function () {
      await expect(
        carbonLedger.connect(projectOwner1).registerProject("", "QmCID")
      ).to.be.revertedWith("NGO name required");
    });

    it("should revert if project CID is empty", async function () {
      await expect(
        carbonLedger.connect(projectOwner1).registerProject("NGO", "")
      ).to.be.revertedWith("Project CID required");
    });
  });

  // ---------------------------------------------------------------------------
  // Project Approval
  // ---------------------------------------------------------------------------
  describe("approveProject", function () {
    beforeEach(async function () {
      await carbonLedger
        .connect(projectOwner1)
        .registerProject("Sundarbans NGO", "QmCID1");
    });

    it("verifier can approve a project", async function () {
      const tx = await carbonLedger.connect(verifier).approveProject(1n);
      await expect(tx).to.emit(carbonLedger, "ProjectApproved").withArgs(1n);
      expect(await carbonLedger.isProjectApproved(1n)).to.equal(true);
    });

    it("non-verifier cannot approve", async function () {
      await expect(
        carbonLedger.connect(stranger).approveProject(1n)
      ).to.be.revertedWith("Only verifier can call this function");
    });

    it("cannot approve already-approved project", async function () {
      await carbonLedger.connect(verifier).approveProject(1n);
      await expect(
        carbonLedger.connect(verifier).approveProject(1n)
      ).to.be.revertedWith("Project already approved");
    });

    it("reverts for non-existent project", async function () {
      await expect(
        carbonLedger.connect(verifier).approveProject(999n)
      ).to.be.revertedWith("Project does not exist");
    });
  });

  // ---------------------------------------------------------------------------
  // MRV Upload
  // ---------------------------------------------------------------------------
  describe("uploadMRV", function () {
    beforeEach(async function () {
      await carbonLedger
        .connect(projectOwner1)
        .registerProject("Sundarbans NGO", "QmCID1");
      await carbonLedger.connect(verifier).approveProject(1n);
    });

    it("owner can upload MRV CID after approval", async function () {
      const tx = await carbonLedger
        .connect(projectOwner1)
        .uploadMRV(1n, "QmMRV_CID");

      await expect(tx)
        .to.emit(carbonLedger, "MRVUploaded")
        .withArgs(1n, "QmMRV_CID");

      expect(await carbonLedger.getMRVCID(1n)).to.equal("QmMRV_CID");
    });

    it("non-owner cannot upload MRV", async function () {
      await expect(
        carbonLedger.connect(stranger).uploadMRV(1n, "QmMRV_CID")
      ).to.be.revertedWith("Only project owner can upload MRV");
    });

    it("cannot upload MRV before project approval", async function () {
      await carbonLedger
        .connect(projectOwner2)
        .registerProject("New NGO", "QmCID2");
      // project 2 is NOT approved
      await expect(
        carbonLedger.connect(projectOwner2).uploadMRV(2n, "QmMRV")
      ).to.be.revertedWith("Project is not approved yet");
    });

    it("reverts if MRV CID is empty", async function () {
      await expect(
        carbonLedger.connect(projectOwner1).uploadMRV(1n, "")
      ).to.be.revertedWith("Invalid MRV CID");
    });
  });

  // ---------------------------------------------------------------------------
  // MRV Approval
  // ---------------------------------------------------------------------------
  describe("approveMRV", function () {
    beforeEach(async function () {
      await carbonLedger
        .connect(projectOwner1)
        .registerProject("Sundarbans NGO", "QmCID1");
      await carbonLedger.connect(verifier).approveProject(1n);
      await carbonLedger.connect(projectOwner1).uploadMRV(1n, "QmMRV_CID");
    });

    it("verifier can approve MRV", async function () {
      const tx = await carbonLedger.connect(verifier).approveMRV(1n);
      await expect(tx).to.emit(carbonLedger, "MRVApproved").withArgs(1n);
      expect(await carbonLedger.isMRVApproved(1n)).to.equal(true);
    });

    it("non-verifier cannot approve MRV", async function () {
      await expect(
        carbonLedger.connect(stranger).approveMRV(1n)
      ).to.be.revertedWith("Only verifier can call this function");
    });

    it("cannot approve MRV twice", async function () {
      await carbonLedger.connect(verifier).approveMRV(1n);
      await expect(
        carbonLedger.connect(verifier).approveMRV(1n)
      ).to.be.revertedWith("MRV already approved");
    });
  });

  // ---------------------------------------------------------------------------
  // Credit Minting
  // ---------------------------------------------------------------------------
  describe("mintCarbonCredits", function () {
    beforeEach(async function () {
      await carbonLedger
        .connect(projectOwner1)
        .registerProject("Sundarbans NGO", "QmCID1");
      await carbonLedger.connect(verifier).approveProject(1n);
      await carbonLedger.connect(projectOwner1).uploadMRV(1n, "QmMRV_CID");
      await carbonLedger.connect(verifier).approveMRV(1n);
    });

    it("verifier can mint carbon credits", async function () {
      const tx = await carbonLedger
        .connect(verifier)
        .mintCarbonCredits(1n, 500n);

      await expect(tx)
        .to.emit(carbonLedger, "CreditsMinted")
        .withArgs(1n, 500n);

      expect(await carbonLedger.getMintedCredits(1n)).to.equal(500n);
      expect(await carbonLedger.getAvailableCredits(1n)).to.equal(500n);
    });

    it("non-verifier cannot mint", async function () {
      await expect(
        carbonLedger.connect(stranger).mintCarbonCredits(1n, 100n)
      ).to.be.revertedWith("Only verifier can call this function");
    });

    it("cannot mint zero credits", async function () {
      await expect(
        carbonLedger.connect(verifier).mintCarbonCredits(1n, 0n)
      ).to.be.revertedWith("Amount must be greater than zero");
    });

    it("cannot mint without MRV approval", async function () {
      await carbonLedger
        .connect(projectOwner2)
        .registerProject("NGO B", "QmCID2");
      await carbonLedger.connect(verifier).approveProject(2n);
      // No MRV upload/approval for project 2
      await expect(
        carbonLedger.connect(verifier).mintCarbonCredits(2n, 100n)
      ).to.be.revertedWith("MRV is not approved");
    });

    it("accumulates minted credits across multiple mints", async function () {
      await carbonLedger.connect(verifier).mintCarbonCredits(1n, 300n);
      await carbonLedger.connect(verifier).mintCarbonCredits(1n, 200n);
      expect(await carbonLedger.getMintedCredits(1n)).to.equal(500n);
      expect(await carbonLedger.getAvailableCredits(1n)).to.equal(500n);
    });
  });

  // ---------------------------------------------------------------------------
  // Credit Transfer
  // ---------------------------------------------------------------------------
  describe("transferCredits", function () {
    beforeEach(async function () {
      // Set up project 1 with 500 credits
      await carbonLedger
        .connect(projectOwner1)
        .registerProject("Sundarbans NGO", "QmCID1");
      await carbonLedger.connect(verifier).approveProject(1n);
      await carbonLedger.connect(projectOwner1).uploadMRV(1n, "QmMRV1");
      await carbonLedger.connect(verifier).approveMRV(1n);
      await carbonLedger.connect(verifier).mintCarbonCredits(1n, 500n);

      // Set up project 2 (approved but no credits)
      await carbonLedger
        .connect(projectOwner2)
        .registerProject("Buyer Corp", "QmCID2");
      await carbonLedger.connect(verifier).approveProject(2n);
    });

    it("owner can transfer credits to another approved project", async function () {
      const tx = await carbonLedger
        .connect(projectOwner1)
        .transferCredits(1n, 2n, 200n);

      await expect(tx)
        .to.emit(carbonLedger, "CreditsTransferred")
        .withArgs(1n, 2n, 200n);

      expect(await carbonLedger.getAvailableCredits(1n)).to.equal(300n);
      expect(await carbonLedger.getAvailableCredits(2n)).to.equal(200n);
    });

    it("non-owner cannot transfer", async function () {
      await expect(
        carbonLedger.connect(stranger).transferCredits(1n, 2n, 100n)
      ).to.be.revertedWith("Only source project owner can transfer");
    });

    it("cannot transfer more than available", async function () {
      await expect(
        carbonLedger.connect(projectOwner1).transferCredits(1n, 2n, 600n)
      ).to.be.revertedWith("Insufficient carbon credits");
    });

    it("cannot transfer to same project", async function () {
      await expect(
        carbonLedger.connect(projectOwner1).transferCredits(1n, 1n, 100n)
      ).to.be.revertedWith("Cannot transfer to same project");
    });

    it("cannot transfer to unapproved project", async function () {
      await carbonLedger
        .connect(stranger)
        .registerProject("Unapproved NGO", "QmCID3");
      // project 3 not approved
      await expect(
        carbonLedger.connect(projectOwner1).transferCredits(1n, 3n, 100n)
      ).to.be.revertedWith("Destination project not approved");
    });
  });

  // ---------------------------------------------------------------------------
  // Credit Retirement
  // ---------------------------------------------------------------------------
  describe("retireCredits", function () {
    beforeEach(async function () {
      await carbonLedger
        .connect(projectOwner1)
        .registerProject("Sundarbans NGO", "QmCID1");
      await carbonLedger.connect(verifier).approveProject(1n);
      await carbonLedger.connect(projectOwner1).uploadMRV(1n, "QmMRV1");
      await carbonLedger.connect(verifier).approveMRV(1n);
      await carbonLedger.connect(verifier).mintCarbonCredits(1n, 500n);
    });

    it("owner can retire credits", async function () {
      const tx = await carbonLedger
        .connect(projectOwner1)
        .retireCredits(1n, 100n);

      await expect(tx)
        .to.emit(carbonLedger, "CreditsRetired")
        .withArgs(1n, 100n);

      expect(await carbonLedger.getAvailableCredits(1n)).to.equal(400n);
      expect(await carbonLedger.getRetiredCredits(1n)).to.equal(100n);
    });

    it("non-owner cannot retire", async function () {
      await expect(
        carbonLedger.connect(stranger).retireCredits(1n, 100n)
      ).to.be.revertedWith("Only project owner can retire credits");
    });

    it("cannot retire more than available", async function () {
      await expect(
        carbonLedger.connect(projectOwner1).retireCredits(1n, 600n)
      ).to.be.revertedWith("Insufficient carbon credits");
    });

    it("cannot retire zero credits", async function () {
      await expect(
        carbonLedger.connect(projectOwner1).retireCredits(1n, 0n)
      ).to.be.revertedWith("Amount must be greater than zero");
    });
  });

  // ---------------------------------------------------------------------------
  // Change Verifier
  // ---------------------------------------------------------------------------
  describe("changeVerifier", function () {
    it("admin can change verifier", async function () {
      const tx = await carbonLedger
        .connect(admin)
        .changeVerifier(stranger.address);

      await expect(tx)
        .to.emit(carbonLedger, "VerifierChanged")
        .withArgs(verifier.address, stranger.address);

      expect(await carbonLedger.verifier()).to.equal(stranger.address);
    });

    it("non-admin cannot change verifier", async function () {
      await expect(
        carbonLedger.connect(stranger).changeVerifier(projectOwner1.address)
      ).to.be.revertedWith("Only admin can call this function");
    });

    it("cannot set verifier to zero address", async function () {
      await expect(
        carbonLedger
          .connect(admin)
          .changeVerifier("0x0000000000000000000000000000000000000000")
      ).to.be.revertedWith("Invalid verifier address");
    });

    it("cannot set same address as current verifier", async function () {
      await expect(
        carbonLedger.connect(admin).changeVerifier(verifier.address)
      ).to.be.revertedWith("Already current verifier");
    });
  });

  // ---------------------------------------------------------------------------
  // Full Lifecycle Integration
  // ---------------------------------------------------------------------------
  describe("Full lifecycle: Register → Approve → MRV → Mint → Transfer → Retire", function () {
    it("completes full carbon credit lifecycle", async function () {
      const { ethers } = await hre.network.connect();
      [admin, verifier, projectOwner1, projectOwner2] =
        await ethers.getSigners();

      // 1. Register two projects
      await carbonLedger
        .connect(projectOwner1)
        .registerProject("Pichavaram Mangroves", "QmProjectCID_Pichavaram");
      await carbonLedger
        .connect(projectOwner2)
        .registerProject("Godavari Buyer Corp", "QmProjectCID_Godavari");

      // 2. Approve both projects
      await carbonLedger.connect(verifier).approveProject(1n);
      await carbonLedger.connect(verifier).approveProject(2n);

      // 3. Upload and approve MRV for project 1
      await carbonLedger
        .connect(projectOwner1)
        .uploadMRV(1n, "QmMRV_Pichavaram_2024");
      await carbonLedger.connect(verifier).approveMRV(1n);

      // 4. Mint 1000 credits to project 1
      await carbonLedger.connect(verifier).mintCarbonCredits(1n, 1000n);

      // 5. Transfer 400 credits from project 1 to project 2
      await carbonLedger
        .connect(projectOwner1)
        .transferCredits(1n, 2n, 400n);

      // 6. Retire 200 credits from project 2
      await carbonLedger.connect(projectOwner2).retireCredits(2n, 200n);

      // Final assertions
      const proj1 = await carbonLedger.getProject(1n);
      const proj2 = await carbonLedger.getProject(2n);

      expect(proj1.mintedCredits).to.equal(1000n);
      expect(proj1.availableCredits).to.equal(600n); // 1000 - 400 transferred
      expect(proj1.retiredCredits).to.equal(0n);

      expect(proj2.availableCredits).to.equal(200n); // 400 - 200 retired
      expect(proj2.retiredCredits).to.equal(200n);
    });
  });
});
