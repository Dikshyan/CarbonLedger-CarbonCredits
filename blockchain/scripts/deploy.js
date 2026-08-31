import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const [deployer] = await ethers.getSigners();

    console.log("Deploying with:", deployer.address);

    // Using deployer as verifier for testing
    const verifier = deployer.address;

    const CarbonLedger = await ethers.getContractFactory("CarbonLedger");

    const carbonLedger = await CarbonLedger.deploy(verifier);

    await carbonLedger.waitForDeployment();

    console.log("======================================");
    console.log("CarbonLedger deployed successfully!");
    console.log("Contract Address:", await carbonLedger.getAddress());
    console.log("Admin:", deployer.address);
    console.log("Verifier:", verifier);
    console.log("======================================");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});