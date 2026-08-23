import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const contractAddress =
        "0xeCeAD32dA3F76369B78D71EaaEcB4dd73322B6Ee";

    const contract = await ethers.getContractAt(
        "CarbonLedger",
        contractAddress
    );

    const amount = 338256;

    console.log("Minting carbon credits...");
    console.log("Project ID:", 1);
    console.log("Amount:", amount);
    console.log("Estimated carbon:", "338256.86 tonnes");

    const tx = await contract.mintCarbonCredits(
        1,
        amount
    );

    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();

    console.log("Transaction confirmed!");
    console.log("Block:", receipt.blockNumber);

    const project = await contract.getProject(1);

    console.log("\nProject 1:");
    console.log("Minted:", project.mintedCredits.toString());
    console.log("Available:", project.availableCredits.toString());
    console.log("Retired:", project.retiredCredits.toString());
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
