import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const contractAddress =
        "0xeCeAD32dA3F76369B78D71EaaEcB4dd73322B6Ee";

    const contract = await ethers.getContractAt(
        "CarbonLedger",
        contractAddress
    );

    const amount = 500;

    console.log("Retiring carbon credits...");
    console.log("Project ID:", 2);
    console.log("Amount:", amount);

    const tx = await contract.retireCredits(2, amount);

    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();

    console.log("Transaction confirmed!");
    console.log("Block:", receipt.blockNumber);

    const project = await contract.getProject(2);

    console.log("\nProject 2:");
    console.log("Minted:", project.mintedCredits.toString());
    console.log("Available:", project.availableCredits.toString());
    console.log("Retired:", project.retiredCredits.toString());
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});