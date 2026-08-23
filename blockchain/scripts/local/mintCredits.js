import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const contractAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

    const contract = await ethers.getContractAt(
        "CarbonLedger",
        contractAddress
    );

    const amount = 338256;

    const tx = await contract.mintCarbonCredits(1, amount);

    console.log("Transaction sent:", tx.hash);

    await tx.wait();

    console.log("Carbon credits minted successfully!");

    const project = await contract.getProject(1);

    console.log("Project ID:", project.projectId.toString());
    console.log("Minted credits:", project.mintedCredits.toString());
    console.log("Available credits:", project.availableCredits.toString());
    console.log("Retired credits:", project.retiredCredits.toString());
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
